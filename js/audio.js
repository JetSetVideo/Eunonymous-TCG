/**
 * Synthopwars / Eunonymous-TCG Audio Engine (v2)
 * 100% procedural Web Audio — no asset files.
 *
 * Signal chain:
 *   voice gain -> sfxGain --\
 *                            masterGain -> headroom -> compressor -> limiter -> destination
 *   music pad  -> musicGain-/
 *
 * Public API (unchanged, backwards compatible):
 *   audio.init(), audio.play(name), audio.setVolume(type, v), audio.applySettings(),
 *   audio.settings {master, music, sfx}, audio.startMusic(), audio.stopMusic()
 * New (optional):
 *   audio.bindEngine(game)  — subscribe to GameEngine events for context-aware SFX.
 *                              Called automatically when `ui.game` changes.
 *   audio.unlock()          — resume the AudioContext (auto on first user gesture).
 *   audio.has(name)         — true if a sound name is implemented.
 * See docs/AUDIO_VFX.md for the full sound list.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.initialized = false;
    this.settings = { master: 1.0, music: 0.6, sfx: 0.8 };
    this.musicPlaying = false;
    this.musicNodes = [];
    this._musicTimer = null;
    this._musicStep = 0;
    this._noiseBuf = null;
    this._lastPlayed = {};     // name -> ctx time (anti-stacking)
    this._familyAt = {};       // family -> performance.now() of last specific sound
    this._pending = [];        // generic sounds deferred one microtask
    this._activeVoices = 0;
    this._boundGame = null;
    this._unlocked = false;
    this._installUnlock();
  }

  // ---------------------------------------------------------------- setup ---
  _hasGesture() {
    if (this._unlocked) return true;
    try {
      if (navigator.userActivation) return navigator.userActivation.hasBeenActive;
    } catch (e) {}
    return true; // older browsers: assume ok, resume() will handle it
  }

  _installUnlock() {
    if (typeof window === 'undefined' || !window.addEventListener) return;
    const self = this;
    const evs = ['pointerdown', 'keydown', 'touchend', 'mousedown'];
    function onGesture() {
      self._unlocked = true;
      self.unlock();
      if (self.ctx && self.ctx.state === 'running') {
        evs.forEach(function (ev) { window.removeEventListener(ev, onGesture, true); });
      }
    }
    evs.forEach(function (ev) { window.addEventListener(ev, onGesture, true); });
    // Bind to each new GameEngine promptly (catches the first turn's bankStart).
    setInterval(function () { self._maybeAutoBind(); }, 250);
    document.addEventListener('visibilitychange', function () {
      if (!self.ctx) return;
      if (document.hidden) { self._stopMusicTimer(); }
      else if (self.musicPlaying) { self._scheduleMusic(); }
    });
  }

  /** Resume (or lazily create) the AudioContext. Safe to call any time. */
  unlock() {
    if (!this.initialized) {
      if (!this._hasGesture()) return;
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      const self = this;
      try {
        this.ctx.resume().then(function () {
          if (self.musicPlaying) self._scheduleMusic();
        }).catch(function () {});
      } catch (e) {}
    } else if (this.musicPlaying) {
      this._scheduleMusic();
    }
  }

  init() {
    if (this.initialized) return;
    const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return;
    // Do not create the context before a user gesture — Chrome would create it
    // suspended and log an autoplay warning. unlock() will call init() later.
    if (!this._hasGesture()) return;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const c = this.ctx;
    this.masterGain = c.createGain();
    this.musicGain = c.createGain();
    this.sfxGain = c.createGain();
    // Headroom + bus compressor + brickwall-ish limiter => no clipping when
    // many SFX overlap (barrage, combos, AI turn bursts).
    this._headroom = c.createGain();
    this._headroom.gain.value = 0.7;
    this._comp = c.createDynamicsCompressor();
    this._comp.threshold.value = -18;
    this._comp.knee.value = 8;
    this._comp.ratio.value = 4;
    this._comp.attack.value = 0.004;
    this._comp.release.value = 0.18;
    this._limiter = c.createDynamicsCompressor();
    this._limiter.threshold.value = -3;
    this._limiter.knee.value = 0;
    this._limiter.ratio.value = 20;
    this._limiter.attack.value = 0.001;
    this._limiter.release.value = 0.08;

    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this._headroom);
    this._headroom.connect(this._comp);
    this._comp.connect(this._limiter);
    this._limiter.connect(c.destination);
    this.initialized = true;
    this.applySettings(true);
  }

  applySettings(immediate) {
    if (!this.initialized) return;
    const s = this.settings || {};
    const clamp = function (v, d) { v = Number(v); return isFinite(v) ? Math.max(0, Math.min(1, v)) : d; };
    const t = this.ctx.currentTime;
    const set = function (param, v) {
      if (immediate === true) { param.value = v; return; }
      param.cancelScheduledValues(t);
      param.setTargetAtTime(v, t, 0.02); // smooth, no zipper clicks
    };
    set(this.masterGain.gain, clamp(s.master, 1));
    set(this.musicGain.gain, clamp(s.music, 0.6));
    set(this.sfxGain.gain, clamp(s.sfx, 0.8));
  }

  setVolume(type, value) {
    this.settings[type] = Math.max(0, Math.min(1, Number(value) || 0));
    this.applySettings();
  }

  has(name) { return !!AudioEngine.SOUNDS[name]; }

  // ------------------------------------------------------------- dispatch ---
  /**
   * Play a named sound. Unknown names are ignored silently.
   * Generic UI calls ('play', 'damage', 'click') are deferred one microtask so
   * that a more specific engine-driven sound (e.g. 'play_spell', 'buy',
   * 'base_hit') fired in the same tick can replace them instead of stacking.
   */
  play(type, opts) {
    this._maybeAutoBind();
    if (!AudioEngine.SOUNDS[type]) return;
    const fam = AudioEngine.GENERIC_FAMILY[type];
    if (fam && this._boundGame) {
      const self = this;
      this._pending.push({ type: type, fam: fam, opts: opts });
      if (this._pending.length === 1) {
        const run = function () { self._flushPending(); };
        if (typeof queueMicrotask === 'function') queueMicrotask(run); else Promise.resolve().then(run);
      }
      return;
    }
    this._playNow(type, opts);
  }

  _flushPending() {
    const list = this._pending; this._pending = [];
    const now = this._now();
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      const at = this._familyAt[p.fam];
      if (at !== undefined && now - at < 160) continue; // replaced by specific sound
      this._playNow(p.type, p.opts);
    }
  }

  _now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

  _playNow(type, opts) {
    const def = AudioEngine.SOUNDS[type];
    if (!def) return;
    if (def.fam) this._familyAt[def.fam] = this._now();
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') { this.unlock(); if (this.ctx.state !== 'running') return; }
    if (this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.005;
    // Anti-stacking: identical sound re-triggered inside its min gap is dropped.
    const last = this._lastPlayed[type];
    const gap = def.gap !== undefined ? def.gap : 0.045;
    if (last !== undefined && t - last < gap) return;
    // Voice cap: under heavy load drop low-priority sounds first.
    if (this._activeVoices >= 24 && !def.prio) return;
    this._lastPlayed[type] = t;
    const voice = this.ctx.createGain();
    voice.gain.value = def.vol !== undefined ? def.vol : 1;
    voice.connect(this.sfxGain);
    this._activeVoices++;
    const self = this;
    const dur = def.dur || 0.5;
    setTimeout(function () {
      self._activeVoices = Math.max(0, self._activeVoices - 1);
      try { voice.disconnect(); } catch (e) {}
    }, (dur + 0.3) * 1000);
    try {
      this[def.fn](t, voice, dur, opts || {});
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[audio] ' + type + ' failed', e);
    }
  }

  // ------------------------------------------------------ engine binding ---
  _maybeAutoBind() {
    try {
      // `ui` is a top-level const in index.html (global lexical scope).
      if (typeof ui !== 'undefined' && ui && ui.game && ui.game !== this._boundGame) this.bindEngine(ui.game);
    } catch (e) {}
  }

  /** Subscribe to GameEngine events for context-aware sounds. Idempotent per game. */
  bindEngine(game) {
    if (!game || typeof game.on !== 'function' || game.__audioBound) return;
    game.__audioBound = true;
    this._boundGame = game;
    const self = this;
    const isMe = function (p) { return p && p === game.player; };
    game.on('buyCard', function (d) { if (d && isMe(d.player)) self._playNow('buy'); });
    game.on('playCard', function (d) {
      const type = d && d.card && d.card.type;
      const map = { Creature: 'play_creature', Spell: 'play_spell', Action: 'play_spell', Structure: 'play_structure',
        Trap: 'play_trap', Gear: 'gear_equip', Conspiracy: 'play_trap', Role: 'play_structure' };
      self._playNow(map[type] || 'play_creature');
    });
    game.on('combatHit', function (d) {
      const dmg = (d && d.damage) || 0;
      setTimeout(function () { self._playNow(dmg >= 6 ? 'hit_heavy' : 'hit'); }, 90);
    });
    game.on('baseAttack', function () { self._playNow('attack'); });
    game.on('damage', function (d) {
      if (!d || !(d.amount > 0)) return;
      if (d.target === game.player || d.target === game.enemy) {
        self._playNow(d.target === game.player ? 'base_hit_player' : 'base_hit');
      }
    });
    game.on('destroy', function () { self._playNow('death'); });
    game.on('structureDestroyed', function () { self._playNow('structure_destroyed'); });
    game.on('heal', function () { self._playNow('heal'); });
    game.on('bankStart', function (d) {
      if (!d || !d.player) return;
      self._playNow(isMe(d.player) ? 'turn_player' : 'turn_enemy');
    });
    game.on('error', function (d) {
      const m = d && d.message ? String(d.message) : '';
      self._playNow(/mana|power/i.test(m) ? 'no_mana' : 'error');
    });
  }

  // ------------------------------------------------------------ helpers ---
  _noiseBuffer() {
    if (this._noiseBuf) return this._noiseBuf;
    const len = Math.floor(this.ctx.sampleRate * 1.0);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._noiseBuf = buf;
    return buf;
  }
  // kept for backwards compatibility with any external caller
  _createNoiseBuffer() { return this._noiseBuffer(); }

  /** Envelope: 0 -> peak in `a` seconds, exponential decay to silence at t+dur. */
  _env(param, t, peak, a, dur) {
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(peak, t + Math.max(0.001, a));
    param.exponentialRampToValueAtTime(0.0001, t + Math.max(a + 0.01, dur));
  }

  /** Oscillator voice. o: {type, f, to, glide, peak, a, detune, filter:{type,f,to,Q}} */
  _tone(t, dest, dur, o) {
    const c = this.ctx;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t + (o.glide || dur));
    if (o.detune) osc.detune.setValueAtTime(o.detune, t);
    this._env(g.gain, t, o.peak !== undefined ? o.peak : 0.3, o.a || 0.004, dur);
    let node = osc;
    if (o.filter) {
      const f = c.createBiquadFilter();
      f.type = o.filter.type || 'lowpass';
      f.frequency.setValueAtTime(o.filter.f, t);
      if (o.filter.to) f.frequency.exponentialRampToValueAtTime(o.filter.to, t + dur);
      if (o.filter.Q) f.Q.setValueAtTime(o.filter.Q, t);
      osc.connect(f); node = f;
    }
    node.connect(g); g.connect(dest);
    osc.start(t); osc.stop(t + dur + 0.02);
    return osc;
  }

  /** Filtered noise burst. o: {ftype, f, to, Q, peak, a} */
  _noise(t, dest, dur, o) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this._noiseBuffer();
    const f = c.createBiquadFilter();
    f.type = o.ftype || 'bandpass';
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    f.Q.setValueAtTime(o.Q || 1, t);
    const g = c.createGain();
    this._env(g.gain, t, o.peak !== undefined ? o.peak : 0.3, o.a || 0.002, dur);
    src.connect(f); f.connect(g); g.connect(dest);
    const off = Math.random() * Math.max(0, 0.95 - dur);
    src.start(t, off); src.stop(t + dur + 0.02);
    return src;
  }

  _notes(t, dest, list, o) {
    // list: [[freq, startOffset, dur], ...]
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      this._tone(t + n[1], dest, n[2], Object.assign({}, o, { f: n[0] }));
    }
  }

  // ------------------------------------------------------------ UI sounds ---
  _click(t, out) {
    this._tone(t, out, 0.045, { type: 'triangle', f: 2400, to: 1500, peak: 0.16, a: 0.001 });
    this._noise(t, out, 0.02, { ftype: 'highpass', f: 5000, peak: 0.05 });
  }
  _hover(t, out) {
    this._tone(t, out, 0.06, { type: 'sine', f: 1800, to: 2200, peak: 0.04 });
  }
  _buzz(t, out) { // generic error: two low detuned blips ("nuh-uh")
    const lp = { type: 'lowpass', f: 1400 };
    this._tone(t, out, 0.08, { type: 'square', f: 196, peak: 0.12, filter: lp });
    this._tone(t, out, 0.08, { type: 'square', f: 203, peak: 0.08, filter: lp });
    this._tone(t + 0.1, out, 0.12, { type: 'square', f: 147, peak: 0.12, filter: lp });
    this._tone(t + 0.1, out, 0.12, { type: 'square', f: 152, peak: 0.08, filter: lp });
  }
  _noMana(t, out) { // not enough mana/power: deflating "power-down" sweep + blip
    this._tone(t, out, 0.22, { type: 'sawtooth', f: 520, to: 140, peak: 0.12, filter: { type: 'lowpass', f: 1800, to: 300 } });
    this._tone(t + 0.02, out, 0.18, { type: 'sine', f: 330, to: 110, peak: 0.14 });
  }

  // ---------------------------------------------------------- card sounds ---
  _cardSlap(t, out, peak) {
    this._noise(t, out, 0.06, { ftype: 'bandpass', f: 2200, to: 900, Q: 0.8, peak: peak || 0.28 });
    this._tone(t, out, 0.12, { type: 'sine', f: 150, to: 60, peak: (peak || 0.28) * 1.1 });
  }
  _thud(t, out) { this._cardSlap(t, out, 0.3); }               // generic 'play'
  _buy(t, out) { // credit chip: two bright notes + shimmer
    this._notes(t, out, [[1319, 0, 0.12], [1976, 0.06, 0.22]], { type: 'triangle', peak: 0.16 });
    this._tone(t + 0.06, out, 0.2, { type: 'sine', f: 3951, peak: 0.04 });
    this._noise(t, out, 0.12, { ftype: 'highpass', f: 6000, peak: 0.05 });
  }
  _playCreature(t, out) { // slap + rising "power-up" growl
    this._cardSlap(t, out, 0.26);
    this._tone(t + 0.03, out, 0.26, { type: 'sawtooth', f: 110, to: 330, glide: 0.2, peak: 0.13, filter: { type: 'lowpass', f: 600, to: 2400, Q: 6 } });
    this._tone(t + 0.03, out, 0.26, { type: 'square', f: 55, to: 110, glide: 0.2, peak: 0.08, filter: { type: 'lowpass', f: 400 } });
  }
  _playSpell(t, out) { // light slap + sparkling arpeggio
    this._noise(t, out, 0.05, { ftype: 'highpass', f: 3000, peak: 0.1 });
    this._notes(t, out, [[784, 0.0, 0.22], [1175, 0.05, 0.22], [1568, 0.1, 0.25], [2349, 0.15, 0.3]], { type: 'triangle', peak: 0.11 });
    this._noise(t + 0.05, out, 0.3, { ftype: 'bandpass', f: 4000, to: 9000, Q: 2, peak: 0.05 });
  }
  _playStructure(t, out) { // heavy deploy: sub thud + metallic clank
    this._tone(t, out, 0.32, { type: 'sine', f: 95, to: 42, peak: 0.36 });
    this._noise(t, out, 0.1, { ftype: 'lowpass', f: 1200, to: 200, peak: 0.25 });
    this._tone(t + 0.06, out, 0.18, { type: 'square', f: 330, peak: 0.07, filter: { type: 'bandpass', f: 1300, Q: 9 } });
    this._tone(t + 0.06, out, 0.22, { type: 'square', f: 467, peak: 0.05, filter: { type: 'bandpass', f: 2100, Q: 9 } });
  }
  _playTrap(t, out) { // hushed face-down set: soft slap + low click
    this._noise(t, out, 0.05, { ftype: 'bandpass', f: 1500, Q: 1, peak: 0.12 });
    this._tone(t + 0.04, out, 0.08, { type: 'square', f: 180, to: 90, peak: 0.07, filter: { type: 'lowpass', f: 900 } });
  }
  _whoosh(t, out, dur) { // draw
    this._noise(t, out, dur, { ftype: 'bandpass', f: 900, to: 3200, Q: 1.2, peak: 0.08, a: 0.04 });
  }
  _chime(t, out) { this._playSpell(t, out); }                  // 'spell'
  _snap(t, out) {                                              // 'trap' (trigger)
    this._noise(t, out, 0.04, { ftype: 'highpass', f: 2500, peak: 0.3 });
    this._tone(t + 0.02, out, 0.22, { type: 'square', f: 240, to: 60, peak: 0.13, filter: { type: 'lowpass', f: 1500 } });
    this._tone(t + 0.02, out, 0.15, { type: 'sine', f: 1200, to: 600, peak: 0.07 });
  }

  // -------------------------------------------------------- combat sounds ---
  _slash(t, out) { // attack swing: rising filtered noise whoosh + saw dive
    this._noise(t, out, 0.17, { ftype: 'bandpass', f: 700, to: 3800, Q: 1.5, peak: 0.22, a: 0.03 });
    this._tone(t, out, 0.15, { type: 'sawtooth', f: 420, to: 110, peak: 0.07, filter: { type: 'lowpass', f: 2000 } });
  }
  _hit(t, out, dur, heavy) {
    this._noise(t, out, heavy ? 0.14 : 0.09, { ftype: 'lowpass', f: heavy ? 2600 : 1800, to: 200, peak: heavy ? 0.36 : 0.28 });
    this._tone(t, out, heavy ? 0.24 : 0.15, { type: 'sine', f: heavy ? 150 : 190, to: 45, peak: heavy ? 0.4 : 0.3 });
    if (heavy) this._tone(t, out, 0.12, { type: 'square', f: 90, to: 40, peak: 0.1, filter: { type: 'lowpass', f: 600 } });
  }
  _hitHeavy(t, out, dur) { this._hit(t, out, dur, true); }
  _impact(t, out) { // generic 'damage'
    this._noise(t, out, 0.1, { ftype: 'lowpass', f: 1200, to: 150, peak: 0.25 });
    this._tone(t, out, 0.14, { type: 'sine', f: 140, to: 50, peak: 0.2 });
  }
  _baseHit(t, out) { // enemy base hit: satisfying boom + glassy crack
    this._tone(t, out, 0.45, { type: 'sine', f: 110, to: 32, peak: 0.45 });
    this._noise(t, out, 0.3, { ftype: 'lowpass', f: 3000, to: 120, peak: 0.32 });
    this._noise(t + 0.01, out, 0.12, { ftype: 'highpass', f: 5000, peak: 0.08 });
  }
  _baseHitPlayer(t, out) { // your base hit: boom + short alarm tritone
    this._tone(t, out, 0.4, { type: 'sine', f: 90, to: 30, peak: 0.42 });
    this._noise(t, out, 0.25, { ftype: 'lowpass', f: 2000, to: 100, peak: 0.28 });
    const lp = { type: 'lowpass', f: 2200 };
    this._tone(t + 0.04, out, 0.14, { type: 'square', f: 622, peak: 0.06, filter: lp });
    this._tone(t + 0.04, out, 0.14, { type: 'square', f: 880, peak: 0.05, filter: lp });
    this._tone(t + 0.2, out, 0.14, { type: 'square', f: 622, peak: 0.05, filter: lp });
    this._tone(t + 0.2, out, 0.14, { type: 'square', f: 880, peak: 0.04, filter: lp });
  }
  _death(t, out) { // de-rez: glitchy stepped dive + crumble
    const c = this.ctx;
    const osc = c.createOscillator();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    osc.type = 'sawtooth';
    let fr = 720;
    for (let i = 0; i < 9; i++) { osc.frequency.setValueAtTime(fr * (0.85 + Math.random() * 0.3), t + i * 0.035); fr *= 0.74; }
    f.type = 'lowpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(200, t + 0.38);
    this._env(g.gain, t, 0.14, 0.003, 0.38);
    osc.connect(f); f.connect(g); g.connect(out);
    osc.start(t); osc.stop(t + 0.4);
    this._noise(t + 0.05, out, 0.32, { ftype: 'bandpass', f: 1800, to: 250, Q: 0.8, peak: 0.16 });
  }

  // ------------------------------------------------------- turn / result ---
  _turnPlayer(t, out) { // bright rising fifth + shimmer — "your move"
    this._notes(t, out, [[523, 0, 0.18], [784, 0.09, 0.32]], { type: 'triangle', peak: 0.16 });
    this._notes(t, out, [[1046, 0.09, 0.3]], { type: 'sine', peak: 0.06 });
    this._tone(t, out, 0.4, { type: 'sawtooth', f: 262, peak: 0.04, a: 0.08, filter: { type: 'lowpass', f: 900, to: 2400 } });
  }
  _turnEnemy(t, out) { // low falling fourth — ominous
    const lp = { type: 'lowpass', f: 700, Q: 4 };
    this._notes(t, out, [[147, 0, 0.2], [110, 0.12, 0.34]], { type: 'sawtooth', peak: 0.13, filter: lp });
    this._tone(t, out, 0.45, { type: 'sine', f: 55, peak: 0.12, a: 0.05 });
  }
  _fanfare(t, out) { // victory: synthwave arpeggio into major chord
    const lead = { type: 'sawtooth', peak: 0.08, filter: { type: 'lowpass', f: 3200, Q: 2 } };
    this._notes(t, out, [[523, 0, 0.16], [659, 0.12, 0.16], [784, 0.24, 0.16], [1046, 0.36, 0.5]], lead);
    const chord = { type: 'triangle', peak: 0.09, a: 0.03 };
    this._notes(t, out, [[523, 0.5, 1.2], [659, 0.5, 1.2], [784, 0.5, 1.2], [1046, 0.5, 1.3]], chord);
    this._tone(t + 0.5, out, 1.2, { type: 'sine', f: 131, peak: 0.18, a: 0.02 });
    this._noise(t + 0.5, out, 0.9, { ftype: 'highpass', f: 7000, peak: 0.04, a: 0.05 });
  }
  _drone(t, out) { // defeat: descending minor, detuned, closing filter
    const lp = { type: 'lowpass', f: 1400, to: 200 };
    this._notes(t, out, [[392, 0, 0.35], [349, 0.28, 0.35], [311, 0.56, 1.0]], { type: 'sawtooth', peak: 0.09, filter: lp });
    this._notes(t, out, [[392, 0, 0.35], [349, 0.28, 0.35], [311, 0.56, 1.0]], { type: 'sawtooth', peak: 0.06, detune: 18, filter: lp });
    this._tone(t + 0.56, out, 1.1, { type: 'sine', f: 78, to: 52, peak: 0.2, a: 0.05 });
  }
  _crescendo(t, out) { // combo
    const fs = [262, 330, 392, 523, 659, 784];
    for (let i = 0; i < fs.length; i++) this._tone(t + i * 0.045, out, 0.25, { type: 'triangle', f: fs[i], peak: 0.08 + i * 0.012 });
    this._noise(t + 0.2, out, 0.25, { ftype: 'bandpass', f: 3000, to: 8000, Q: 2, peak: 0.05 });
  }

  // ------------------------------------------------------ keyword sounds ---
  _heal(t, out) { this._notes(t, out, [[523, 0, 0.25], [659, 0.07, 0.25], [880, 0.14, 0.3]], { type: 'sine', peak: 0.14 }); }
  _reveal(t, out) { this._notes(t, out, [[392, 0, 0.3], [523, 0.12, 0.3], [659, 0.24, 0.35]], { type: 'triangle', peak: 0.13 }); }
  _peek(t, out) { this._tone(t, out, 0.25, { type: 'sine', f: 600, to: 800, peak: 0.13 }); }
  _ward(t, out) { // crystal shatter
    this._tone(t, out, 0.25, { type: 'sine', f: 3800, to: 2000, peak: 0.12 });
    this._noise(t, out, 0.18, { ftype: 'highpass', f: 6000, peak: 0.12 });
  }
  _pierce(t, out) { this._tone(t, out, 0.18, { type: 'square', f: 1200, to: 800, peak: 0.1, filter: { type: 'bandpass', f: 1500, Q: 4 } }); }
  _lifesteal(t, out) { this._tone(t, out, 0.35, { type: 'sine', f: 600, to: 200, peak: 0.2 }); }
  _barrage(t, out) {
    for (let i = 0; i < 5; i++) this._noise(t + i * 0.06, out, 0.06, { ftype: 'lowpass', f: 1400, to: 150, peak: 0.22 });
  }
  _fortify(t, out) {
    this._tone(t, out, 0.28, { type: 'square', f: 120, to: 80, peak: 0.14, filter: { type: 'lowpass', f: 800 } });
    this._tone(t + 0.05, out, 0.2, { type: 'triangle', f: 660, peak: 0.06 });
  }
  _shield(t, out) { this._tone(t, out, 0.18, { type: 'sine', f: 400, to: 900, peak: 0.2 }); }
  _reflect(t, out) { this._noise(t, out, 0.25, { ftype: 'bandpass', f: 300, to: 3000, peak: 0.2 }); }
  _stealth(t, out) { this._noise(t, out, 0.35, { ftype: 'bandpass', f: 2000, Q: 0.7, peak: 0.07, a: 0.08 }); }
  _silence(t, out) { this._tone(t, out, 0.15, { type: 'square', f: 60, peak: 0.18, filter: { type: 'lowpass', f: 500 } }); }
  _enrage(t, out) {
    this._tone(t, out, 0.45, { type: 'sawtooth', f: 60, to: 75, peak: 0.2, filter: { type: 'lowpass', f: 500, to: 180, Q: 5 } });
    this._tone(t, out, 0.45, { type: 'sawtooth', f: 61, to: 76, peak: 0.12, detune: 25, filter: { type: 'lowpass', f: 500 } });
  }
  _poison(t, out) {
    for (let i = 0; i < 3; i++) {
      const fr = 300 + Math.random() * 400;
      this._tone(t + i * 0.11 + Math.random() * 0.03, out, 0.1, { type: 'sine', f: fr, to: fr * 0.5, peak: 0.15 });
    }
  }
  _regenerate(t, out) { this._tone(t, out, 0.4, { type: 'sine', f: 600, to: 900, peak: 0.15 }); }
  _thorns(t, out) { this._noise(t, out, 0.08, { ftype: 'highpass', f: 4000, peak: 0.18 }); }
  _immortal(t, out) { this._notes(t, out, [[523.25, 0, 0.6], [659.25, 0, 0.6], [783.99, 0, 0.6]], { type: 'sine', peak: 0.1, a: 0.04 }); }
  _overkill(t, out) {
    this._hit(t, out, 0.2, true);
    this._tone(t + 0.1, out, 0.35, { type: 'sawtooth', f: 150, to: 600, peak: 0.08, filter: { type: 'lowpass', f: 2500 } });
  }
  _gearEquip(t, out) {
    this._tone(t, out, 0.05, { type: 'square', f: 900, peak: 0.1, filter: { type: 'bandpass', f: 2500, Q: 4 } });
    this._tone(t + 0.07, out, 0.07, { type: 'square', f: 650, peak: 0.1, filter: { type: 'bandpass', f: 1800, Q: 4 } });
    this._noise(t + 0.07, out, 0.05, { ftype: 'highpass', f: 4000, peak: 0.08 });
  }
  _conspiracyReveal(t, out) {
    this._tone(t, out, 0.6, { type: 'sawtooth', f: 100, to: 800, peak: 0.14, a: 0.15, filter: { type: 'lowpass', f: 200, to: 2400 } });
    this._tone(t + 0.45, out, 0.3, { type: 'square', f: 233, peak: 0.08, filter: { type: 'lowpass', f: 1500 } });
  }
  _manaburn(t, out) { this._noise(t, out, 0.45, { ftype: 'bandpass', f: 200, to: 2200, Q: 1, peak: 0.24 }); }
  _demolish(t, out) {
    this._tone(t, out, 0.3, { type: 'square', f: 80, to: 40, peak: 0.16, filter: { type: 'lowpass', f: 600 } });
    this._noise(t, out, 0.3, { ftype: 'lowpass', f: 400, to: 60, peak: 0.25 });
  }
  _structureDestroyed(t, out) { // crumble + sub rumble
    this._noise(t, out, 0.5, { ftype: 'lowpass', f: 1200, to: 90, peak: 0.34 });
    this._tone(t, out, 0.6, { type: 'sine', f: 70, to: 30, peak: 0.3 });
    for (let i = 0; i < 4; i++) this._noise(t + 0.08 + i * 0.07 + Math.random() * 0.03, out, 0.05, { ftype: 'bandpass', f: 900 + Math.random() * 1500, Q: 3, peak: 0.1 });
  }

  // --------------------------------------------------------------- music ---
  // Quiet cyberpunk pad: detuned saws through a slowly moving lowpass, Am-F-C-G.
  startMusic() {
    this.musicPlaying = true;
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'running') this._scheduleMusic();
    // otherwise unlock() starts it on first gesture
  }

  stopMusic() {
    this.musicPlaying = false;
    this._stopMusicTimer();
    const t = this.ctx ? this.ctx.currentTime : 0;
    (this.musicNodes || []).forEach(function (n) {
      try { if (n.gain) { n.gain.gain.cancelScheduledValues(t); n.gain.gain.setTargetAtTime(0, t, 0.15); } } catch (e) {}
      try { n.osc.forEach(function (o) { o.stop(t + 0.8); }); } catch (e) {}
    });
    this.musicNodes = [];
  }

  _stopMusicTimer() { if (this._musicTimer) { clearTimeout(this._musicTimer); this._musicTimer = null; } }

  _scheduleMusic() {
    if (!this.musicPlaying || !this.ctx || this.ctx.state !== 'running' || this._musicTimer) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    const self = this;
    const BAR = 8; // seconds per chord
    const tick = function () {
      self._musicTimer = null;
      if (!self.musicPlaying || self.ctx.state !== 'running') return;
      self._playAmbient(BAR);
      self._musicTimer = setTimeout(tick, BAR * 1000 - 250);
    };
    tick();
  }

  _playAmbient(bar) {
    bar = bar || 8;
    const chords = [[110, 130.81, 164.81], [87.31, 110, 130.81], [65.41, 98, 130.81], [98, 123.47, 146.83]];
    const ch = chords[this._musicStep++ % chords.length];
    const c = this.ctx;
    const t = c.currentTime + 0.05;
    const len = bar + 1.5; // overlap for crossfade
    const g = c.createGain();
    const f = c.createBiquadFilter();
    f.type = 'lowpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(380, t);
    f.frequency.linearRampToValueAtTime(820, t + len * 0.5);
    f.frequency.linearRampToValueAtTime(420, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.045, t + 2.0);
    g.gain.setValueAtTime(0.045, t + len - 2.0);
    g.gain.linearRampToValueAtTime(0.0001, t + len);
    f.connect(g); g.connect(this.musicGain);
    const oscs = [];
    ch.forEach(function (fr, i) {
      [-7, 7].forEach(function (det) {
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = fr;
        o.detune.value = det + (i * 2);
        o.connect(f); o.start(t); o.stop(t + len + 0.05);
        oscs.push(o);
      });
    });
    const sub = c.createOscillator();
    sub.type = 'sine'; sub.frequency.value = ch[0] / 2;
    const sg = c.createGain(); sg.gain.value = 0.5;
    sub.connect(sg); sg.connect(g); sub.start(t); sub.stop(t + len + 0.05);
    oscs.push(sub);
    const entry = { osc: oscs, gain: g };
    this.musicNodes.push(entry);
    const self = this;
    oscs[0].onended = function () {
      const i = self.musicNodes.indexOf(entry);
      if (i >= 0) self.musicNodes.splice(i, 1);
      try { g.disconnect(); } catch (e) {}
    };
  }
}

