/**
 * Synthopwars Audio Engine
 * Web Audio API for sound effects and music
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.initialized = false;
    this.settings = {
      master: 1.0,
      music: 0.6,
      sfx: 0.8
    };
  }

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.applySettings();
    this.initialized = true;
  }

  applySettings() {
    if (!this.initialized) return;
    this.masterGain.gain.value = this.settings.master;
    this.musicGain.gain.value = this.settings.music;
    this.sfxGain.gain.value = this.settings.sfx;
  }

  setVolume(type, value) {
    this.settings[type] = Math.max(0, Math.min(1, value));
    this.applySettings();
  }

  // Generate sound effects using Web Audio API oscillators
  play(type) {
    if (!this.initialized) this.init();
    const t = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.connect(this.sfxGain);

    switch (type) {
      case 'draw':
        this._whoosh(t, gain, 0.3);
        break;
      case 'play':
        this._thud(t, gain, 0.4);
        break;
      case 'attack':
        this._slash(t, gain, 0.3);
        break;
      case 'spell':
        this._chime(t, gain, 0.4);
        break;
      case 'trap':
        this._snap(t, gain, 0.3);
        break;
      case 'combo':
        this._crescendo(t, gain, 0.6);
        break;
      case 'victory':
        this._fanfare(t, gain, 0.8);
        break;
      case 'defeat':
        this._drone(t, gain, 0.5);
        break;
      case 'hover':
        this._hover(t, gain, 0.1);
        break;
      case 'error':
        this._buzz(t, gain, 0.2);
        break;
      case 'heal':
        this._heal(t, gain, 0.3);
        break;
      case 'damage':
        this._impact(t, gain, 0.2);
        break;
      case 'click':
        this._click(t, gain, 0.05);
        break;
      case 'reveal':
        this._reveal(t, gain, 0.4);
        break;
      case 'peek':
        this._peek(t, gain, 0.3);
        break;
      case 'ward':
        this._ward(t, gain, 0.3);
        break;
      case 'pierce':
        this._pierce(t, gain, 0.2);
        break;
      case 'lifesteal':
        this._lifesteal(t, gain, 0.4);
        break;
      case 'barrage':
        this._barrage(t, gain, 0.4);
        break;
      case 'fortify':
        this._fortify(t, gain, 0.3);
        break;
      case 'shield':
        this._shield(t, gain, 0.2);
        break;
      case 'reflect':
        this._reflect(t, gain, 0.3);
        break;
      case 'stealth':
        this._stealth(t, gain, 0.4);
        break;
      case 'silence':
        this._silence(t, gain, 0.15);
        break;
      case 'enrage':
        this._enrage(t, gain, 0.5);
        break;
      case 'poison':
        this._poison(t, gain, 0.4);
        break;
      case 'regenerate':
        this._regenerate(t, gain, 0.4);
        break;
      case 'thorns':
        this._thorns(t, gain, 0.1);
        break;
      case 'immortal':
        this._immortal(t, gain, 0.6);
        break;
      case 'overkill':
        this._overkill(t, gain, 0.5);
        break;
      case 'gear_equip':
        this._gearEquip(t, gain, 0.15);
        break;
      case 'conspiracy_reveal':
        this._conspiracyReveal(t, gain, 0.6);
        break;
      case 'manaburn':
        this._manaburn(t, gain, 0.5);
        break;
      case 'demolish':
        this._demolish(t, gain, 0.3);
        break;
      case 'structure_destroyed':
        this._structureDestroyed(t, gain, 0.8);
        break;
    }
  }

  _whoosh(t, gain, duration) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + duration);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + duration);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(filter);
    filter.connect(gain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _thud(t, gain, duration) {
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + duration);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _slash(t, gain, duration) {
    const osc = this.ctx.createOscillator();
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(3000, t);
    noiseFilter.Q.setValueAtTime(1, t);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + duration);
    noise.connect(noiseFilter);
    noiseFilter.connect(gain);
    osc.connect(gain);
    noise.start(t);
    noise.stop(t + duration);
    osc.start(t);
    osc.stop(t + duration);
  }

  _chime(t, gain, duration) {
    const freqs = [523, 659, 784, 1047];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.08);
      g.gain.setValueAtTime(0.2, t + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.3);
      osc.connect(g);
      g.connect(gain);
      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.3);
    });
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
  }

  _snap(t, gain, duration) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, t);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    noise.connect(filter);
    filter.connect(gain);
    noise.start(t);
    noise.stop(t + 0.05);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + duration);
    gain.gain.setValueAtTime(0.3, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    osc.start(t + 0.05);
    osc.stop(t + duration);
  }

  _crescendo(t, gain, duration) {
    const freqs = [262, 330, 392, 494, 523, 659, 784, 1047];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.06);
      g.gain.setValueAtTime(0, t + i * 0.06);
      g.gain.linearRampToValueAtTime(0.15, t + i * 0.06 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.06 + 0.4);
      osc.connect(g);
      g.connect(gain);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.4);
    });
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
  }

  _fanfare(t, gain, duration) {
    const notes = [523, 523, 659, 784, 1047, 784, 1047];
    const durations = [0.2, 0.2, 0.2, 0.3, 0.4, 0.2, 0.6];
    let offset = 0;
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + offset);
      g.gain.setValueAtTime(0.3, t + offset);
      g.gain.exponentialRampToValueAtTime(0.01, t + offset + durations[i]);
      osc.connect(g);
      g.connect(gain);
      osc.start(t + offset);
      osc.stop(t + offset + durations[i]);
      offset += durations[i] * 0.8;
    });
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
  }

  _drone(t, gain, duration) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(50, t);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(50, t + duration);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(filter);
    filter.connect(gain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _hover(t, gain, duration) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + duration);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _buzz(t, gain, duration) {
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, t);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _heal(t, gain, duration) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + duration);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _impact(t, gain, duration) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + duration);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    noise.connect(filter);
    filter.connect(gain);
    noise.start(t);
    noise.stop(t + duration);
  }

  _click(t, gain, duration) {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1500, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _reveal(t, gain, duration) {
    // Mystical reveal — ascending chime with echo
    const notes = [392, 523, 659];
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.12);
      g.gain.setValueAtTime(0.15, t + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.12 + 0.3);
      osc.connect(g);
      g.connect(gain);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.3);
    });
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
  }

  _peek(t, gain, duration) {
    // Subtle peek — single tone with pitch bend
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + duration);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _ward(t, gain, duration) {
    // Crystal shield shatter — high-freq sine burst with quick decay
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(4000, t);
    osc.frequency.exponentialRampToValueAtTime(2000, t + duration);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _pierce(t, gain, duration) {
    // Metallic clang — square wave at high frequency
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + duration);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, t);
    filter.Q.setValueAtTime(2, t);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(filter);
    filter.connect(gain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _lifesteal(t, gain, duration) {
    // Soft drain — descending sine from 600 to 200
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + duration);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _barrage(t, gain, duration) {
    // Rapid fire — 5 quick impact sounds 0.06s apart
    const stepDur = duration / 5;
    for (let i = 0; i < 5; i++) {
      const offset = i * 0.06;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._createNoiseBuffer();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t + offset);
      filter.frequency.exponentialRampToValueAtTime(100, t + offset + stepDur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.3, t + offset);
      g.gain.exponentialRampToValueAtTime(0.01, t + offset + stepDur);
      noise.connect(filter);
      filter.connect(g);
      g.connect(gain);
      noise.start(t + offset);
      noise.stop(t + offset + stepDur);
    }
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
  }

  _fortify(t, gain, duration) {
    // Solidifying — low square wave thud with sustain
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.setValueAtTime(120, t + duration * 0.6);
    osc.frequency.exponentialRampToValueAtTime(80, t + duration);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.02);
    gain.gain.setValueAtTime(0.35, t + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _shield(t, gain, duration) {
    // Bubble pop — sine with pitch bend up from 400 to 800
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + duration);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _reflect(t, gain, duration) {
    // Reverse swish — ascending filtered noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(3000, t + duration);
    filter.Q.setValueAtTime(1, t);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    noise.connect(filter);
    filter.connect(gain);
    noise.start(t);
    noise.stop(t + duration);
  }

  _stealth(t, gain, duration) {
    // Whisper — very quiet filtered noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, t);
    filter.Q.setValueAtTime(0.7, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    noise.connect(filter);
    filter.connect(gain);
    noise.start(t);
    noise.stop(t + duration);
  }

  _silence(t, gain, duration) {
    // Mute thud — low square wave with quick cutoff
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(60, t);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _enrage(t, gain, duration) {
    // Growl — sawtooth at 60Hz with slight distortion
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const shaper = this.ctx.createWaveShaper();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.linearRampToValueAtTime(70, t + duration);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(150, t + duration);
    // Simple distortion curve
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i / 128) - 1;
      curve[i] = Math.tanh(x * 3);
    }
    shaper.curve = curve;
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(filter);
    filter.connect(shaper);
    shaper.connect(gain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _poison(t, gain, duration) {
    // Bubbling — 3 random sine pops
    for (let i = 0; i < 3; i++) {
      const offset = (i + Math.random() * 0.3) * (duration / 3);
      const popDur = 0.1;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      const freq = 300 + Math.random() * 400;
      osc.frequency.setValueAtTime(freq, t + offset);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, t + offset + popDur);
      g.gain.setValueAtTime(0.2, t + offset);
      g.gain.exponentialRampToValueAtTime(0.01, t + offset + popDur);
      osc.connect(g);
      g.connect(gain);
      osc.start(t + offset);
      osc.stop(t + offset + popDur);
    }
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
  }

  _regenerate(t, gain, duration) {
    // Soft chime — high sine ascending 600 to 900
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.linearRampToValueAtTime(900, t + duration);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _thorns(t, gain, duration) {
    // Prick — very short high noise burst
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4000, t);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    noise.connect(filter);
    filter.connect(gain);
    noise.start(t);
    noise.stop(t + duration);
  }

  _immortal(t, gain, duration) {
    // Divine chord — major triad (C, E, G) sine waves
    const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5
    freqs.forEach(f => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.05);
      g.gain.setValueAtTime(0.2, t + duration * 0.6);
      g.gain.exponentialRampToValueAtTime(0.01, t + duration);
      osc.connect(g);
      g.connect(gain);
      osc.start(t);
      osc.stop(t + duration);
    });
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
  }

  _overkill(t, gain, duration) {
    // Impact + zoom — low impact then rising frequency
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(500, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(100, t + 0.1);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    noise.connect(noiseFilter);
    noiseFilter.connect(gain);
    noise.start(t);
    noise.stop(t + 0.1);

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t + 0.1);
    osc.frequency.exponentialRampToValueAtTime(600, t + duration);
    gain.gain.setValueAtTime(0.3, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    osc.start(t + 0.1);
    osc.stop(t + duration);
  }

  _gearEquip(t, gain, duration) {
    // Mechanical click — two quick square clicks
    for (let i = 0; i < 2; i++) {
      const offset = i * (duration / 2);
      const clickDur = duration / 2 * 0.8;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(i === 0 ? 800 : 600, t + offset);
      g.gain.setValueAtTime(0.2, t + offset);
      g.gain.exponentialRampToValueAtTime(0.01, t + offset + clickDur);
      osc.connect(g);
      g.connect(gain);
      osc.start(t + offset);
      osc.stop(t + offset + clickDur);
    }
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
  }

  _conspiracyReveal(t, gain, duration) {
    // Dramatic reveal — low to high frequency sweep
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + duration);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(2000, t + duration);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(filter);
    filter.connect(gain);
    osc.start(t);
    osc.stop(t + duration);
  }

  _manaburn(t, gain, duration) {
    // Flame — noise burst with filter sweep
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, t);
    filter.frequency.exponentialRampToValueAtTime(2000, t + duration);
    filter.Q.setValueAtTime(1, t);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    noise.connect(filter);
    filter.connect(gain);
    noise.start(t);
    noise.stop(t + duration);
  }

  _demolish(t, gain, duration) {
    // Heavy crunch — low square + noise burst
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + duration);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + duration);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer();
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(300, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(50, t + duration);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(gain);
    noise.start(t);
    noise.stop(t + duration);
  }

  _structureDestroyed(t, gain, duration) {
    // Crumbling — descending noise with reverb-like decay
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + duration * 0.4);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.15, t + duration * 0.4);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    noise.connect(filter);
    filter.connect(gain);
    noise.start(t);
    noise.stop(t + duration);

    // Low rumble for reverb-like tail
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(50, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + duration);
    gain.gain.setValueAtTime(0.15, t + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    osc.connect(gain);
    osc.start(t + duration * 0.3);
    osc.stop(t + duration);
  }

  _createNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Background music - procedural ambient
  startMusic() {
    if (!this.initialized) this.init();
    if (this.musicPlaying) return;
    this.musicPlaying = true;
    this._playAmbient();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicNodes) {
      this.musicNodes.forEach(n => {
        try { n.stop(); } catch (e) {}
      });
    }
  }

  _playAmbient() {
    if (!this.musicPlaying) return;
    const t = this.ctx.currentTime;
    const baseFreq = 110 + Math.random() * 20;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.linearRampToValueAtTime(baseFreq + 5, t + 4);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.linearRampToValueAtTime(600, t + 4);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 2);
    gain.gain.linearRampToValueAtTime(0.05, t + 4);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 4);
    this.musicNodes = this.musicNodes || [];
    this.musicNodes.push(osc);

    // Schedule next note
    if (this.musicPlaying) {
      setTimeout(() => this._playAmbient(), 4000);
    }
  }
}

// Global audio instance
const audio = new AudioEngine();

// Export
if (typeof module !== 'undefined') {
  module.exports = { AudioEngine, audio };
}
