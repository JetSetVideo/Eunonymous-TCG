#!/usr/bin/env node
/**
 * Eunonymous-TCG — QA harness  (tools/qa/harness.js)
 * ==================================================
 * Drives the game in a real browser, captures stamped screenshots across screen
 * sizes, measures FPS, records every console error / JS exception / failed
 * request, and writes a JSON + Markdown report.
 *
 * Every screenshot carries a burnt-in overlay: game version, balance revision,
 * viewport, screen/flow, measured FPS, and error count. That is what makes two
 * runs comparable — you can tell whether a regression came with the code or the
 * version.
 *
 * Usage:
 *   node tools/qa/harness.js                        # all viewports, title + quickbattle
 *   node tools/qa/harness.js --flows title
 *   node tools/qa/harness.js --viewports phone-portrait,desktop
 *   node tools/qa/harness.js --probe               # bug probes only (fast, no shots)
 *
 * Env: GAME_URL (default http://127.0.0.1:8787/), CHROME_PATH
 */
'use strict';

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'tools/qa/out');
const GAME_URL = process.env.GAME_URL || 'http://127.0.0.1:8787/';

// ---------------------------------------------------------------------------
// Screen sizes we care about. Labels match the target platform matrix.
// ---------------------------------------------------------------------------
const VIEWPORTS = {
  'phone-portrait':  { width: 390,  height: 844,  dpr: 3, label: 'Phone portrait (iOS/Android)' },
  'phone-landscape': { width: 844,  height: 390,  dpr: 3, label: 'Phone landscape' },
  'tablet-portrait': { width: 768,  height: 1024, dpr: 2, label: 'Tablet portrait' },
  'tablet-landscape':{ width: 1024, height: 768,  dpr: 2, label: 'Tablet landscape' },
  'laptop':          { width: 1366, height: 768,  dpr: 1, label: 'Laptop' },
  'desktop':         { width: 1920, height: 1080, dpr: 1, label: 'Large desktop' },
};

// ---------------------------------------------------------------------------
// Flows = a named sequence that leaves the game on a particular screen.
// ---------------------------------------------------------------------------
const FLOWS = {
  title: {
    label: 'Title / main menu',
    run: async () => { /* nothing — the game boots here */ },
  },
  quickbattle: {
    label: 'Quick Battle (vs AI)',
    run: async (page) => {
      await page.evaluate(() => ui.launchBattle());
      await waitFor(page, () => ui.game && ui.game.state === 'battle', 'battle start');
      await sleep(1200); // let the AI tick move
    },
  },
  quickbattle_log: {
    label: 'Quick Battle + Battle Log open',
    run: async (page) => {
      await page.evaluate(() => ui.launchBattle());
      await waitFor(page, () => ui.game && ui.game.state === 'battle', 'battle start');
      await sleep(1500);
      await page.evaluate(() => ui.toggleBattleLog());
      await sleep(400);
    },
  },
};

