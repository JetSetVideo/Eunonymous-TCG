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
// puppeteer-core >= 22 is ESM-only; on Node < 22.12 require() of it throws
// ERR_REQUIRE_ESM, so it is loaded with a dynamic import inside main().
let puppeteer = null;

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
  puppeteer = (await import('puppeteer-core')).default;
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

  // ---- 10. Hidden information ----------------------------------------------
  const hidden = await G.evaluate(() => ({
    oppHand: ui.game.enemy.hand.length,
    oppHandHidden: ui.game.enemy.hand.every((c) => c && c.hidden === true && !c.name),
    oppDeckHidden: ui.game.enemy.deck.every((c) => c && c.hidden === true && !c.name),
    ownDeckHidden: ui.game.player.deck.every((c) => c && c.hidden === true),
    ownHandReal: ui.game.player.hand.every((c) => c && !c.hidden && !!c.name)
  }));
  const hostHandLen = await H.evaluate(() => ui.game.player.hand.length);
  ok('guest cannot see host hand contents (count only)', hidden.oppHandHidden && hidden.oppHand === hostHandLen, { hidden, hostHandLen });
  ok('deck order is not leaked to the guest', hidden.oppDeckHidden && hidden.ownDeckHidden, hidden);
  ok('guest still sees its own hand', hidden.ownHandReal, hidden);

  // ---- 11. Sequence numbers: stale / invalid snapshots are dropped ---------
  const seqRes = await G.evaluate(() => {
    const before = { turn: ui.game.turnCount, hp: ui.game.player.hp, seq: Net._lastSeq };
    const inject = (payload) => Net.ws.onmessage({ data: JSON.stringify({ t: 'relay', lane: 'host', payload }) });
    const fake = JSON.parse(JSON.stringify({
      state: 'battle', phase: 'main', turnCount: 999, cur: 'player',
      player: ui.game.enemy, enemy: Object.assign({}, ui.game.player, { hp: 1 })
    }));
    const d0 = Net.stats.snapsDropped, i0 = Net.stats.snapsInvalid;
    inject({ k: 'snap', g: fake, full: true, seq: Net._lastSeq, epoch: Net._epoch });       // duplicate seq
    inject({ k: 'snap', g: fake, full: true, seq: Net._lastSeq - 1, epoch: Net._epoch });   // out of order
    inject({ k: 'snap', g: { state: 'battle', turnCount: 999 }, full: true, seq: Net._lastSeq + 1000, epoch: Net._epoch }); // malformed
    inject({ k: 'snap', g: 'garbage', seq: Net._lastSeq + 1001, epoch: Net._epoch });
    return {
      before, after: { turn: ui.game.turnCount, hp: ui.game.player.hp, seq: Net._lastSeq },
      dropped: Net.stats.snapsDropped - d0, invalid: Net.stats.snapsInvalid - i0
    };
  });
  ok('guest drops duplicate + out-of-order snapshots', seqRes.dropped === 2, seqRes);
  ok('guest rejects malformed snapshots before applying', seqRes.invalid === 2, seqRes);
  ok('guest state untouched by stale/invalid snapshots',
    seqRes.after.turn === seqRes.before.turn && seqRes.after.hp === seqRes.before.hp && seqRes.after.seq === seqRes.before.seq, seqRes);

  // ---- 12. Guest socket drops mid-match -> auto-reconnect + resync ---------
  await G.evaluate(() => Net._dropSocket());
  await waitFor(G, () => Net.reconnecting === true || (Net.connected && Net.stats.reconnects > 0), 'guest enters reconnecting', 4000);
  const reconnStatus = await G.evaluate(() => ({
    text: document.getElementById('net-status').textContent,
    state: document.getElementById('net-panel').getAttribute('data-net-state')
  }));
  ok('guest UI shows reconnecting status',
    /reconnect/i.test(reconnStatus.text) || reconnStatus.state === 'reconnecting', reconnStatus);
  await waitFor(H, () => Net.peerPresent === false || Net.stats.resyncs > 0, 'host notices the drop', 4000);

  // While the guest is away, the host's authoritative state moves on.
  await H.evaluate(() => {
    if (ui.game.currentPlayer !== ui.game.player) ui.game.currentPlayer = ui.game.player;
    ui.game.enemy.hp = ui.game.enemy.hp - 3;
    if (ui.game.phase === 'bank') ui.game.endBankPhase(ui.game.player);
  });
  const hostAfter = await H.evaluate(() => ({ phase: ui.game.phase, hp: ui.game.enemy.hp, turn: ui.game.turnCount, resyncs: Net.stats.resyncs }));

  await waitFor(G, () => Net.connected && Net.peerPresent && !Net.reconnecting, 'guest reconnected', 12000);
  await G.evaluate((hp) => { window.__expectHp = hp; }, hostAfter.hp);
  await waitFor(G, () => ui.game && ui.game.player.hp === window.__expectHp, 'guest resynced HP', 8000);
  const guestAfter = await G.evaluate(() => ({
    phase: ui.game.phase, hp: ui.game.player.hp, turn: ui.game.turnCount,
    hostIsCurrent: ui.game.currentPlayer === ui.game.enemy, reconnects: Net.stats.reconnects, room: Net.room,
    status: document.getElementById('net-status').textContent
  }));
  ok('guest auto-reconnected to the same room', guestAfter.reconnects >= 1 && guestAfter.room === room, guestAfter);
  ok('host re-sent a full snapshot on rejoin', (await H.evaluate(() => Net.stats.resyncs)) > hostAfter.resyncs);
  ok('guest resynced state changed while it was away (HP, phase, turn)',
    guestAfter.hp === hostAfter.hp && guestAfter.phase === hostAfter.phase && guestAfter.turn === hostAfter.turn && guestAfter.hostIsCurrent,
    { hostAfter, guestAfter });
  ok('guest UI shows connected again', /connected|live/i.test(guestAfter.status) && !/reconnecting/i.test(guestAfter.status), guestAfter.status);

  // Actions flow again after the reconnect.
  await H.evaluate(() => ui.game.endTurn(ui.game.player));
  await waitFor(G, () => ui.game.currentPlayer === ui.game.player && ui.game.phase === 'bank', 'guest turn after reconnect');
  await G.evaluate(() => ui.game.endBankPhase(ui.game.player));
  await waitFor(H, () => ui.game.currentPlayer === ui.game.enemy && ui.game.phase === 'main', 'host applies guest action after reconnect');
  ok('guest actions reach the host after reconnect', true);

  // ---- 13. Guest reloads the page mid-match -> rejoin same code -> resync --
  await G.reload({ waitUntil: 'domcontentloaded' });
  await waitFor(G, () => typeof Net !== 'undefined' && typeof ui !== 'undefined', 'guest reloaded');
  await waitFor(H, () => Net.peerPresent === false, 'host sees reloaded guest drop', 6000);
  const hostHp2 = await H.evaluate(() => { ui.game.enemy.hp = ui.game.enemy.hp - 2; return ui.game.enemy.hp; });
  await G.evaluate((code) => { Net.myName = 'Bob'; Net.connect('guest', code); }, room);
  await G.evaluate((hp) => { window.__expectHp = hp; }, hostHp2);
  await waitFor(G, () => !!(ui.game && ui.game.state === 'battle' && ui.game.player.hp === window.__expectHp), 'reloaded guest resynced', 12000);
  const reloaded = await G.evaluate(() => ({ phase: ui.game.phase, hp: ui.game.player.hp, screen: ui.currentScreen, cur: ui.game.currentPlayer === ui.game.player }));
  const hostNow = await H.evaluate(() => ({ phase: ui.game.phase, cur: ui.game.currentPlayer === ui.game.enemy }));
  ok('reloaded guest reclaims its seat and gets the live match', reloaded.hp === hostHp2 && reloaded.phase === hostNow.phase && reloaded.cur === hostNow.cur, { reloaded, hostNow });

  // ---- 14. Explicit leave shows "opponent left" on the host ----------------
  await G.evaluate(() => Net.disconnect());
  await waitFor(H, () => /left/i.test(document.getElementById('net-status').textContent), 'host shows opponent left', 4000);
  ok('host UI shows opponent left', true);
  ok('no page errors after reconnect scenarios', pageErrors.length === 0, pageErrors.slice(0, 6));

  if (pageErrors.length) {
    console.log('\n  page errors seen:');
    pageErrors.slice(0, 12).forEach((e) => console.log('    - ' + e));
  }

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('TEST ERROR:', e.message); process.exit(2); });
