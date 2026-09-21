/**
 * Synthopwars Visual Effects Engine v1.0
 * Particle systems, attack trails, spell projectiles, screen effects, 3D card transforms
 * Consumed by index.html after shaders.js but before game.js
 */
var SynthVFX = (function() {
  'use strict';

  var canvas, ctx;
  var particles = [];
  var trails = [];
  var projectiles = [];
  var screenEffects = [];
  var animFrame = null;
  var running = false;

  // Particle class
  function Particle(x, y, opts) {
    this.x = x;
    this.y = y;
    this.vx = opts.vx || (Math.random() - 0.5) * 2;
    this.vy = opts.vy || -Math.random() * 3 - 1;
    this.life = opts.life || 40;
    this.maxLife = this.life;
    this.size = opts.size || 3;
    this.color = opts.color || '#ffd700';
    this.decay = opts.decay || 1;
    this.gravity = opts.gravity || 0;
    this.friction = opts.friction || 0.98;
    this.glow = opts.glow || false;
    this.type = opts.type || 'circle'; // circle, star, spark, ember
  }

  Particle.prototype.update = function() {
    this.vx *= this.friction;
    this.vy += this.gravity;
    this.vy *= this.friction;
    this.x += this.vx;
    this.y += this.vy;
    this.life -= this.decay;
    this.size *= 0.98;
  };

  Particle.prototype.draw = function(ctx) {
    var alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    if (this.glow) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = this.color;
    }
    ctx.fillStyle = this.color;
    if (this.type === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'star') {
      var spikes = 5;
      var outerR = this.size;
      var innerR = this.size * 0.4;
      ctx.beginPath();
      for (var i = 0; i < spikes * 2; i++) {
        var r = i % 2 === 0 ? outerR : innerR;
        var angle = (i * Math.PI) / spikes - Math.PI / 2;
        var px = this.x + Math.cos(angle) * r;
        var py = this.y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'spark') {
      ctx.beginPath();
      ctx.moveTo(this.x - this.vx * 2, this.y - this.vy * 2);
      ctx.lineTo(this.x, this.y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(0.5, this.size);
      ctx.stroke();
    } else if (this.type === 'ember') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0.3, this.size), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  };

  // Trail class (attack slash trail)
  function Trail(x1, y1, x2, y2, opts) {
    this.x1 = x1; this.y1 = y1;
    this.x2 = x2; this.y2 = y2;
    this.life = opts.life || 20;
    this.maxLife = this.life;
    this.color = opts.color || '#ff2a6d';
    this.width = opts.width || 3;
    this.decay = opts.decay || 1;
  }

  Trail.prototype.update = function() {
    this.life -= this.decay;
    this.width *= 0.94;
  };

  Trail.prototype.draw = function(ctx) {
    var alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha * 0.7;
    ctx.shadowBlur = 20;
    ctx.shadowColor = this.color;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = Math.max(0.5, this.width);
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  };

  // Projectile class (spell bolt)
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
    // Calculate direction
    var dx = toX - fromX;
    var dy = toY - fromY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    this.vx = (dx / dist) * this.speed;
    this.vy = (dy / dist) * this.speed;
  }

  Projectile.prototype.update = function() {
    if (this.done) return;
    if (this.trail) {
      this.trailPositions.push({ x: this.x, y: this.y });
      if (this.trailPositions.length > 8) this.trailPositions.shift();
    }
    this.x += this.vx;
    this.y += this.vy;
    var dx = this.x - this.targetX;
    var dy = this.y - this.targetY;
    if (Math.sqrt(dx * dx + dy * dy) < 10) {
      this.done = true;
    }
    this.life--;
    if (this.life <= 0) this.done = true;
  };

  Projectile.prototype.draw = function(ctx) {
    // Draw trail
    if (this.trail) {
      for (var i = 0; i < this.trailPositions.length; i++) {
        var alpha = (i / this.trailPositions.length) * 0.5;
        var size = this.size * (0.2 + (i / this.trailPositions.length) * 0.8);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.trailPositions[i].x, this.trailPositions[i].y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Draw bolt
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 25;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  };

  function init() {
    canvas = document.getElementById('vfx-canvas');
    if (!canvas) {
      // Create if missing
      canvas = document.createElement('canvas');
      canvas.id = 'vfx-canvas';
      canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:998;width:100vw;height:100vh';
      document.body.appendChild(canvas);
    }
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    return true;
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function startLoop() {
    if (running) return;
    running = true;
    loop();
  }

  function stopLoop() {
    running = false;
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  }

  function loop() {
    if (!running) return;
    update();
    draw();
    animFrame = requestAnimationFrame(loop);
  }

  function update() {
    // Update particles
    for (var i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      if (particles[i].life <= 0 || particles[i].size < 0.2) {
        particles.splice(i, 1);
      }
    }
    // Update trails
    for (var j = trails.length - 1; j >= 0; j--) {
      trails[j].update();
      if (trails[j].life <= 0 || trails[j].width < 0.3) {
        trails.splice(j, 1);
      }
    }
    // Update projectiles
    for (var k = projectiles.length - 1; k >= 0; k--) {
      projectiles[k].update();
      if (projectiles[k].done || projectiles[k].life <= 0) {
        if (projectiles[k].onComplete) projectiles[k].onComplete();
        projectiles.splice(k, 1);
      }
    }
    // Cap counts
    if (particles.length > 300) particles.splice(0, particles.length - 300);
    if (trails.length > 30) trails.splice(0, trails.length - 30);
    if (projectiles.length > 15) projectiles.splice(0, projectiles.length - 15);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw trails (below particles)
    trails.forEach(function(t) { t.draw(ctx); });
    // Draw projectiles
    projectiles.forEach(function(p) { p.draw(ctx); });
    // Draw particles (on top)
    particles.forEach(function(p) { p.draw(ctx); });
  }

  // === PUBLIC API ===

  // Spawn particles at a point
  function spawnParticles(x, y, opts) {
    opts = opts || {};
    var count = opts.count || 15;
    var color = opts.color || '#ffd700';
    var type = opts.type || 'circle';
    for (var i = 0; i < count; i++) {
      particles.push(new Particle(x, y, {
        vx: opts.vx || (Math.random() - 0.5) * 4,
        vy: opts.vy || (Math.random() - 0.5) * 4 - 2,
        life: opts.life || (20 + Math.random() * 30),
        size: opts.size || (2 + Math.random() * 4),
        color: opts.color || color,
        glow: opts.glow !== false,
        type: type,
        gravity: opts.gravity || 0.05,
        friction: opts.friction || 0.97,
        decay: opts.decay || 1
      }));
    }
  }

  // Spawn an attack trail between two points
  function spawnTrail(x1, y1, x2, y2, opts) {
    opts = opts || {};
    trails.push(new Trail(x1, y1, x2, y2, {
      color: opts.color || '#ff2a6d',
      width: opts.width || (3 + Math.random() * 3),
      life: opts.life || 15,
      decay: opts.decay || 0.8
    }));
    // Also spawn impact particles at endpoint
    spawnParticles(x2, y2, {
      count: 8,
      color: opts.color || '#ff2a6d',
      type: 'spark',
      life: 15,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6
    });
  }

  // Fire a spell projectile
  function fireProjectile(fromEl, toEl, opts) {
    opts = opts || {};
    var fromRect = fromEl.getBoundingClientRect();
    var toRect = toEl.getBoundingClientRect();
    var fromX = fromRect.left + fromRect.width / 2;
    var fromY = fromRect.top + fromRect.height / 2;
    var toX = toRect.left + toRect.width / 2;
    var toY = toRect.top + toRect.height / 2;
    var p = new Projectile(fromX, fromY, toX, toY, {
      color: opts.color || '#00d9ff',
      size: opts.size || 6,
      speed: opts.speed || 10,
      trail: opts.trail !== false
    });
    p.onComplete = opts.onComplete || null;
    projectiles.push(p);
    return p;
  }

  // Screen flash
  function screenFlash(color, duration) {
    color = color || '#fff';
    duration = duration || 200;
    var flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;inset:0;z-index:9997;pointer-events:none;background:' + color + ';opacity:0.3;';
    document.body.appendChild(flash);
    var startTime = Date.now();
    function fade() {
      var elapsed = Date.now() - startTime;
      var progress = Math.min(1, elapsed / duration);
      flash.style.opacity = 0.3 * (1 - progress);
      if (progress < 1) requestAnimationFrame(fade);
      else flash.remove();
    }
    fade();
  }

  // Screen shake
  function screenShake(intensity, duration) {
    intensity = intensity || 5;
    duration = duration || 200;
    var target = document.getElementById('battle-arena') || document.body;
    var startTime = Date.now();
    function shake() {
      var elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        target.style.transform = '';
        return;
      }
      var decay = 1 - (elapsed / duration);
      var x = (Math.random() - 0.5) * intensity * decay * 2;
      var y = (Math.random() - 0.5) * intensity * decay * 2;
      target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
      requestAnimationFrame(shake);
    }
    shake();
  }

  // Card entrance animation (fly-in from deck)
  function animateCardPlay(cardEl) {
    if (!cardEl) return;
    cardEl.style.transition = 'none';
    cardEl.style.transform = 'scale(0.3) translateY(-100px)';
    cardEl.style.opacity = '0';
    cardEl.offsetHeight; // trigger reflow
    cardEl.style.transition = 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease';
    cardEl.style.transform = 'scale(1) translateY(0)';
    cardEl.style.opacity = '1';
    setTimeout(function() {
      cardEl.style.transition = '';
    }, 400);
  }

  // Damage float number (enhanced version of ui.showDamageFloat)
  function showDamageFloat(x, y, amount, type, color) {
    var float = document.createElement('div');
    float.className = 'dmg-float';
    var cls = '';
    if (type === 'heal') cls = 'dmg-heal';
    else if (amount >= 7) cls = 'dmg-critical';
    else if (amount >= 4) cls = 'dmg-high';
    if (cls) float.classList.add(cls);
    float.style.left = (x - 15) + 'px';
    float.style.top = (y - 10) + 'px';
    var icon = type === 'heal' ? '+' : '-';
    float.textContent = icon + amount;
    float.style.color = color || (type === 'heal' ? '#05ffa1' : type === 'magic' ? '#00d9ff' : type === 'true' ? '#ffd700' : type === 'poison' ? '#05ffa1' : '#fff');
    document.body.appendChild(float);
    // Also spawn particles
    if (type !== 'heal') {
      spawnParticles(x, y, { count: 6, color: float.style.color, type: 'spark', life: 20 });
    } else {
      spawnParticles(x, y, { count: 8, color: '#05ffa1', type: 'circle', life: 25, gravity: -0.02 });
    }
    setTimeout(function() { float.remove(); }, 1200);
  }

  // Keyword activation glow
  function showKeywordGlow(cardEl, keyword) {
    if (!cardEl) return;
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
    var color = colors[keyword.toLowerCase()] || '#ffd700';
    var glow = document.createElement('div');
    glow.className = 'kw-' + keyword.toLowerCase() + '-fx';
    cardEl.appendChild(glow);
    // Also spawn particles
    var rect = cardEl.getBoundingClientRect();
    spawnParticles(rect.left + rect.width/2, rect.top + rect.height/2, {
      count: 10, color: color, type: 'star', life: 25, gravity: -0.03
    });
    setTimeout(function() { if (glow.parentNode) glow.remove(); }, 1000);
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
    resize: resize
  };
})();

if (typeof module !== 'undefined') {
  module.exports = { SynthVFX };
}
