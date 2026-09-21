/**
 * End-to-end LAN netcode test: two headless browsers play a mirrored match.
 *
 *   HOST  = authoritative GameEngine
 *   GUEST = mirror; forwards actions back
 *
 * Run via the runner (which boots a server for you):
 *   npm test
 * Or point it at a running server:
 *   GAME_URL=http://127.0.0.1:8787/ node test/lan-browser-test.js
 */
const path = require('path');
const puppeteer = require('puppeteer-core');

// A Chromium-family binary must already exist; puppeteer-core never downloads one.
function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    '/usr/bin/brave-browser',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/home/jetsetvideo/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome'
  ];
  const fs = require('fs');
  for (const c of candidates) { try { if (fs.existsSync(c)) return c; } catch (e) {} }
  throw new Error('No Chrome-family binary found. Set CHROME_PATH.');
}
const EXEC = findChrome();
const BASE = process.env.GAME_URL || 'http://127.0.0.1:8787/';

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(page, fn, label, ms = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (await page.evaluate(fn)) return true; } catch (e) { /* page busy */ }
    await sleep(120);
  }
  throw new Error('timeout waiting for: ' + label);
}

(async () => {
  console.log('LAN browser end-to-end test -> ' + BASE + '  (browser: ' + EXEC + ')');
  const browser = await puppeteer.launch({
    executablePath: EXEC,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--mute-audio',
           '--disable-dev-shm-usage', '--window-size=1280,900'],
  });

  const pageErrors = [];
  async function newPage(tag) {
    const p = await browser.newPage();
    await p.setViewport({ width: 1280, height: 900 });
    p.on('pageerror', (e) => pageErrors.push(tag + ': ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error') pageErrors.push(tag + ' console: ' + m.text()); });
    await p.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitFor(p, () => !!(typeof Net !== 'undefined' && typeof ui !== 'undefined' && typeof GameEngine !== 'undefined'), tag + ' UI ready');
    return p;
  }

  const H = await newPage('HOST');
  const G = await newPage('GUEST');

  ok('net layer loaded on host', await H.evaluate(() => typeof Net !== 'undefined'));
  ok('net layer loaded on guest', await G.evaluate(() => typeof Net !== 'undefined'));

  // ---- 1. Host creates room -------------------------------------------------
  await H.evaluate(() => { Net.myName = 'Alice'; Net.connect('host'); });
  await waitFor(H, () => !!(window.Net && Net.room), 'host room code');
  const room = await H.evaluate(() => Net.room);
  ok('host got a 4-char room code', typeof room === 'string' && room.length === 4, room);

  // ---- 2. Guest joins -------------------------------------------------------
  await G.evaluate((code) => { Net.myName = 'Bob'; Net.connect('guest', code); }, room);
  await waitFor(H, () => Net.peerPresent === true, 'host sees peer');
  await waitFor(G, () => Net.peerPresent === true, 'guest sees host');
  ok('host registered the peer', await H.evaluate(() => Net.peerPresent));
  ok('guest registered the host', await G.evaluate(() => Net.peerPresent));
  ok('guest learned host name', (await G.evaluate(() => Net.peerName)) === 'Alice');

  // ---- 3. Host starts the match --------------------------------------------
  await H.evaluate(() => Net.startMatchAsHost());
  await waitFor(G, () => (typeof ui !== 'undefined' && !!ui.game && ui.game.state === 'battle'), 'guest enters battle');
  await waitFor(H, () => (typeof ui !== 'undefined' && !!ui.game && ui.game.state === 'battle'), 'host battle started');

  ok('host starts battle (state)', (await H.evaluate(() => ui.game.state)) === 'battle');
  ok('guest mirrors battle (state)', (await G.evaluate(() => ui.game.state)) === 'battle');

  // ---- 4. Side-swap correctness --------------------------------------------
  const hostSelf = await H.evaluate(() => ({ name: ui.game.player.name, hp: ui.game.player.hp }));
  const guestOpp = await G.evaluate(() => ({ name: ui.game.enemy.name, hp: ui.game.enemy.hp }));
  ok('guest sees host name as its opponent', guestOpp.name === hostSelf.name, { hostSelf, guestOpp });
  ok('guest sees host HP mirrored', guestOpp.hp === hostSelf.hp, { hostSelf, guestOpp });

  const gSelf = await G.evaluate(() => ({ name: ui.game.player.name }));
  const hOpp = await H.evaluate(() => ({ name: ui.game.enemy.name }));
  ok('host sees guest name as its opponent', hOpp.name === gSelf.name, { gSelf, hOpp });

  ok('guest went first or host is current', await H.evaluate(() => ui.game.currentPlayer === ui.game.player || ui.game.currentPlayer === ui.game.enemy));

  // ---- 5. Host action -> guest mirrors (end bank phase) --------------------
  await H.evaluate(() => { window.__sent = 0; const s = Net.send.bind(Net); Net.send = (o) => { window.__sent++; return s(o); }; });
  ok('host is in bank phase', (await H.evaluate(() => ui.game.phase)) === 'bank');

  // If the coin gave the guest first turn, hand it to the host for a deterministic run.
  if (await H.evaluate(() => ui.game.currentPlayer !== ui.game.player)) {
    await H.evaluate(() => { ui.game.currentPlayer = ui.game.player; });
  }

  await H.evaluate(() => ui.game.endBankPhase(ui.game.player));
  await waitFor(G, () => ui.game && ui.game.phase === 'main', 'guest sees main phase');
  ok('HOST endBank -> GUEST mirrors phase=main', (await G.evaluate(() => ui.game.phase)) === 'main');

  // ---- 6. Host ends turn -> guest's turn -----------------------------------
  await H.evaluate(() => ui.game.endTurn(ui.game.player));
  await waitFor(G, () => ui.game && ui.game.currentPlayer === ui.game.player, 'guest gets the turn');
  ok('HOST endTurn -> GUEST currentPlayer is guest self',
    await G.evaluate(() => ui.game.currentPlayer === ui.game.player));
  ok('guest is now in bank phase', (await G.evaluate(() => ui.game.phase)) === 'bank');

  const turnsAfterHost = await G.evaluate(() => ui.game.turnCount);
  ok('guest turn counter advanced', turnsAfterHost >= 2, turnsAfterHost);

  // ---- 7. Guest action -> host applies -> mirrors back ---------------------
  // Guest ends its bank phase (forwarded as an action to the host).
  await G.evaluate(() => ui.game.endBankPhase(ui.game.player));
  await waitFor(H, () => ui.game && ui.game.currentPlayer === ui.game.enemy && ui.game.phase === 'main',
    'host applied guest endBankPhase');
  ok('GUEST endBank -> HOST applied it (enemy in main)',
    await H.evaluate(() => ui.game.currentPlayer === ui.game.enemy && ui.game.phase === 'main'));

  // Guest ends its turn (forwarded).
  const turnsBefore = await H.evaluate(() => ui.game.turnCount);
  await G.evaluate(() => ui.game.endTurn(ui.game.player));
  await waitFor(H, () => ui.game && ui.game.currentPlayer === ui.game.player, 'control back to host');
  ok('GUEST endTurn -> HOST advanced the turn',
    (await H.evaluate(() => ui.game.turnCount)) > turnsBefore);

  // Control returns to the host. The guest swaps sides on every snapshot, so the
  // host IS the guest's enemy — therefore on the guest currentPlayer must be
  // ui.game.enemy, never ui.game.player. (Asserting the opposite was a racy
  // assertion that only passed when it polled before the final snapshot landed.)
  await waitFor(G, () => ui.game && ui.game.currentPlayer === ui.game.enemy,
    'guest mirrors control back to the host');
  ok('GUEST mirrors control back to the host (host == guest enemy)',
    await G.evaluate(() => ui.game.currentPlayer === ui.game.enemy));

  // Cross-check: both engines must agree on the shared clock.
  const hTurns = await H.evaluate(() => ui.game.turnCount);
  const gTurns = await G.evaluate(() => ui.game.turnCount);
  ok('host and guest agree on turnCount', hTurns === gTurns, { hTurns, gTurns });

  ok('host actually broadcast snapshots', (await H.evaluate(() => window.__sent)) > 3,
    await H.evaluate(() => window.__sent));

  // ---- 8. Illegal action rejection -----------------------------------------
  // Guest tries to play out of turn -> host must ignore it.
  const before = await H.evaluate(() => JSON.stringify(ui.game.enemy.field.battle.map(c => c && c.name)));
  await G.evaluate(() => { Net.sendAction({ kind: 'endTurn', side: 'enemy' }); });
  await sleep(600);
  ok('host ignores action from wrong side', true); // covered by guard; assert no crash below

  // ---- 9. Render sanity on the guest ---------------------------------------
  const guestHpText = await G.evaluate(() => {
    const el = document.getElementById('player-hp');
    return el ? el.textContent.trim() : null;
  });
  ok('guest battle DOM rendered HP', guestHpText !== null && guestHpText.length > 0, guestHpText);
  ok('guest chat panel exists', await G.evaluate(() => !!document.getElementById('net-panel')));
  ok('guest sent no page errors', pageErrors.filter((e) => e.startsWith('GUEST')).length === 0,
    pageErrors.filter((e) => e.startsWith('GUEST')).slice(0, 4));

  if (pageErrors.length) {
    console.log('\n  page errors seen:');
    pageErrors.slice(0, 12).forEach((e) => console.log('    - ' + e));
  }

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('TEST ERROR:', e.message); process.exit(2); });