// name -> { fn: method, dur: seconds (voice lifetime), vol, gap: min retrigger (s), prio, fam }
// `fam` marks a specific sound that supersedes generic calls of the same family.
AudioEngine.SOUNDS = {
  click:   { fn: '_click', dur: 0.06, gap: 0.03 },
  hover:   { fn: '_hover', dur: 0.08, gap: 0.06 },
  error:   { fn: '_buzz', dur: 0.25, gap: 0.2, fam: 'error' },
  no_mana: { fn: '_noMana', dur: 0.25, gap: 0.2, fam: 'error' },
  draw:    { fn: '_whoosh', dur: 0.18, gap: 0.06 },
  play:    { fn: '_thud', dur: 0.14 },
  buy:     { fn: '_buy', dur: 0.3, fam: 'card', prio: true },
  play_creature:  { fn: '_playCreature', dur: 0.3, fam: 'card', prio: true },
  play_spell:     { fn: '_playSpell', dur: 0.45, fam: 'card', prio: true },
  play_structure: { fn: '_playStructure', dur: 0.35, fam: 'card', prio: true },
  play_trap:      { fn: '_playTrap', dur: 0.15, fam: 'card', prio: true },
  spell:   { fn: '_chime', dur: 0.45, gap: 0.1 },
  trap:    { fn: '_snap', dur: 0.25 },
  attack:  { fn: '_slash', dur: 0.18, gap: 0.06, prio: true },
  hit:     { fn: '_hit', dur: 0.16, fam: 'damage' },
  hit_heavy: { fn: '_hitHeavy', dur: 0.25, fam: 'damage', prio: true },
  damage:  { fn: '_impact', dur: 0.15, gap: 0.06 },
  base_hit:        { fn: '_baseHit', dur: 0.45, fam: 'damage', prio: true, gap: 0.12 },
  base_hit_player: { fn: '_baseHitPlayer', dur: 0.4, fam: 'damage', prio: true, gap: 0.12 },
  death:   { fn: '_death', dur: 0.4, gap: 0.08, prio: true },
  turn_player: { fn: '_turnPlayer', dur: 0.45, prio: true, gap: 0.5 },
  turn_enemy:  { fn: '_turnEnemy', dur: 0.48, prio: true, gap: 0.5 },
  combo:   { fn: '_crescendo', dur: 0.5, gap: 0.15 },
  victory: { fn: '_fanfare', dur: 1.8, gap: 3, prio: true },
  defeat:  { fn: '_drone', dur: 1.7, gap: 3, prio: true },
  heal:    { fn: '_heal', dur: 0.45 },
  reveal:  { fn: '_reveal', dur: 0.6 },
  peek:    { fn: '_peek', dur: 0.25 },
  ward:    { fn: '_ward', dur: 0.25 },
  pierce:  { fn: '_pierce', dur: 0.18 },
  lifesteal: { fn: '_lifesteal', dur: 0.35 },
  barrage: { fn: '_barrage', dur: 0.32 },
  fortify: { fn: '_fortify', dur: 0.3 },
  shield:  { fn: '_shield', dur: 0.18 },
  reflect: { fn: '_reflect', dur: 0.25 },
  stealth: { fn: '_stealth', dur: 0.35 },
  silence: { fn: '_silence', dur: 0.15 },
  enrage:  { fn: '_enrage', dur: 0.45 },
  poison:  { fn: '_poison', dur: 0.4 },
  regenerate: { fn: '_regenerate', dur: 0.4 },
  thorns:  { fn: '_thorns', dur: 0.08 },
  immortal: { fn: '_immortal', dur: 0.6 },
  overkill: { fn: '_overkill', dur: 0.45 },
  gear_equip: { fn: '_gearEquip', dur: 0.15, fam: 'card' },
  conspiracy_reveal: { fn: '_conspiracyReveal', dur: 0.75 },
  manaburn: { fn: '_manaburn', dur: 0.45 },
  demolish: { fn: '_demolish', dur: 0.3 },
  structure_destroyed: { fn: '_structureDestroyed', dur: 0.6, gap: 0.15 }
};

// Generic names called by the UI that a specific engine-driven sound may replace.
AudioEngine.GENERIC_FAMILY = { play: 'card', click: 'card', damage: 'damage', error: 'error' };

// Global audio instance
const audio = new AudioEngine();

// Export
if (typeof module !== 'undefined') {
  module.exports = { AudioEngine, audio };
}