// ---------------------------------------------------------------------------
// Bug probes — assertions about invariants. These are the regression net.
// ---------------------------------------------------------------------------
const PROBES = {
  async 'turn-1-is-not-skipped'(page) {
    // The bug: launchBattle called startBattle (which starts a turn) AND then
    // startTurn again when the coin toss picked the enemy -> turnCount === 2 and
    // the player never got their opening bank phase. startBattle must be the only
    // thing that starts a turn, and exactly one side must hold turn 1.
    const problems = [];
    const observed = {};

    for (const winner of ['player', 'enemy']) {
      const r = await page.evaluate((w) => {
        ui.coinWinner = w;
        ui.launchBattle();
        const g = ui.game;
        return {
          coinWinner: w,
          turnCount: g.turnCount,
          playerTurn: g.player.turn,
          enemyTurn: g.enemy.turn,
          currentIsPlayer: g.currentPlayer === g.player,
          phase: g.phase,
        };
      }, winner);
      observed[winner] = r;

      if (r.turnCount !== 1) problems.push(winner + ': turnCount=' + r.turnCount + ' (expected 1)');
      // Exactly one side has taken turn 1 — never both.
      const started = (r.playerTurn === 1 ? 1 : 0) + (r.enemyTurn === 1 ? 1 : 0);
      if (started !== 1) problems.push(winner + ': ' + started + ' sides hold turn 1 (expected exactly 1)');
      if (winner === 'enemy' && r.currentIsPlayer) problems.push('enemy: currentPlayer should be the enemy');
      if (winner === 'player' && !r.currentIsPlayer) problems.push('player: currentPlayer should be the player');
      if (r.phase !== 'bank') problems.push(winner + ': opened in phase "' + r.phase + '" (expected bank)');
    }
    return { probe: 'turn-1-is-not-skipped', observed, problems };
  },

  async 'role-mapping-complete'(page) {
    // The identity layer: every character must resolve to a real role, and every
    // role must be claimed. Weak fits are reported but are design decisions.
    const r = await page.evaluate(() => {
      if (typeof RoleRegistry === 'undefined') return { missing: true };
      const a = RoleRegistry.auditRoleMapping();
      return {
        ...a,
        roles: RoleRegistry.ROLE_LIST.length,
        characters: Object.keys(RoleRegistry.CHARACTER_ROLE).length,
        mapping: Object.keys(RoleRegistry.CHARACTER_ROLE)
          .map((c) => c + '->' + RoleRegistry.roleOf(c)),
      };
    });
    if (r.missing) return { probe: 'role-mapping-complete', problems: ['RoleRegistry not loaded (js/roles.js)'] };
    const problems = [];
    if (r.roles !== 9) problems.push('expected 9 roles, found ' + r.roles);
    if (r.unmapped.length) problems.push('characters mapped to unknown roles: ' + r.unmapped.join(', '));
    if (r.unclaimed.length) problems.push('roles with no character: ' + r.unclaimed.join(', '));
    return {
      probe: 'role-mapping-complete',
      observed: { roles: r.roles, characters: r.characters, weakFits: r.weak, mapping: r.mapping },
      problems,
    };
  },

  async 'menu-reachable-on-small-screens'(page) {
    // A fixed-position panel can hide the menu WITHOUT affecting scrollHeight, so
    // overflow checks alone miss it. Hit-test every menu item with elementFromPoint
    // at phone size and report anything covered or pushed off-screen.
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
    await sleep(600);
    const r = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.title-content button, .title-content a'));
      const covered = [];
      const offscreen = [];
      for (const b of btns) {
        const label = (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 26);
        const rect = b.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.bottom < 0 || rect.top > window.innerHeight) { offscreen.push(label); continue; }
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const el = document.elementFromPoint(cx, cy);
        if (!el) { covered.push({ label, by: '(nothing)' }); continue; }
        if (b === el || b.contains(el) || el.contains(b)) continue;
        const panel = el.closest && el.closest('#net-panel');
        covered.push({ label, by: panel ? 'net-panel' : (el.id || el.className || el.tagName) });
      }
      return {
        buttonCount: btns.length,
        covered,
        offscreen,
        scrollH: document.documentElement.scrollHeight,
        clientH: document.documentElement.clientHeight,
      };
    });
    const problems = [];
    const byPanel = r.covered.filter((c) => c.by === 'net-panel');
    if (byPanel.length) {
      problems.push(byPanel.length + ' menu item(s) hidden behind the net panel: ' +
        byPanel.map((c) => c.label).join(', '));
    }
    const other = r.covered.filter((c) => c.by !== 'net-panel');
    if (other.length) {
      problems.push(other.length + ' menu item(s) covered by something else: ' +
        other.map((c) => c.label + ' (' + c.by + ')').join(', '));
    }
    if (r.offscreen.length) {
      problems.push(r.offscreen.length + ' menu item(s) pushed off-screen (needs scrolling): ' +
        r.offscreen.join(', '));
    }
    return { probe: 'menu-reachable-on-small-screens', observed: r, problems };
  },

  async 'no-page-scroll'(page) {
    // DIRECTIVE: the game must fit strictly inside 100vh x 100vw. Zero page
    // scrolling at any size. This probe measures it AND names the offenders, so a
    // failure tells you what to fix rather than just that something is wrong.
    const problems = [];
    const observed = {};

    for (const vpName of ['phone-portrait', 'phone-landscape', 'tablet-portrait',
                          'tablet-landscape', 'laptop', 'desktop']) {
      const vp = VIEWPORTS[vpName];
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dpr });
      await sleep(450);

      const r = await page.evaluate(() => {
        const de = document.documentElement;
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        const act = document.querySelector('.screen.active');
        const offenders = [];
        document.querySelectorAll('body *').forEach((el) => {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') return;
          if (cs.position === 'fixed') return;           // fixed overlays don't scroll
          const b = el.getBoundingClientRect();
          if (b.height === 0 && b.width === 0) return;
          const overY = Math.round(b.bottom - vh);
          const overX = Math.round(b.right - vw);
          if (overY <= 4 && overX <= 4) return;
          let sel = el.tagName.toLowerCase();
          if (el.id) sel = '#' + el.id;
          else if (typeof el.className === 'string' && el.className.trim()) {
            sel = '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.');
          }
          offenders.push({ sel, overY, overX, h: Math.round(b.height), w: Math.round(b.width) });
        });
        offenders.sort((a, b) => (b.overY + b.overX) - (a.overY + a.overX));
        const seen = new Set(); const top = [];
        for (const o of offenders) {
          if (seen.has(o.sel)) continue;
          seen.add(o.sel); top.push(o);
          if (top.length >= 8) break;
        }
        return {
          overflowY: de.scrollHeight - de.clientHeight,
          overflowX: de.scrollWidth - de.clientWidth,
          scrollH: de.scrollHeight, clientH: de.clientHeight,
          scrollW: de.scrollWidth, clientW: de.clientWidth,
          activeScreen: act ? act.id : null,
          activeOverflowY: act ? act.scrollHeight - act.clientHeight : 0,
          activeOverflowX: act ? act.scrollWidth - act.clientWidth : 0,
          activeScrollH: act ? act.scrollHeight : 0,
          activeClientH: act ? act.clientHeight : 0,
          top,
        };
      });

      observed[vpName] = r;
      if (r.overflowY > 1) {
        problems.push(vpName + ': PAGE vertical overflow ' + r.overflowY + 'px (' +
          r.scrollH + ' vs ' + r.clientH + ')' +
          (r.top.length ? ' | deepest: ' + r.top.slice(0, 4).map((o) => o.sel + ' +' + o.overY + 'px').join(', ') : ''));
      }
      if (r.overflowX > 1) {
        problems.push(vpName + ': PAGE horizontal overflow ' + r.overflowX + 'px');
      }
      // The directive requires the whole UI to sit inside the viewport, so the
      // active screen must not scroll internally either.
      if (r.activeOverflowY > 1) {
        problems.push(vpName + ': ACTIVE SCREEN #' + r.activeScreen + ' scrolls internally by ' +
          r.activeOverflowY + 'px (' + r.activeScrollH + ' vs ' + r.activeClientH + ')');
      }
      if (r.activeOverflowX > 1) {
        problems.push(vpName + ': ACTIVE SCREEN #' + r.activeScreen + ' overflows horizontally by ' +
          r.activeOverflowX + 'px');
      }
    }
    return { probe: 'no-page-scroll', observed, problems };
  },

  async 'battle-log-matches-history'(page) {
    // The log panel must render exactly the current match's events.
    const r = await page.evaluate(() => {
      ui.coinWinner = 'player';
      ui.launchBattle();
      const g = ui.game;
      ui.toggleBattleLog();
      const rendered = document.querySelectorAll('#battle-log-content .log-entry').length;
      return {
        rendered,
        historyLen: g.getBattleHistory().length,
        logLen: g.getBattleLog().length,
        gameStartTime: g.gameStartTime,
      };
    });
    const problems = [];
    // rendered may be <= history+filter-bar; it must never exceed the source data
    if (r.rendered > r.historyLen + 1) {
      problems.push('rendered ' + r.rendered + ' entries but history only has ' + r.historyLen);
    }
    return { probe: 'battle-log-matches-history', observed: r, problems };
  },
};

// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(page, fn, label, ms = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (await page.evaluate(fn)) return true; } catch (e) { /* busy */ }
    await sleep(120);
  }
  throw new Error('timeout: ' + label);
}

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const cands = [
    '/usr/bin/brave-browser', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/home/jetsetvideo/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',
  ];
  for (const c of cands) { try { if (fs.existsSync(c)) return c; } catch (e) {} }
  throw new Error('No Chrome-family binary found. Set CHROME_PATH.');
}

/** Burn a info overlay into the page so the screenshot is self-describing. */
async function installHud(page, info) {
  await page.evaluate((i) => {
    let el = document.getElementById('qa-hud');
    if (!el) {
      el = document.createElement('div');
      el.id = 'qa-hud';
      el.style.cssText = [
        'position:fixed', 'left:0', 'top:0', 'z-index:2147483647',
        'background:rgba(0,0,0,.82)', 'color:#05ffa1',
        'font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace',
        'padding:6px 9px', 'border-right:1px solid #05ffa1',
        'border-bottom:1px solid #05ffa1', 'border-radius:0 0 8px 0',
        'pointer-events:none', 'white-space:pre', 'letter-spacing:.02em',
      ].join(';');
      document.body.appendChild(el);
    }
    el.textContent = i;
  }, info);
}

