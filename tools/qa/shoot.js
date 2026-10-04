#!/usr/bin/env node
/*
 * tools/qa/shoot.js — one-off scripted screenshots for visual review.
 *
 *   node tools/qa/shoot.js <scenario> [outDir] [width] [height]
 *
 * Scenarios: title | deckbuilder | battle | cardsheet
 * Uses puppeteer-core (no browser download); set CHROME_PATH to override.
 * GAME_URL defaults to http://localhost:8787/.
 */
var puppeteer;
var fs = require('fs');
var path = require('path');

var CHROME = process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
var URL = process.env.GAME_URL || 'http://localhost:8787/';
var scenario = process.argv[2] || 'title';
var outDir = process.argv[3] || path.join(__dirname, 'out', 'shots');
var W = parseInt(process.argv[4] || '1440', 10);
var H = parseInt(process.argv[5] || '900', 10);

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

(async function () {
  puppeteer = (await import('puppeteer-core')).default;
  fs.mkdirSync(outDir, { recursive: true });
  var browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--window-size=' + W + ',' + H]
  });
  var page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  var errors = [];
  page.on('pageerror', function (e) { errors.push('pageerror: ' + e.message); });
  page.on('console', function (m) { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', function (r) { errors.push('reqfail: ' + r.url()); });
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await sleep(1500);
  // Until js/card-art.js lands, preview with a deterministic hash mapping.
  await page.evaluate(async function () {
    if (typeof cardArtFor === 'function') return;
    var m = await (await fetch('assets/art/manifest.json')).json();
    window.cardArtFor = function (c) {
      var h = 0, s = c.id || c.name;
      for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return { src: 'assets/art/' + m[h % m.length].file, pos: '50% 28%' };
    };
  });

  var file = path.join(outDir, scenario + '-' + W + 'x' + H + '.png');
  var info = {};

  if (scenario === 'deckbuilder') {
    await page.evaluate(function () { ui.showScreen('character-select'); ui.selectCharacter('Synthetic'); });
    await sleep(2500);
  } else if (scenario === 'cardsheet') {
    // Render a fixed sample of cards (one per type/rarity) at collection size.
    await page.evaluate(function () {
      var pick = [];
      var seen = {};
      ALL_CARDS.forEach(function (c) {
        var k = c.type + '/' + c.rarity;
        if (!seen[k] && pick.length < 18) { seen[k] = 1; pick.push(c); }
      });
      var host = document.createElement('div');
      host.id = 'qa-cardsheet';
      host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#070a14;display:flex;flex-wrap:wrap;gap:14px;padding:16px;align-content:flex-start;overflow:auto';
      host.innerHTML = pick.map(function (c) { return '<div style="width:180px">' + ui.renderCard(c) + '</div>'; }).join('') +
        pick.slice(0, 6).map(function (c) { return '<div style="width:110px">' + ui.renderCard(c, true) + '</div>'; }).join('');
      document.body.appendChild(host);
    });
    await sleep(2000);
  } else if (scenario === 'battle') {
    // NB: `ui` is a top-level const (global lexical scope), not window.ui.
    await page.evaluate(function () { ui.quickBattle(); });
    await sleep(4000);
  }

  info = await page.evaluate(function () {
    var cs = Array.prototype.slice.call(document.querySelectorAll('.card')).filter(function (c) { return c.offsetParent; });
    var out = { cards: cs.length, screen: (document.querySelector('.screen.active') || {}).id };
    if (cs.length) {
      var r = cs[0].getBoundingClientRect();
      out.first = { w: Math.round(r.width), h: Math.round(r.height), ratio: +(r.height / r.width).toFixed(3) };
      // readability: any text node inside a card rendered under 9px?
      var tiny = 0, clipped = 0, noArt = 0;
      cs.forEach(function (c) {
        c.querySelectorAll('.card-name,.card-ability,.card-type-badge,.card-mana-cost,.card-atk-badge,.card-def-badge').forEach(function (el) {
          var fs = parseFloat(getComputedStyle(el).fontSize);
          if (fs < 9) tiny++;
          if (el.scrollHeight > el.clientHeight + 2 && getComputedStyle(el).overflow !== 'visible') clipped++;
        });
        var img = c.querySelector('.card-art-img');
        if (!img || !img.complete || !img.naturalWidth) noArt++;
      });
      out.tinyText = tiny; out.clippedText = clipped; out.cardsWithoutArt = noArt;
    }
    return out;
  });
  await page.screenshot({ path: file });
  console.log(JSON.stringify({ file: file, info: info, errors: errors.slice(0, 15) }, null, 1));
  await browser.close();
})().catch(function (e) { console.error(e); process.exit(1); });
