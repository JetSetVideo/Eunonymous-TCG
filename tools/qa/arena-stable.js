#!/usr/bin/env node
/*
 * tools/qa/arena-stable.js — for every battleground biome, start a battle and
 * check that #battle-arena is never transformed/scaled by a background animation
 * (a duplicated @keyframes name used to scale the whole arena 1.1-1.15x, sliding
 * buttons and the enemy HP orb off-screen and away from the real mouse).
 * Also checks the enemy HP orb and end-turn button are on-screen and hittable.
 */
var CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
var URL = process.env.GAME_URL || 'http://localhost:8787/';
(async function () {
  var puppeteer = (await import('puppeteer-core')).default;
  var browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  var page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL, { waitUntil: 'networkidle2' });
  var biomes = await page.evaluate(function () {
    return (typeof BATTLEGROUNDS !== 'undefined' ? BATTLEGROUNDS : (ui.battlegrounds || [])).map(function (b) { return b.biome; })
      .filter(function (v, i, a) { return v && a.indexOf(v) === i; });
  });
  if (!biomes.length) biomes = ['cyber', 'desert', 'fog', 'neon', 'golden', 'gravity', 'fire'];
  var bad = [];
  for (var i = 0; i < biomes.length; i++) {
    var r = await page.evaluate(async function (biome) {
      var a = document.getElementById('battle-arena');
      if (!ui.game) ui.quickBattle();
      await new Promise(function (res) { setTimeout(res, 600); });
      a.className = 'battle-arena bg-' + biome;
      var worst = 0;
      for (var k = 0; k < 12; k++) {
        await new Promise(function (res) { setTimeout(res, 250); });
        var t = getComputedStyle(a).transform;
        if (t && t !== 'none') {
          var m = new DOMMatrix(t);
          worst = Math.max(worst, Math.abs(m.a - 1), Math.abs(m.d - 1), Math.abs(m.e) / 100, Math.abs(m.f) / 100);
        }
      }
      var hit = function (id) {
        var e = document.getElementById(id); if (!e) return 'missing';
        var b = e.getBoundingClientRect(); var x = b.x + b.width / 2, y = b.y + b.height / 2;
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return 'offscreen';
        var t = document.elementFromPoint(x, y);
        return t && (t === e || e.contains(t)) ? 'ok' : 'covered';
      };
      return { biome: biome, worstDeviation: +worst.toFixed(3), orb: hit('enemy-hp-orb'), endTurn: hit('turn-timer-btn') };
    }, biomes[i]);
    console.log(JSON.stringify(r));
    if (r.worstDeviation > 0.001 || r.orb !== 'ok' || r.endTurn !== 'ok') bad.push(r.biome);
  }
  await browser.close();
  console.log(bad.length ? 'FAIL: ' + bad.join(', ') : 'PASS: arena stable in ' + biomes.length + ' biomes');
  process.exit(bad.length ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(2); });
