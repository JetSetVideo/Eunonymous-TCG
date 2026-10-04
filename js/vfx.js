/**
 * Synthopwars / Eunonymous-TCG Visual Effects Engine v2
 * Canvas particles, attack trails, spell projectiles, screen effects, DOM floats.
 * Loaded by index.html after shaders.js, before game.js.
 *
 * Rules this file guarantees:
 *  - Every overlay is pointer-events:none and never blocks input.
 *  - Every DOM node it creates is tracked and removed (see SynthVFX.stats()).
 *  - Frequent effects (attack, hit, damage number, death) finish in < 600 ms.
 *  - prefers-reduced-motion: no shake, no flying motion, fewer particles,
 *    fades only. Re-evaluated live if the OS setting changes.
 *  - Frame-rate independent (60/120/144 Hz look the same).
 *
 * Public API (backwards compatible): init, startLoop, stopLoop, spawnParticles,
 * spawnTrail, fireProjectile, screenFlash, screenShake, animateCardPlay,
 * showDamageFloat, showKeywordGlow, resize.
 * New: bindEngine(game) (auto when ui.game changes), hitImpact, deathBurst,
 * victoryBurst, defeatFade, turnPulse, stats, reducedMotion.
 */
var SynthVFX = (function() {
  'use strict';

  var canvas, ctx;
  var particles = [];
  var trails = [];
  var projectiles = [];
  var animFrame = null;
  var running = false;
  var lastTs = 0;
  var dirty = false;              // canvas has content that needs clearing
  var liveNodes = [];             // DOM nodes created by VFX still on the page
  var createdCount = 0;
  var boundGame = null;
  var shakeToken = 0;

  var rmQuery = (typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reducedMotion() {
    if (typeof document !== 'undefined' && document.body && document.body.classList.contains('reduced-motion')) return true;
    return !!(rmQuery && rmQuery.matches);
  }

  // ------------------------------------------------------- DOM node helper ---
  // Creates a fixed, non-interactive overlay node, tracks it, and guarantees
  // removal after `ttl` ms even if an animation never fires `finish`.
  function overlay(cssText, ttl, parent) {
    var el = document.createElement('div');
    el.className = 'svfx-node';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'position:fixed;pointer-events:none;' + cssText;
    (parent || document.body).appendChild(el);
    liveNodes.push(el);
    createdCount++;
    var done = false;
    el._svfxRemove = function() {
      if (done) return; done = true;
      if (el.parentNode) el.parentNode.removeChild(el);
      var i = liveNodes.indexOf(el);
      if (i >= 0) liveNodes.splice(i, 1);
    };
    setTimeout(el._svfxRemove, ttl + 50);
    return el;
  }

  function animateNode(el, frames, opts) {
    if (el.animate) {
      try {
        var a = el.animate(frames, opts);
        a.onfinish = el._svfxRemove || null;
        return a;
      } catch (e) {}
    }
    return null;
  }

  function centerOf(el) {
    if (!el || !el.getBoundingClientRect) return null;
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r };
  }

  // ---------------------------------------------------------------- Particle ---
  function Particle(x, y, opts) {
    this.x = x;
    this.y = y;
    this.vx = opts.vx !== undefined ? opts.vx : (Math.random() - 0.5) * 2;
    this.vy = opts.vy !== undefined ? opts.vy : -Math.random() * 3 - 1;
    this.life = opts.life || 40;
    this.maxLife = this.life;
    this.size = opts.size || 3;
    this.color = opts.color || '#ffd700';
    this.decay = opts.decay || 1;
    this.gravity = opts.gravity || 0;
    this.friction = opts.friction || 0.98;
    this.glow = opts.glow || false;
    this.type = opts.type || 'circle'; // circle, star, spark, ember, square
    this.rot = Math.random() * Math.PI;
    this.vr = (Math.random() - 0.5) * 0.3;
  }

  // k = frame-time scale (1.0 at 60 fps)
  Particle.prototype.update = function(k) {
    var fr = Math.pow(this.friction, k);
    this.vx *= fr;
    this.vy += this.gravity * k;
    this.vy *= fr;
    this.x += this.vx * k;
    this.y += this.vy * k;
    this.rot += this.vr * k;
    this.life -= this.decay * k;
    this.size *= Math.pow(0.98, k);
  };

  Particle.prototype.draw = function(ctx) {
    var alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    // shadowBlur is expensive; only for glow particles
    if (this.glow) { ctx.shadowBlur = 12; ctx.shadowColor = this.color; }
    ctx.fillStyle = this.color;
    if (this.type === 'star') {
      var outerR = this.size, innerR = this.size * 0.4;
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var r = i % 2 === 0 ? outerR : innerR;
        var angle = (i * Math.PI) / 5 - Math.PI / 2;
        var px = this.x + Math.cos(angle) * r;
        var py = this.y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'spark') {
      ctx.beginPath();
      ctx.moveTo(this.x - this.vx * 2.5, this.y - this.vy * 2.5);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(0.5, this.size);
      ctx.stroke();
    } else if (this.type === 'square') {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      var s = Math.max(0.5, this.size);
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0.4, this.size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  };

  // ------------------------------------------------------------------- Trail ---
  function Trail(x1, y1, x2, y2, opts) {
    this.x1 = x1; this.y1 = y1;
    this.x2 = x2; this.y2 = y2;
    this.life = opts.life || 20;
    this.maxLife = this.life;
    this.color = opts.color || '#ff2a6d';
    this.width = opts.width || 3;
    this.decay = opts.decay || 1;
  }
  Trail.prototype.update = function(k) {
    this.life -= this.decay * k;
    this.width *= Math.pow(0.94, k);
  };
  Trail.prototype.draw = function(ctx) {
    var p = Math.max(0, this.life / this.maxLife);
    // Leading edge sweeps from attacker to target during the first 35% of life
    var grow = Math.min(1, (1 - p) / 0.35 + 0.15);
    var ex = this.x1 + (this.x2 - this.x1) * grow;
    var ey = this.y1 + (this.y2 - this.y1) * grow;
    ctx.globalAlpha = p * 0.85;
    ctx.shadowBlur = 16;
    ctx.shadowColor = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.5, this.width);
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    // white hot core
    ctx.globalAlpha = p * 0.9;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(0.3, this.width * 0.35);
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  // -------------------------------------------------------------- Projectile ---
  function Projectile(fromX, fromY, toX, toY, opts) {
    this.x = fromX;
    this.y = fromY;
    this.targetX = toX;
    this.targetY = toY;
    this.speed = opts.speed || 8;
    this.life = 60;
    this.color = opts.color || '#00d9ff';
    this.size = opts.size || 6;
    this.trail = opts.trail !== false;
    this.trailPositions = [];
    this.done = false;
    var dx = toX - fromX, dy = toY - fromY;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    this.vx = (dx / dist) * this.speed;
    this.vy = (dy / dist) * this.speed;
  }
  Projectile.prototype.update = function(k) {
    if (this.done) return;
    if (this.trail) {
      this.trailPositions.push({ x: this.x, y: this.y });
      if (this.trailPositions.length > 8) this.trailPositions.shift();
    }
    var dx = this.targetX - this.x, dy = this.targetY - this.y;
    var remain = Math.sqrt(dx * dx + dy * dy);
    var step = this.speed * k;
    if (remain <= step + 2) { this.x = this.targetX; this.y = this.targetY; this.done = true; return; }
    this.x += this.vx * k;
    this.y += this.vy * k;
    this.life -= k;
    if (this.life <= 0) this.done = true;
  };
  Projectile.prototype.draw = function(ctx) {
    if (this.trail) {
      for (var i = 0; i < this.trailPositions.length; i++) {
        var f = i / this.trailPositions.length;
        ctx.globalAlpha = f * 0.5;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.trailPositions[i].x, this.trailPositions[i].y, this.size * (0.2 + f * 0.8), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 22;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  // -------------------------------------------------------------------- loop ---
  function init() {
    canvas = document.getElementById('vfx-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'vfx-canvas';
      document.body.appendChild(canvas);
    }
    // Always enforce non-blocking overlay styling
    canvas.style.position = 'fixed';
    canvas.style.left = '0'; canvas.style.top = '0';
    canvas.style.width = '100vw'; canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    if (!canvas.style.zIndex) canvas.style.zIndex = '998';
    canvas.setAttribute('aria-hidden', 'true');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    // Bind to each new GameEngine as soon as ui.game changes. Polled on a timer
    // (not rAF) so it also works while the tab is hidden / rAF is throttled.
    if (!init._poll) init._poll = setInterval(autoBind, 250);
    return true;
  }

  var dpr = 1;
  function resize() {
    if (!canvas) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function startLoop() {
    if (running) return;
    running = true;
    lastTs = 0;
    animFrame = requestAnimationFrame(loop);
  }

  function stopLoop() {
    running = false;
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  }

  function loop(ts) {
    if (!running) return;
    var dt = lastTs ? Math.min(50, ts - lastTs) : 16.67;
    lastTs = ts;
    var k = dt / 16.67;
    if (particles.length || trails.length || projectiles.length) {
      update(k);
      draw();
      dirty = true;
    } else if (dirty && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dirty = false;
    }
    animFrame = requestAnimationFrame(loop);
  }

  function update(k) {
    for (var i = particles.length - 1; i >= 0; i--) {
      particles[i].update(k);
      if (particles[i].life <= 0 || particles[i].size < 0.2) particles.splice(i, 1);
    }
    for (var j = trails.length - 1; j >= 0; j--) {
      trails[j].update(k);
      if (trails[j].life <= 0 || trails[j].width < 0.3) trails.splice(j, 1);
    }
    for (var m = projectiles.length - 1; m >= 0; m--) {
      projectiles[m].update(k);
      if (projectiles[m].done || projectiles[m].life <= 0) {
        var cb = projectiles[m].onComplete;
        projectiles.splice(m, 1);
        if (cb) { try { cb(); } catch (e) { console.warn('[vfx] projectile cb', e); } }
      }
    }
    var maxP = reducedMotion() ? 80 : 300;
    if (particles.length > maxP) particles.splice(0, particles.length - maxP);
    if (trails.length > 30) trails.splice(0, trails.length - 30);
    if (projectiles.length > 15) projectiles.splice(0, projectiles.length - 15);
  }

  function draw() {
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (var i = 0; i < trails.length; i++) trails[i].draw(ctx);
    for (var j = 0; j < projectiles.length; j++) projectiles[j].draw(ctx);
    for (var m = 0; m < particles.length; m++) particles[m].draw(ctx);
  }

  // ============================================================ PUBLIC API ===

  function spawnParticles(x, y, opts) {
    opts = opts || {};
    if (!isFinite(x) || !isFinite(y)) return;
    var count = opts.count || 15;
    if (reducedMotion()) count = Math.max(1, Math.round(count * 0.35));
    var type = opts.type || 'circle';
    var speed = opts.speed || 4;
    for (var i = 0; i < count; i++) {
      var vx, vy;
      if (opts.radial) {
        var ang = Math.random() * Math.PI * 2;
        var sp = speed * (0.4 + Math.random() * 0.8);
        vx = Math.cos(ang) * sp; vy = Math.sin(ang) * sp;
      } else {
        // a fixed opts.vx/vy is jittered per particle so bursts don't collapse into a line
        vx = opts.vx !== undefined ? opts.vx * (0.6 + Math.random() * 0.8) : (Math.random() - 0.5) * speed;
        vy = opts.vy !== undefined ? opts.vy * (0.6 + Math.random() * 0.8) : (Math.random() - 0.5) * speed - 2;
      }
      if (reducedMotion()) { vx *= 0.3; vy *= 0.3; }
      particles.push(new Particle(x, y, {
        vx: vx, vy: vy,
        life: opts.life || (20 + Math.random() * 30),
        size: opts.size || (2 + Math.random() * 4),
        color: opts.color || '#ffd700',
        glow: opts.glow !== false && count < 40,
        type: type,
        gravity: opts.gravity !== undefined ? opts.gravity : 0.05,
        friction: opts.friction || 0.97,
        decay: opts.decay || 1
      }));
    }
  }

  // Attack trail between two points (~280 ms) + spark burst at the endpoint
  function spawnTrail(x1, y1, x2, y2, opts) {
    opts = opts || {};
    var color = opts.color || '#ff2a6d';
    if (!reducedMotion()) {
      trails.push(new Trail(x1, y1, x2, y2, {
        color: color,
        width: opts.width || (3 + Math.random() * 3),
        life: opts.life || 17,
        decay: opts.decay || 1
      }));
    }
    spawnParticles(x2, y2, { count: 10, color: color, type: 'spark', life: 16, radial: true, speed: 6, gravity: 0 });
  }

  function fireProjectile(fromEl, toEl, opts) {
    opts = opts || {};
    var a = centerOf(fromEl), b = centerOf(toEl);
    if (!a || !b) { if (opts.onComplete) opts.onComplete(); return null; }
    var p = new Projectile(a.x, a.y, b.x, b.y, {
      color: opts.color || '#00d9ff',
      size: opts.size || 6,
      speed: reducedMotion() ? 60 : (opts.speed || 14),
      trail: opts.trail !== false
    });
    p.onComplete = opts.onComplete || null;
    projectiles.push(p);
    return p;
  }

  function screenFlash(color, duration, strength) {
    color = color || '#fff';
    duration = Math.min(duration || 200, 600);
    var peak = (strength || 0.3) * (reducedMotion() ? 0.4 : 1);
    var el = overlay('inset:0;z-index:9997;background:' + color + ';opacity:0;', duration);
    if (!animateNode(el, [{ opacity: peak }, { opacity: 0 }], { duration: duration, easing: 'ease-out' })) {
      el.style.transition = 'opacity ' + duration + 'ms ease-out';
      el.style.opacity = peak;
      requestAnimationFrame(function() { el.style.opacity = 0; });
    }
  }

  // Uses the individual `translate` property so it composes with (and never
  // clobbers) any CSS `transform` already on #battle-arena.
  function screenShake(intensity, duration) {
    if (reducedMotion()) return;
    intensity = Math.min(intensity || 5, 14);
    duration = Math.min(duration || 200, 450);
    var target = document.getElementById('battle-arena') || document.body;
    var token = ++shakeToken;
    var start = performance.now();
    function shake(now) {
      if (token !== shakeToken) return;               // a newer shake took over
      var elapsed = now - start;
      if (elapsed >= duration) { target.style.translate = ''; return; }
      var d = 1 - elapsed / duration;
      var x = (Math.random() - 0.5) * intensity * d * 2;
      var y = (Math.random() - 0.5) * intensity * d * 2;
      target.style.translate = x.toFixed(1) + 'px ' + y.toFixed(1) + 'px';
      requestAnimationFrame(shake);
    }
    requestAnimationFrame(shake);
  }

  // Card lands on the board: drop-in with a short overshoot (~320 ms)
  function animateCardPlay(cardEl) {
    if (!cardEl || !cardEl.animate) return;
    var frames = reducedMotion()
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ transform: 'translateY(-40px) scale(0.6)', opacity: 0, filter: 'brightness(2)' },
         { transform: 'translateY(4px) scale(1.06)', opacity: 1, offset: 0.65, filter: 'brightness(1.4)' },
         { transform: 'none', opacity: 1, filter: 'none' }];
    try { cardEl.animate(frames, { duration: 320, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' }); } catch (e) {}
  }

  var DMG_COLORS = { heal: '#05ffa1', magic: '#00d9ff', 'true': '#ffd700', poison: '#7cff2a', base: '#ff2a6d', overkill: '#ff6b35' };

  // Damage number: pops, holds, drifts up and fades — 560 ms total
  function showDamageFloat(x, y, amount, type, color) {
    if (!isFinite(x) || !isFinite(y)) return;
    var isHeal = type === 'heal';
    var n = Number(amount) || 0;
    var big = n >= 7, mid = n >= 4;
    var c = color || DMG_COLORS[type] || (big ? '#ff2a6d' : mid ? '#ffb36b' : '#fff');
    var size = big ? 2.3 : mid ? 1.85 : 1.45;
    var el = overlay(
      'left:' + x + 'px;top:' + y + 'px;z-index:10000;transform:translate(-50%,-50%);' +
      'font:900 ' + size + 'rem/1 "Orbitron","Rajdhani",system-ui,sans-serif;color:' + c + ';' +
      'letter-spacing:0.02em;white-space:nowrap;-webkit-text-stroke:1px rgba(0,0,0,0.65);' +
      'text-shadow:0 2px 0 #000,0 0 10px ' + c + ',0 0 22px ' + c + ';',
      560);
    el.className = 'svfx-node svfx-float';
    el.textContent = (isHeal ? '+' : '-') + amount;
    var frames = reducedMotion()
      ? [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }]
      : [{ opacity: 0, transform: 'translate(-50%,-30%) scale(0.5)' },
         { opacity: 1, transform: 'translate(-50%,-60%) scale(' + (big ? 1.35 : 1.15) + ')', offset: 0.18 },
         { opacity: 1, transform: 'translate(-50%,-70%) scale(1)', offset: 0.55 },
         { opacity: 0, transform: 'translate(-50%,-160%) scale(0.95)' }];
    animateNode(el, frames, { duration: 560, easing: 'cubic-bezier(0.2,0.8,0.3,1)', fill: 'forwards' });
    if (isHeal) spawnParticles(x, y, { count: 8, color: '#05ffa1', type: 'circle', life: 24, gravity: -0.04 });
    else spawnParticles(x, y, { count: big ? 12 : 6, color: c, type: 'spark', life: 18, radial: true, speed: big ? 7 : 5, gravity: 0 });
  }

  // Short ring + spark burst on the struck element (~380 ms)
  function hitImpact(targetEl, amount, color) {
    var p = centerOf(targetEl);
    if (!p) return;
    color = color || '#ff2a6d';
    var heavy = (amount || 0) >= 6;
    var d = Math.max(heavy ? 90 : 64, Math.min(p.r.width, p.r.height) * (heavy ? 1.1 : 0.8));
    var ring = overlay('left:' + p.x + 'px;top:' + p.y + 'px;width:' + d + 'px;height:' + d + 'px;' +
      'margin:' + (-d / 2) + 'px 0 0 ' + (-d / 2) + 'px;border-radius:50%;z-index:999;' +
      'border:4px solid ' + color + ';box-shadow:0 0 22px ' + color + ',inset 0 0 14px ' + color + ';opacity:0;', 380);
    animateNode(ring, reducedMotion()
      ? [{ opacity: 0.8 }, { opacity: 0 }]
      : [{ opacity: 0.95, transform: 'scale(0.3)' }, { opacity: 0, transform: 'scale(1.25)' }],
      { duration: 380, easing: 'ease-out', fill: 'forwards' });
    spawnParticles(p.x, p.y, { count: heavy ? 16 : 9, color: color, type: 'spark', life: 16, radial: true, speed: heavy ? 8 : 6, gravity: 0 });
    if (targetEl.animate && !reducedMotion()) {
      try {
        targetEl.animate([
          { translate: '0 0', filter: 'brightness(2.2) saturate(0.4)' },
          { translate: '-4px 0', offset: 0.25 },
          { translate: '3px 0', offset: 0.5 },
          { translate: '0 0', filter: 'none' }], { duration: 240, easing: 'ease-out' });
      } catch (e) {}
    }
    if (heavy) screenShake(6, 220);
  }

  // Creature/structure destroyed: shards + flash at card position (~520 ms)
  function deathBurst(cardEl, color) {
    var p = centerOf(cardEl);
    if (!p) return;
    color = color || '#ff2a6d';
    spawnParticles(p.x, p.y, { count: 22, color: color, type: 'square', life: 30, radial: true, speed: 6, gravity: 0.18, size: 5, glow: false });
    spawnParticles(p.x, p.y, { count: 10, color: '#ffffff', type: 'spark', life: 18, radial: true, speed: 9, gravity: 0 });
    var w = p.r.width, h = p.r.height;
    var el = overlay('left:' + p.r.left + 'px;top:' + p.r.top + 'px;width:' + w + 'px;height:' + h + 'px;z-index:999;' +
      'border-radius:8px;background:radial-gradient(circle,#fff 0%,' + color + ' 45%,transparent 75%);mix-blend-mode:screen;opacity:0;', 520);
    animateNode(el, reducedMotion()
      ? [{ opacity: 0.6 }, { opacity: 0 }]
      : [{ opacity: 0.9, transform: 'scale(0.9)' }, { opacity: 0.5, transform: 'scale(1.05) scaleY(0.3)', offset: 0.4 }, { opacity: 0, transform: 'scale(1.3) scaleY(0.02)' }],
      { duration: 520, easing: 'ease-in', fill: 'forwards' });
  }

  // Short edge glow at turn start; cyan = you, red = enemy (~550 ms)
  function turnPulse(isPlayer) {
    var c = isPlayer ? '0,217,255' : '255,42,109';
    var el = overlay('inset:0;z-index:996;box-shadow:inset 0 0 90px 10px rgba(' + c + ',0.55);opacity:0;', 550);
    animateNode(el, [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }], { duration: 550, easing: 'ease-out', fill: 'forwards' });
  }

  // Victory: gold flash + two confetti bursts (rare effect, ~1.4 s)
  function victoryBurst() {
    screenFlash('#ffd700', 450, 0.35);
    var w = window.innerWidth, h = window.innerHeight;
    var cols = ['#ffd700', '#00f5ff', '#ff2a6d', '#05ffa1', '#bc13fe'];
    for (var i = 0; i < cols.length; i++) {
      spawnParticles(w * 0.3, h * 0.55, { count: 14, color: cols[i], type: i % 2 ? 'square' : 'star', life: 70, vx: 4, vy: -9, gravity: 0.22, size: 5, glow: false });
      spawnParticles(w * 0.7, h * 0.55, { count: 14, color: cols[i], type: i % 2 ? 'star' : 'square', life: 70, vx: -4, vy: -9, gravity: 0.22, size: 5, glow: false });
    }
  }

  // Defeat: desaturating red vignette (~900 ms)
  function defeatFade() {
    var el = overlay('inset:0;z-index:9996;background:radial-gradient(ellipse at center,transparent 35%,rgba(120,0,20,0.55) 100%);opacity:0;', 900);
    animateNode(el, [{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
  }

  function showKeywordGlow(cardEl, keyword) {
    if (!cardEl || !keyword) return;
    var colors = {
      precision: '#9fb4c7', replicate: '#f92aff', infect: '#f92aff',
      transmute: '#c9822e', refine: '#c9822e',
      sacrament: '#b0203c', devotion: '#b0203c',
      overclock: '#7cff2a', adrenaline: '#7cff2a',
      bloom: '#1f9e6e', symbiosis: '#1f9e6e',
      drift: '#a48cff', manifest: '#a48cff',
      deploy: '#2f6fed', network: '#2f6fed',
      snare: '#4a1f5c', gambit: '#4a1f5c'
    };
    var kw = String(keyword).toLowerCase();
    var color = colors[kw] || '#ffd700';
    var glow = document.createElement('div');
    glow.className = 'kw-' + kw + '-fx svfx-node';
    glow.style.pointerEvents = 'none';
    cardEl.appendChild(glow);
    liveNodes.push(glow); createdCount++;
    var p = centerOf(cardEl);
    if (p) spawnParticles(p.x, p.y, { count: 10, color: color, type: 'star', life: 25, gravity: -0.03 });
    setTimeout(function() {
      if (glow.parentNode) glow.parentNode.removeChild(glow);
      var i = liveNodes.indexOf(glow); if (i >= 0) liveNodes.splice(i, 1);
    }, 900);
  }

  // =========================================================== engine bind ===
  var RARITY = { common: '#9ab', uncommon: '#8f8', rare: '#8af', epic: '#c6f', legendary: '#fd8', mythic: '#f8f' };
  function cardEl(card) {
    if (!card || !card.instanceId) return null;
    return document.querySelector('.card[data-instance="' + card.instanceId + '"]') ||
           document.querySelector('[data-instance="' + card.instanceId + '"]');
  }
  function hpEl(game, who) {
    if (who === game.player) return document.getElementById('player-hp-orb') || document.getElementById('player-hp');
    return document.getElementById('enemy-hp-orb') || document.getElementById('enemy-hp');
  }

  function autoBind() {
    try {
      // `ui` is a top-level const in index.html (global lexical scope, not window)
      if (typeof ui !== 'undefined' && ui && ui.game && ui.game !== boundGame) bindEngine(ui.game);
    } catch (e) {}
  }

  /** Subscribe to GameEngine events. Idempotent per game instance. */
  function bindEngine(game) {
    if (!game || typeof game.on !== 'function' || game.__vfxBound) return;
    game.__vfxBound = true;
    boundGame = game;

    // Attack swing: trail from attacker to the struck card / base.
    function trail(attacker, targetElm, rarity) {
      var a = centerOf(cardEl(attacker)), b = centerOf(targetElm);
      if (a && b) spawnTrail(a.x, a.y, b.x, b.y, { color: RARITY[rarity] || '#ff2a6d', width: 7 });
    }
    game.on('combatHit', function(d) {
      if (!d) return;
      var t = cardEl(d.target);
      trail(d.attacker, t, d.attacker && d.attacker.rarity);
      if (t) {
        hitImpact(t, d.damage, '#ff2a6d');
        if (d.damage > 0) {
          var p = centerOf(t);
          showDamageFloat(p.x, p.r.top + p.r.height * 0.3, d.damage, 'normal');
        }
      }
    });
    game.on('baseAttack', function(d) {
      if (!d) return;
      trail(d.attacker, hpEl(game, d.targetPlayer), d.attacker && d.attacker.rarity);
    });
    game.on('damage', function(d) {
      if (!d || !(d.amount > 0)) return;
      if (d.target === game.player || d.target === game.enemy) {
        var el = hpEl(game, d.target);
        hitImpact(el, d.amount, d.target === game.player ? '#ff2a6d' : '#ffb347');
        if (d.target === game.player && d.amount >= 5) screenFlash('#ff2a6d', 220, 0.25);
      }
    });
    game.on('heal', function(d) {
      if (!d || !(d.amount > 0)) return;
      var p = centerOf(hpEl(game, d.target));
      if (p) spawnParticles(p.x, p.y, { count: 10, color: '#05ffa1', type: 'circle', life: 26, gravity: -0.05 });
    });
    game.on('destroy', function(d) {
      if (!d || !d.card) return;
      deathBurst(cardEl(d.card), RARITY[d.card.rarity] || '#ff2a6d');
    });
    game.on('structureDestroyed', function(d) {
      if (!d || !d.structure) return;
      deathBurst(cardEl(d.structure), '#ff6b35');
      screenShake(7, 260);
    });
    game.on('bankStart', function(d) {
      if (d && d.player) turnPulse(d.player === game.player);
    });
    game.on('victory', function() { victoryBurst(); });
    game.on('defeat', function() { defeatFade(); });
  }

  function stats() {
    // prune any node removed by someone else (e.g. parent card re-rendered)
    for (var i = liveNodes.length - 1; i >= 0; i--) if (!liveNodes[i].isConnected) liveNodes.splice(i, 1);
    return {
      liveNodes: liveNodes.length,
      domNodes: document.querySelectorAll('.svfx-node').length,
      created: createdCount,
      particles: particles.length, trails: trails.length, projectiles: projectiles.length,
      reducedMotion: reducedMotion(),
      bound: !!boundGame
    };
  }

  return {
    init: init,
    startLoop: startLoop,
    stopLoop: stopLoop,
    spawnParticles: spawnParticles,
    spawnTrail: spawnTrail,
    fireProjectile: fireProjectile,
    screenFlash: screenFlash,
    screenShake: screenShake,
    animateCardPlay: animateCardPlay,
    showDamageFloat: showDamageFloat,
    showKeywordGlow: showKeywordGlow,
    hitImpact: hitImpact,
    deathBurst: deathBurst,
    turnPulse: turnPulse,
    victoryBurst: victoryBurst,
    defeatFade: defeatFade,
    bindEngine: bindEngine,
    reducedMotion: reducedMotion,
    stats: stats,
    resize: resize
  };
})();

if (typeof module !== 'undefined') {
  module.exports = { SynthVFX };
}