async function measureFps(page, ms = 1500) {
  await page.evaluate(() => {
    window.__qaFps = { frames: 0, t0: performance.now(), raf: 0 };
    const tick = () => { window.__qaFps.frames++; window.__qaFps.raf = requestAnimationFrame(tick); };
    tick();
  });
  await sleep(ms);
  return page.evaluate(() => {
    const f = window.__qaFps;
    cancelAnimationFrame(f.raf);
    const secs = (performance.now() - f.t0) / 1000;
    return { fps: Math.round((f.frames / secs) * 10) / 10, frames: f.frames, secs: Math.round(secs * 100) / 100 };
  });
}

// ---------------------------------------------------------------------------
(async () => {
  const argv = process.argv.slice(2);
  const argVal = (f, d) => { const i = argv.indexOf(f); return i !== -1 && argv[i + 1] ? argv[i + 1] : d; };
  const probeOnly = argv.includes('--probe');
  const flowNames = argVal('--flows', probeOnly ? '' : 'title,quickbattle').split(',').filter(Boolean);
  const vpNames = argVal('--viewports', 'all') === 'all'
    ? Object.keys(VIEWPORTS)
    : argVal('--viewports', '').split(',').filter(Boolean);

  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu',
           '--mute-audio', '--disable-dev-shm-usage'],
  });

  const report = {
    startedAt: new Date().toISOString(),
    gameUrl: GAME_URL,
    version: null,
    shots: [],
    errors: [],
    probes: [],
  };

  // --- version first, from a throwaway page ---------------------------------
  {
    const p = await browser.newPage();
    await p.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await p.waitForFunction(() => typeof window.VersionInfo !== 'undefined', { timeout: 15000 }).catch(() => {});
    report.version = await p.evaluate(() => (window.VersionInfo ? window.VersionInfo.describe() : 'UNKNOWN'));
    await p.close();
  }
  console.log('\x1b[1mEunonymous-TCG QA harness\x1b[0m');
  console.log('  game     : ' + GAME_URL);
  console.log('  version  : ' + report.version);
  console.log('  viewports: ' + (vpNames.length ? vpNames.join(', ') : '(none)'));
  console.log('  flows    : ' + (flowNames.join(', ') || '(none)'));

  // --- probes --------------------------------------------------------------
  for (const [name, fn] of Object.entries(PROBES)) {
    const p = await browser.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    try {
      await p.setViewport({ width: 1366, height: 768 });
      await p.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await waitFor(p, () => typeof ui !== 'undefined' && !!ui && !!GameEngine, 'ui ready');
      const res = await fn(p);
      res.errors = errs.slice(0, 5);
      report.probes.push(res);
      const bad = res.problems && res.problems.length;
      console.log('  probe ' + (bad ? '\x1b[31mFAIL\x1b[0m' : '\x1b[32mPASS\x1b[0m') + '  ' + name +
        (bad ? '\n         ' + res.problems.join('\n         ') : ''));
    } catch (e) {
      report.probes.push({ probe: name, problems: ['harness error: ' + e.message], errors: errs.slice(0, 5) });
      console.log('  probe \x1b[31mERROR\x1b[0m ' + name + ' -> ' + e.message);
    }
    await p.close();
  }

  // --- screenshot sweep ----------------------------------------------------
  if (!probeOnly) {
    for (const vpName of vpNames) {
      const vp = VIEWPORTS[vpName];
      if (!vp) { console.log('  unknown viewport: ' + vpName); continue; }

      for (const flowName of flowNames) {
        const flow = FLOWS[flowName];
        if (!flow) { console.log('  unknown flow: ' + flowName); continue; }

        const page = await browser.newPage();
        const errors = [];
        const failedReqs = [];
        page.on('pageerror', (e) => errors.push({ kind: 'pageerror', text: e.message }));
        page.on('console', (m) => { if (m.type() === 'error') errors.push({ kind: 'console', text: m.text() }); });
        page.on('requestfailed', (r) => failedReqs.push(r.url() + ' :: ' + (r.failure() || {}).errorText));
        page.on('response', (r) => { if (r.status() >= 400) failedReqs.push('HTTP ' + r.status() + ' ' + r.url()); });

        const tag = vpName + '__' + flowName;
        try {
          await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: vp.dpr });
          await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await waitFor(page, () => typeof ui !== 'undefined' && !!ui, 'ui ready');
          await sleep(400);

          await flow.run(page);

          const fps = await measureFps(page);
          const state = await page.evaluate(() => ({
            screen: ui.currentScreen,
            gameState: ui.game ? ui.game.state : null,
            turnCount: ui.game ? ui.game.turnCount : null,
            scrollW: document.documentElement.scrollWidth,
            clientW: document.documentElement.clientWidth,
            scrollH: document.documentElement.scrollHeight,
            clientH: document.documentElement.clientHeight,
          }));
          // "Avoid scrolling" is a goal — flag any horizontal/vertical overflow.
          const overflowX = state.scrollW > state.clientW + 1;
          const overflowY = state.scrollH > state.clientH + 1;

          const ver = report.version || '?';
          const hud = [
            'EUNONYMOUS-TCG  ' + ver,
            'viewport  ' + vp.width + 'x' + vp.height + ' @' + vp.dpr + 'x  (' + vpName + ')',
            'screen    ' + flowName + '   [' + state.screen + (state.gameState ? '/' + state.gameState : '') + ']',
            'fps       ' + fps.fps + '  (' + fps.frames + ' frames / ' + fps.secs + 's)',
            'errors    ' + errors.length + '   failed-req ' + failedReqs.length,
            'overflow  ' + (overflowX ? 'X!' : '-') + ' ' + (overflowY ? 'Y!' : '-') +
              '  (' + state.scrollW + 'x' + state.scrollH + ' vs ' + state.clientW + 'x' + state.clientH + ')',
            'turn      ' + (state.turnCount === null ? '-' : state.turnCount),
            'at        ' + new Date().toISOString().replace('T', ' ').slice(0, 19),
          ].join('\n');
          await installHud(page, hud);

          const file = path.join(OUT, tag + '.png');
          await page.screenshot({ path: file, fullPage: false });

          const rec = {
            viewport: vpName, platform: vp.label, size: vp.width + 'x' + vp.height, dpr: vp.dpr,
            flow: flowName, file: path.relative(ROOT, file),
            fps: fps.fps, screen: state.screen, gameState: state.gameState,
            overflowX, overflowY, errors, failedRequests: failedReqs,
          };
          report.shots.push(rec);
          report.errors.push(...errors.map((e) => ({ ...e, viewport: vpName, flow: flowName })));

          const flag = (errors.length || overflowX || overflowY) ? '\x1b[33m!\x1b[0m' : '\x1b[32m✓\x1b[0m';
          console.log('  ' + flag + ' ' + tag.padEnd(34) +
            ' fps=' + String(fps.fps).padStart(5) +
            ' err=' + errors.length +
            ' overflow=' + (overflowX ? 'X' : '-') + (overflowY ? 'Y' : '-'));
        } catch (e) {
          console.log('  \x1b[31m✗\x1b[0m ' + tag.padEnd(34) + ' ' + e.message);
          report.shots.push({ viewport: vpName, flow: flowName, error: e.message, errors, failedRequests: failedReqs });
        }
        await page.close();
      }
    }
  }

  report.finishedAt = new Date().toISOString();
  await browser.close();

  // --- write reports -------------------------------------------------------
  const jsonPath = path.join(OUT, 'report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const lines = [];
  lines.push('# Eunonymous-TCG — QA report');
  lines.push('');
  lines.push('- **Game version:** ' + report.version);
  lines.push('- **URL:** ' + report.gameUrl);
  lines.push('- **Started:** ' + report.startedAt);
  lines.push('- **Finished:** ' + report.finishedAt);
  lines.push('');
  if (report.probes.length) {
    lines.push('## Bug probes');
    lines.push('');
    for (const p of report.probes) {
      const bad = p.problems && p.problems.length;
      lines.push('### ' + (bad ? '❌' : '✅') + ' ' + p.probe);
      if (bad) p.problems.forEach((x) => lines.push('- ' + x));
      if (p.observed) lines.push('- observed: `' + JSON.stringify(p.observed) + '`');
      lines.push('');
    }
  }
  if (report.shots.length) {
    lines.push('## Screenshots');
    lines.push('');
    lines.push('| viewport | size | flow | fps | errors | overflow | file |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const s of report.shots) {
      lines.push('| ' + s.viewport + ' | ' + (s.size || '-') + ' | ' + s.flow + ' | ' + (s.fps ?? '-') +
        ' | ' + ((s.errors || []).length) + ' | ' + (s.overflowX || s.overflowY ? 'YES' : '-') +
        ' | `' + (s.file || '-') + '` |');
    }
    lines.push('');
  }
  const mdPath = path.join(OUT, 'REPORT.md');
  fs.writeFileSync(mdPath, lines.join('\n'));

  console.log('\n  report: ' + path.relative(ROOT, mdPath));
  console.log('  json  : ' + path.relative(ROOT, jsonPath));
  const failed = report.probes.filter((p) => p.problems && p.problems.length).length;
  console.log('  ' + (failed ? '\x1b[31m' + failed + ' probe(s) failing\x1b[0m' : '\x1b[32mno failing probes\x1b[0m'));
  process.exitCode = failed ? 1 : 0;
})().catch((e) => { console.error('HARNESS ERROR:', e.stack || e.message); process.exitCode = 2; });