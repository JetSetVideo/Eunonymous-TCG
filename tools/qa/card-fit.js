#!/usr/bin/env node
/*
 * tools/qa/card-fit.js — renders EVERY card at every size tier and measures,
 * in the DOM, whether its text fits:
 *   - name truncated (scrollWidth > clientWidth)
 *   - effect / flavor clamped (scrollHeight > clientHeight)
 *   - rules text box overlapping the stat badges
 *   - computed font size of visible text < MIN_PX
 *   - artwork image missing / failed to load
 *   - card aspect ratio != 1.4 (2.5 x 3.5)
 * Exit code 1 if any card fails. GAME_URL default http://localhost:8787/
 */
var fs = require('fs');
var path = require('path');
var CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
var URL = process.env.GAME_URL || 'http://localhost:8787/';
var MIN_PX = parseFloat(process.env.MIN_PX || '9');

(async function () {
  var puppeteer = (await import('puppeteer-core')).default;
  var browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  var page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });
  await page.goto(URL, { waitUntil: 'networkidle2' });
  var res = await page.evaluate(async function (MIN_PX) {
    var tiers = [
      { name: 'full', wrap: 'card-collection', args: [false, false, false] },
      { name: 'market', wrap: 'bank-card-slot', args: [true, false, false] },
      { name: 'hand', wrap: 'hand-card-wrapper', args: [true, false, false] },
      { name: 'field', wrap: 'battle-slot-droppable', args: [true, true, true] }
    ];
    var host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:1600px;z-index:99999;background:#000;display:flex;flex-wrap:wrap;gap:4px';
    document.body.appendChild(host);
    var fails = [], checked = 0, ratios = {};
    for (var t = 0; t < tiers.length; t++) {
      var T = tiers[t];
      host.innerHTML = ALL_CARDS.map(function (c) {
        return '<div class="' + T.wrap + '" style="position:relative;display:block">' + ui.renderCard.apply(ui, [c].concat(T.args)) + '</div>';
      }).join('');
      var imgs = [].slice.call(host.querySelectorAll('img.cv2-art'));
      await Promise.all(imgs.map(function (i) { i.loading = 'eager'; return i.decode().catch(function () {}); }));
      // Same pass the live game runs via MutationObserver (js/card-fit.js).
      if (window.CardFit) CardFit.fitAll(host);
      [].slice.call(host.querySelectorAll('.card.cv2')).forEach(function (el, idx) {
        checked++;
        var c = ALL_CARDS[idx], probs = [];
        var r = el.getBoundingClientRect();
        var ratio = +(r.height / r.width).toFixed(2);
        ratios[T.name] = Math.round(r.width) + 'x' + Math.round(r.height);
        if (Math.abs(ratio - 1.4) > 0.02) probs.push('ratio ' + ratio);
        var vis = function (e) { return e && e.offsetParent !== null && getComputedStyle(e).display !== 'none'; };
        var name = el.querySelector('.cv2-name');
        if (vis(name) && (name.scrollWidth > name.clientWidth + 1 || name.scrollHeight > name.clientHeight + 2)) probs.push('name-cut');
        ['.cv2-effect', '.cv2-flavor'].forEach(function (s) {
          var e = el.querySelector(s);
          if (vis(e) && e.scrollHeight > e.clientHeight + 2) probs.push(s.slice(5) + '-clamped');
        });
        var text = el.querySelector('.cv2-text'), stats = el.querySelector('.cv2-stats');
        if (vis(text) && stats) {
          var last = text.lastElementChild;
          while (last && !vis(last)) last = last.previousElementSibling;
          if (last) {
            var lb = last.getBoundingClientRect().bottom, st = stats.getBoundingClientRect().top;
            if (lb > st + 1) probs.push('text-under-stats ' + Math.round(lb - st) + 'px');
          }
        }
        el.querySelectorAll('.cv2-name,.cv2-effect,.cv2-flavor,.cv2-type,.cv2-cost,.cv2-stat-val').forEach(function (e) {
          if (vis(e)) { var fz = parseFloat(getComputedStyle(e).fontSize); if (fz < MIN_PX) probs.push(e.className.split(' ')[0] + ' ' + fz.toFixed(1) + 'px'); }
        });
        var img = el.querySelector('img.cv2-art');
        if (!img || !img.naturalWidth) probs.push('no-art');
        if (probs.length) fails.push(T.name + ' ' + c.id + ' "' + c.name + '": ' + probs.join(', '));
      });
    }
    host.remove();
    return { checked: checked, fails: fails, sizes: ratios };
  }, MIN_PX);
  await browser.close();
  var byKind = {};
  res.fails.forEach(function (f) { f.split(': ')[1].split(', ').forEach(function (k) { k = k.replace(/ [\d.]+px$/, '').replace(/ [\d.]+$/, ''); byKind[k] = (byKind[k] || 0) + 1; }); });
  console.log(JSON.stringify({ checked: res.checked, failing: res.fails.length, sizes: res.sizes, byKind: byKind, sample: res.fails.slice(0, 25), perTier: res.fails.reduce(function(a,f){var t=f.split(" ")[0];a[t]=(a[t]||0)+1;return a},{}), fullFails: res.fails.filter(function(f){return f.indexOf("full ")!==0}).filter(function(f,i){return i%25===0}) }, null, 1));
  process.exit(res.fails.length ? 1 : 0);
})().catch(function (e) { console.error(e); process.exit(2); });
