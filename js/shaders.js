/**
 * Synthopwars Shader Engine v1.0
 *
 * A WebGL2 fragment-shader system that derives the visual style of every
 * game component from its semantic meaning through mathematical equations.
 *
 * Design philosophy:
 * - Team colors are not hardcoded — they emerge from HSL-space equations
 *   driven by faction archetype (aggression=red-shift, defense=green-shift, etc.)
 * - Rarity glow intensity is a function of rarity tier: glow = tier^2 * sin(time)
 * - HP bars pulse proportional to (1 - hp/maxHp) — low HP pulses faster
 * - Battleground biome shaders use noise functions parameterized by biome type
 * - Card backs use procedural patterns derived from the back selection
 * - Mana crystals shimmer with intensity = mana/maxMana
 * - Combat hits produce shockwave shaders parameterized by damage amount
 * - The entire background uses a fluid simulation driven by game state
 */

const SynthShaderEngine = (function() {

  // ===== SHADER SOURCE LIBRARY =====

  // Full-screen quad vertex shader (used by all passes)
  const VERT_SRC = `#version 300 es
  in vec2 a_pos;
  out vec2 v_uv;
  void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }`;

  // Background fluid shader — driven by game phase, turn, and biome
  const BG_FRAG = `#version 300 es
  precision highp float;
  in vec2 v_uv;
  out vec4 fragColor;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_turn;          // current turn number
  uniform float u_phase;         // 0=bank, 1=main, 2=combat, 3=end
  uniform float u_biome;         // biome index (0-6)
  uniform float u_intensity;     // game intensity 0-1 (increases with turn count)
  uniform float u_playerHp;      // 0-1 normalized
  uniform float u_enemyHp;       // 0-1 normalized
  uniform vec3 u_biomeColor;     // primary biome color

  // Hash-based noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // Value noise
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Fractal Brownian Motion — layered noise for organic flow
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p *= 2.0;
      a *= 0.5;
    }
    return v;
  }

  // Domain-warped FBM for fluid-like patterns
  float warpedFBM(vec2 p, float t) {
    vec2 q = vec2(fbm(p + vec2(0.0, t * 0.1)),
                  fbm(p + vec2(5.2, 1.3) + t * 0.08));
    vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.05),
                  fbm(p + 4.0 * q + vec2(8.3, 2.8) + t * 0.06));
    return fbm(p + 4.0 * r);
  }

  void main() {
    vec2 uv = v_uv;
    vec2 p = uv * 3.0;
    p.x *= u_resolution.x / u_resolution.y;

    // Phase affects flow speed and direction
    float flowSpeed = 0.3 + u_phase * 0.4;
    float t = u_time * flowSpeed;

    // Turn count increases turbulence (game gets more intense)
    float turbulence = 1.0 + u_intensity * 2.0;

    // Warped FBM for the fluid background
    float n = warpedFBM(p * turbulence, t);

    // Biome modulation — each biome has a different noise pattern
    float biomePattern = 0.0;
    if (u_biome < 0.5) {
      // Cyber: vertical scanlines + digital noise
      biomePattern = step(0.98, sin(uv.y * 200.0 + t * 5.0)) * 0.15;
    } else if (u_biome < 1.5) {
      // Desert: horizontal sand ripples
      biomePattern = sin(uv.x * 30.0 + n * 5.0) * 0.08;
    } else if (u_biome < 2.5) {
      // Fog: dense layered mist
      biomePattern = vnoise(uv * 8.0 + t) * 0.12;
    } else if (u_biome < 3.5) {
      // Neon: pulsing grid
      vec2 grid = fract(uv * 15.0) - 0.5;
      biomePattern = smoothstep(0.45, 0.5, max(abs(grid.x), abs(grid.y))) * 0.2 * sin(t * 3.0);
    } else if (u_biome < 4.5) {
      // Golden: warm radial pulse
      float dist = length(uv - 0.5);
      biomePattern = sin(dist * 20.0 - t * 2.0) * 0.06;
    } else if (u_biome < 5.5) {
      // Gravity: swirling distortion
      float angle = atan(uv.y - 0.5, uv.x - 0.5);
      biomePattern = sin(angle * 5.0 + t * 2.0) * 0.1;
    } else {
      // Fire: flickering
      biomePattern = vnoise(vec2(uv.x * 10.0, uv.y * 5.0 - t * 3.0)) * 0.15;
    }

    // Base color from biome, modulated by noise
    vec3 baseColor = u_biomeColor * (0.15 + n * 0.25);

    // Phase tint — bank phase is golden, main is cyan, combat is red
    vec3 phaseTint = vec3(0.0);
    if (u_phase < 0.5) {
      phaseTint = vec3(0.15, 0.12, 0.05); // golden bank tint
    } else if (u_phase < 1.5) {
      phaseTint = vec3(0.02, 0.08, 0.12); // cyan main tint
    } else if (u_phase < 2.5) {
      phaseTint = vec3(0.12, 0.02, 0.05); // red combat tint
    }

    // HP pressure — when player is low, red vignette intensifies
    float hpPressure = 1.0 - u_playerHp;
    float vignette = smoothstep(0.8, 0.3, length(uv - 0.5));
    vec3 dangerColor = vec3(0.8, 0.1, 0.15) * hpPressure * hpPressure * vignette * 0.3;

    // Enemy pressure — subtle blue shift when enemy is low (winning)
    float enemyPressure = 1.0 - u_enemyHp;
    vec3 triumphColor = vec3(0.1, 0.6, 0.3) * enemyPressure * enemyPressure * 0.05;

    vec3 finalColor = baseColor + phaseTint + dangerColor + triumphColor;
    finalColor += biomePattern;

    // Subtle scanline for retro CRT effect
    float scanline = sin(uv.y * u_resolution.y * 0.7) * 0.015;
    finalColor -= scanline;

    // Gamma and output
    finalColor = pow(finalColor, vec3(0.85));
    fragColor = vec4(finalColor, 1.0);
  }`;

  // Card glow shader — rarity-driven shimmer overlay
  const CARD_GLOW_FRAG = `#version 300 es
  precision highp float;
  in vec2 v_uv;
  out vec4 fragColor;
  uniform float u_time;
  uniform float u_rarity;       // 0-5 (common to mythic)
  uniform vec3 u_teamColor;     // team primary color
  uniform float u_hp;           // 0-1 normalized HP (for creatures)
  uniform float u_isCreature;   // 1.0 if creature, 0.0 otherwise
  uniform float u_selected;     // 1.0 if selected, 0.0 otherwise
  uniform float u_playable;     // 1.0 if playable, 0.0 otherwise
  uniform float u_frozen;       // 1.0 if frozen

  void main() {
    vec2 uv = v_uv;
    float t = u_time;

    // Rarity glow: intensity = (rarity/5)^2, frequency scales with rarity
    float rarityNorm = u_rarity / 5.0;
    float glowIntensity = rarityNorm * rarityNorm;
    float shimmerFreq = 2.0 + rarityNorm * 4.0;
    float shimmer = sin(t * shimmerFreq + uv.x * 8.0 + uv.y * 6.0) * 0.5 + 0.5;
    shimmer = pow(shimmer, 3.0);

    // Edge glow — stronger at borders
    vec2 edgeDist = min(uv, 1.0 - uv);
    float edge = 1.0 - smoothstep(0.0, 0.08, min(edgeDist.x, edgeDist.y));

    // Team-colored glow
    vec3 glowColor = u_teamColor * (shimmer * glowIntensity * 0.3 + edge * glowIntensity * 0.5);

    // HP pulse — low HP creatures pulse red
    float hpPulse = 0.0;
    if (u_isCreature > 0.5) {
      float hpFactor = 1.0 - u_hp;
      hpPulse = sin(t * (3.0 + hpFactor * 8.0)) * 0.5 + 0.5;
      hpPulse *= hpFactor * hpFactor * 0.4;
      glowColor += vec3(1.0, 0.2, 0.15) * hpPulse;
    }

    // Selection highlight — golden pulsing border
    if (u_selected > 0.5) {
      float selPulse = sin(t * 6.0) * 0.5 + 0.5;
      glowColor += vec3(1.0, 0.84, 0.0) * edge * (0.5 + selPulse * 0.5);
    }

    // Playable indicator — subtle green shimmer
    if (u_playable > 0.5 && u_selected < 0.5) {
      float playShimmer = sin(t * 4.0 + uv.y * 10.0) * 0.5 + 0.5;
      glowColor += vec3(0.02, 1.0, 0.5) * edge * playShimmer * 0.2;
    }

    // Frozen tint — blue ice crystals
    if (u_frozen > 0.5) {
      float icePattern = sin(uv.x * 20.0 + t) * sin(uv.y * 20.0 - t) * 0.5 + 0.5;
      glowColor += vec3(0.3, 0.6, 1.0) * icePattern * 0.15;
    }

    float alpha = max(glowColor.r, max(glowColor.g, glowColor.b));
    fragColor = vec4(glowColor, alpha * 0.7);
  }`;

  // HP ring shader — circular progress with dynamic color
  const HP_RING_FRAG = `#version 300 es
  precision highp float;
  in vec2 v_uv;
  out vec4 fragColor;
  uniform float u_time;
  uniform float u_hp;          // 0-1 normalized
  uniform float u_maxHp;

  void main() {
    vec2 uv = v_uv - 0.5;
    float angle = atan(-uv.y, uv.x);
    angle = (angle + 3.14159) / (2.0 * 3.14159); // 0-1

    float radius = length(uv);
    float ringWidth = 0.04;
    float ringInner = 0.38;
    float ringOuter = ringInner + ringWidth;

    // Ring mask
    float ringMask = smoothstep(ringInner - 0.01, ringInner, radius) *
                     (1.0 - smoothstep(ringOuter - 0.01, ringOuter, radius));

    // Progress fill
    float progress = step(angle, u_hp);
    float fillMask = ringMask * progress;

    // Color: green > gold > red based on HP
    vec3 colorFull = vec3(0.02, 1.0, 0.5);    // green
    vec3 colorMid = vec3(1.0, 0.84, 0.0);     // gold
    vec3 colorLow = vec3(1.0, 0.16, 0.35);    // red

    vec3 fillColor;
    if (u_hp > 0.5) {
      fillColor = mix(colorMid, colorFull, (u_hp - 0.5) * 2.0);
    } else {
      fillColor = mix(colorLow, colorMid, u_hp * 2.0);
    }

    // Pulse when low HP
    float pulse = 1.0;
    if (u_hp < 0.3) {
      pulse = 0.7 + sin(u_time * (5.0 + (1.0 - u_hp) * 15.0)) * 0.3;
    }

    // Glow
    float glow = smoothstep(ringOuter, ringInner - 0.02, radius) *
                 smoothstep(ringInner - 0.04, ringInner - 0.02, radius) * 0.3;

    // Track (empty part of ring)
    vec3 trackColor = vec3(0.1, 0.1, 0.15);
    vec3 finalColor = mix(trackColor * ringMask, fillColor * pulse, fillMask);
    finalColor += fillColor * glow * u_hp;

    float alpha = ringMask + glow * 0.5;
    fragColor = vec4(finalColor, alpha);
  }`;

  // Mana crystal shader — geometric shimmer
  const MANA_FRAG = `#version 300 es
  precision highp float;
  in vec2 v_uv;
  out vec4 fragColor;
  uniform float u_time;
  uniform float u_mana;       // 0-1 (current/max)
  uniform float u_isEnemy;    // 1.0 for enemy (red), 0.0 for player (cyan)

  void main() {
    vec2 uv = v_uv - 0.5;
    float t = u_time;

    // Diamond shape
    float diamond = abs(uv.x) + abs(uv.y);
    float shape = 1.0 - smoothstep(0.38, 0.42, diamond);

    // Inner facet shimmer
    float facet = sin(uv.x * 10.0 + t * 2.0) * sin(uv.y * 10.0 - t * 1.5) * 0.5 + 0.5;
    facet = pow(facet, 2.0);

    // Color: cyan for player, red for enemy
    vec3 baseColor = mix(vec3(0.0, 0.85, 1.0), vec3(1.0, 0.16, 0.43), u_isEnemy);

    // Full crystals glow, empty ones are dark
    vec3 color = baseColor * (0.3 + u_mana * 0.7);
    color += baseColor * facet * u_mana * 0.4;

    // Edge highlight
    float edge = 1.0 - smoothstep(0.36, 0.42, diamond);
    color += vec3(1.0) * edge * 0.15 * u_mana;

    // Sparkle
    float sparkle = pow(facet * u_mana, 5.0);
    color += vec3(1.0) * sparkle * 0.5;

    fragColor = vec4(color, shape);
  }`;

  // Combat shockwave shader — parameterized by damage
  const SHOCKWAVE_FRAG = `#version 300 es
  precision highp float;
  in vec2 v_uv;
  out vec4 fragColor;
  uniform float u_time;
  uniform float u_damage;     // damage amount (0-10+)
  uniform vec3 u_pos;         // impact position (0-1)
  uniform float u_isCritical; // 1.0 if critical hit

  void main() {
    vec2 uv = v_uv;
    float t = u_time;
    float dist = length(uv - u_pos.xy);

    // Expanding ring
    float ringRadius = t * 0.5;
    float ringWidth = 0.05 + u_damage * 0.005;
    float ring = smoothstep(ringRadius - ringWidth, ringRadius, dist) *
                 (1.0 - smoothstep(ringRadius, ringRadius + ringWidth, dist));

    // Fade over time
    float fade = 1.0 - t;
    fade = max(0.0, fade);

    // Color based on damage
    vec3 color;
    if (u_isCritical > 0.5) {
      color = vec3(1.0, 0.84, 0.0); // gold for critical
    } else if (u_damage > 5.0) {
      color = vec3(1.0, 0.2, 0.1); // red for high damage
    } else {
      color = vec3(1.0, 0.9, 0.7); // white-yellow for normal
    }

    // Secondary ripple
    float ripple2 = sin(dist * 30.0 - t * 15.0) * 0.5 + 0.5;
    ripple2 *= fade * 0.3;

    float intensity = (ring + ripple2) * fade;
    fragColor = vec4(color * intensity, intensity * 0.6);
  }`;

  // Battleground biome overlay shader
  const BIOME_FRAG = `#version 300 es
  precision highp float;
  in vec2 v_uv;
  out vec4 fragColor;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_biome;    // 0-6
  uniform vec3 u_color;     // biome primary color

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }

  void main() {
    vec2 uv = v_uv;
    float t = u_time;
    float alpha = 0.0;
    vec3 color = u_color;

    int biome = int(u_biome + 0.5);

    if (biome == 0) {
      // Cyber rain
      float rain = step(0.98, hash(vec2(floor(uv.x * 80.0), floor(t * 60.0 - uv.y * 40.0))));
      alpha = rain * 0.15;
      color = vec3(0.0, 0.7, 1.0);
    } else if (biome == 1) {
      // Sandstorm
      float sand = vnoise(uv * 5.0 + vec2(t * 0.5, t * 0.3));
      alpha = sand * 0.08;
      color = vec3(0.8, 0.5, 0.2);
    } else if (biome == 2) {
      // Fog drifts
      float fog = vnoise(uv * 3.0 + t * 0.1);
      alpha = fog * 0.12;
      color = vec3(0.5, 0.5, 0.6);
    } else if (biome == 3) {
      // Neon grid pulse
      vec2 g = fract(uv * 12.0) - 0.5;
      float grid = smoothstep(0.48, 0.5, max(abs(g.x), abs(g.y)));
      alpha = grid * (0.1 + sin(t * 3.0) * 0.05);
      color = vec3(1.0, 0.1, 0.5);
    } else if (biome == 4) {
      // Golden shimmer
      float shimmer = vnoise(uv * 8.0 + t * 0.2);
      alpha = shimmer * 0.06;
      color = vec3(1.0, 0.84, 0.0);
    } else if (biome == 5) {
      // Gravity warp
      float warp = sin(length(uv - 0.5) * 10.0 - t * 2.0) * 0.5 + 0.5;
      alpha = warp * 0.05;
      color = vec3(0.7, 0.1, 1.0);
    } else {
      // Fire embers
      float ember = step(0.97, hash(vec2(floor(uv.x * 40.0), floor(t * 20.0 - uv.y * 60.0))));
      alpha = ember * 0.12;
      color = vec3(1.0, 0.4, 0.1);
    }

    fragColor = vec4(color, alpha);
  }`;

  // ===== ENGINE CLASS =====

  class ShaderEngine {
    constructor() {
      this.gl = null;
      this.canvas = null;
      this.programs = {};
      this.activeShocks = [];
      this.uniforms = {};
      this.startTime = performance.now();
      this.gameState = {
        turn: 1,
        phase: 0,    // 0=bank, 1=main, 2=combat, 3=end
        biome: 0,
        intensity: 0,
        playerHp: 1.0,
        enemyHp: 1.0,
        biomeColor: [0.0, 0.85, 1.0]
      };
      this.enabled = true;
    }

    init(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) { this.enabled = false; return false; }
      this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
      if (!this.gl) { this.enabled = false; return false; }

      this.resize();
      window.addEventListener('resize', () => this.resize());

      // Compile all shader programs
      this.programs.bg = this._createProgram(VERT_SRC, BG_FRAG);
      this.programs.cardGlow = this._createProgram(VERT_SRC, CARD_GLOW_FRAG);
      this.programs.hpRing = this._createProgram(VERT_SRC, HP_RING_FRAG);
      this.programs.mana = this._createProgram(VERT_SRC, MANA_FRAG);
      this.programs.shock = this._createProgram(VERT_SRC, SHOCKWAVE_FRAG);
      this.programs.biome = this._createProgram(VERT_SRC, BIOME_FRAG);

      this._setupQuad();
      return true;
    }

    resize() {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    _compileShader(type, src) {
      var gl = this.gl;
      var shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        console.error('Source:', src.substring(0, 200));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    _createProgram(vsSrc, fsSrc) {
      var gl = this.gl;
      var vs = this._compileShader(gl.VERTEX_SHADER, vsSrc);
      var fs = this._compileShader(gl.FRAGMENT_SHADER, fsSrc);
      if (!vs || !fs) return null;
      var prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(prog));
        return null;
      }
      return prog;
    }

    _setupQuad() {
      var gl = this.gl;
      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,  1, -1,  -1, 1,
        -1, 1,   1, -1,   1, 1
      ]), gl.STATIC_DRAW);
      this.quadBuffer = buf;
    }

    _bindQuad(program) {
      var gl = this.gl;
      gl.useProgram(program);
      var posLoc = gl.getAttribLocation(program, 'a_pos');
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    }

    _getUniform(program, name) {
      if (!this.uniforms[program]) this.uniforms[program] = {};
      if (this.uniforms[program][name] === undefined) {
        this.uniforms[program][name] = this.gl.getUniformLocation(program, name);
      }
      return this.uniforms[program][name];
    }

    // Update game state from the UI controller
    updateState(game) {
      if (!game) return;
      var phaseMap = { bank: 0, power: 1, main: 1, end: 3 };
      this.gameState.turn = game.turnCount || 1;
      this.gameState.phase = phaseMap[game.phase] !== undefined ? phaseMap[game.phase] : 0;
      this.gameState.intensity = Math.min(1.0, (game.turnCount || 1) / 20.0);
      this.gameState.playerHp = game.player ? Math.max(0, game.player.hp / game.player.maxHp) : 1.0;
      this.gameState.enemyHp = game.enemy ? Math.max(0, game.enemy.hp / game.enemy.maxHp) : 1.0;

      // Biome from battleground
      var biomeMap = { cyber: 0, desert: 1, fog: 2, neon: 3, golden: 4, gravity: 5, fire: 6 };
      if (game.battleground && game.battleground.biome) {
        this.gameState.biome = biomeMap[game.battleground.biome] !== undefined ? biomeMap[game.battleground.biome] : 0;
        // Parse biome color from hex
        var hex = game.battleground.color || '#00d9ff';
        this.gameState.biomeColor = this._hexToRgb(hex);
      }
    }

    _hexToRgb(hex) {
      var r = 0, g = 0, b = 0;
      if (hex.length === 7) {
        r = parseInt(hex.substr(1, 2), 16) / 255;
        g = parseInt(hex.substr(3, 2), 16) / 255;
        b = parseInt(hex.substr(5, 2), 16) / 255;
      }
      return [r, g, b];
    }

    // Trigger a combat shockwave
    addShockwave(x, y, damage, isCritical) {
      this.activeShocks.push({
        x: x, y: y, damage: damage, isCritical: isCritical ? 1.0 : 0.0,
        startTime: performance.now()
      });
      // Keep max 5 simultaneous shocks
      if (this.activeShocks.length > 5) this.activeShocks.shift();
    }

    render() {
      if (!this.enabled || !this.gl) return;
      var gl = this.gl;
      var t = (performance.now() - this.startTime) / 1000.0;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Enable blending
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // Pass 1: Background fluid shader
      if (this.programs.bg) {
        this._bindQuad(this.programs.bg);
        gl.uniform1f(this._getUniform(this.programs.bg, 'u_time'), t);
        gl.uniform2f(this._getUniform(this.programs.bg, 'u_resolution'), this.canvas.width, this.canvas.height);
        gl.uniform1f(this._getUniform(this.programs.bg, 'u_turn'), this.gameState.turn);
        gl.uniform1f(this._getUniform(this.programs.bg, 'u_phase'), this.gameState.phase);
        gl.uniform1f(this._getUniform(this.programs.bg, 'u_biome'), this.gameState.biome);
        gl.uniform1f(this._getUniform(this.programs.bg, 'u_intensity'), this.gameState.intensity);
        gl.uniform1f(this._getUniform(this.programs.bg, 'u_playerHp'), this.gameState.playerHp);
        gl.uniform1f(this._getUniform(this.programs.bg, 'u_enemyHp'), this.gameState.enemyHp);
        gl.uniform3fv(this._getUniform(this.programs.bg, 'u_biomeColor'), this.gameState.biomeColor);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // Pass 2: Biome overlay
      if (this.programs.biome) {
        this._bindQuad(this.programs.biome);
        gl.uniform1f(this._getUniform(this.programs.biome, 'u_time'), t);
        gl.uniform2f(this._getUniform(this.programs.biome, 'u_resolution'), this.canvas.width, this.canvas.height);
        gl.uniform1f(this._getUniform(this.programs.biome, 'u_biome'), this.gameState.biome);
        gl.uniform3fv(this._getUniform(this.programs.biome, 'u_color'), this.gameState.biomeColor);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      // Pass 3: Active shockwaves
      if (this.programs.shock) {
        var now = performance.now();
        this.activeShocks = this.activeShocks.filter(function(s) {
          var elapsed = (now - s.startTime) / 1000.0;
          if (elapsed > 1.5) return false;

          this._bindQuad(this.programs.shock);
          gl.uniform1f(this._getUniform(this.programs.shock, 'u_time'), elapsed);
          gl.uniform1f(this._getUniform(this.programs.shock, 'u_damage'), s.damage);
          gl.uniform3f(this._getUniform(this.programs.shock, 'u_pos'), s.x, s.y, 0.0);
          gl.uniform1f(this._getUniform(this.programs.shock, 'u_isCritical'), s.isCritical);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          return true;
        }.bind(this));
      }
    }

    startLoop() {
      var self = this;
      function frame() {
        self.render();
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
  }

  // ===== DERIVED CSS CUSTOM PROPERTY SYSTEM =====
  // These functions compute CSS values from game semantics

  var DERIVED = {
    // Team color → HSL derivation from archetype meaning
    teamColors: {
      'Overchargers':  { h: 340, s: 85, l: 55 }, // red-pink: aggression, heat
      'Fortress':      { h: 145, s: 90, l: 50 }, // green: defense, growth
      'Control':       { h: 190, s: 85, l: 55 }, // blue: intellect, control
      'Synergy':       { h: 280, s: 80, l: 55 }, // purple: magic, connection
      'Economy':       { h: 50,  s: 90, l: 55 }, // gold: wealth, value
      'Chaos':         { h: 20,  s: 85, l: 55 }, // orange: entropy, chaos
      'Synth Legends': { h: 175, s: 90, l: 60 }, // cyan: legend, purity
      'Titanborn':     { h: 30,  s: 90, l: 50 }, // orange-brown: earth, mass
      'Neutral':       { h: 220, s: 10, l: 60 }  // gray: versatility
    },

    // Rarity → glow equation: glow = tier^2 * (0.5 + sin(t)*0.3)
    rarityTiers: {
      common:    { tier: 0, glowMax: 0.0,  borderWidth: 1, shadowBlur: 0 },
      uncommon:  { tier: 1, glowMax: 0.08, borderWidth: 1, shadowBlur: 4 },
      rare:      { tier: 2, glowMax: 0.15, borderWidth: 2, shadowBlur: 8 },
      epic:      { tier: 3, glowMax: 0.25, borderWidth: 2, shadowBlur: 14 },
      legendary: { tier: 4, glowMax: 0.40, borderWidth: 3, shadowBlur: 22 },
      mythic:    { tier: 5, glowMax: 0.60, borderWidth: 3, shadowBlur: 32 }
    },

    // Biome → shader parameter derivation
    biomeParams: {
      cyber:    { noiseFreq: 200, flowSpeed: 0.3, distortion: 0.8, color: [0.0, 0.85, 1.0] },
      desert:   { noiseFreq: 30,  flowSpeed: 0.2, distortion: 0.5, color: [1.0, 0.5, 0.2] },
      fog:      { noiseFreq: 8,   flowSpeed: 0.1, distortion: 0.3, color: [0.5, 0.5, 0.6] },
      neon:     { noiseFreq: 15,  flowSpeed: 0.4, distortion: 1.0, color: [1.0, 0.1, 0.5] },
      golden:   { noiseFreq: 20,  flowSpeed: 0.15,distortion: 0.4, color: [1.0, 0.84, 0.0] },
      gravity:  { noiseFreq: 12,  flowSpeed: 0.25,distortion: 1.2, color: [0.7, 0.1, 1.0] },
      fire:     { noiseFreq: 40,  flowSpeed: 0.5, distortion: 0.9, color: [1.0, 0.4, 0.1] }
    },

    // Convert HSL to hex string for CSS
    hslToHex: function(h, s, l) {
      s /= 100; l /= 100;
      var k = function(n) { return (n + h / 30) % 12; };
      var a = s * Math.min(l, 1 - l);
      var f = function(n) {
        var color = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return '#' + f(0) + f(8) + f(4);
    },

    // Get team color as CSS variable
    getTeamColor: function(team) {
      var c = this.teamColors[team] || this.teamColors['Neutral'];
      return this.hslToHex(c.h, c.s, c.l);
    },

    // Get team glow color (brighter version)
    getTeamGlow: function(team) {
      var c = this.teamColors[team] || this.teamColors['Neutral'];
      return this.hslToHex(c.h, c.s, Math.min(80, c.l + 20));
    },

    // Get rarity glow equation result at time t
    getRarityGlow: function(rarity, t) {
      var r = this.rarityTiers[rarity] || this.rarityTiers['common'];
      var tier = r.tier;
      var glow = (tier * tier / 25) * (0.5 + Math.sin(t || 0) * 0.3);
      return Math.max(0, glow);
    },

    // HP percentage → pulse frequency equation: freq = 2 + (1-hp)^2 * 10
    getHpPulseFreq: function(hpRatio) {
      var deficit = Math.max(0, 1 - hpRatio);
      return 2 + deficit * deficit * 10;
    },

    // HP percentage → danger color interpolation
    getHpColor: function(hpRatio) {
      if (hpRatio > 0.6) return '#05ffa1'; // green
      if (hpRatio > 0.3) return '#ffd700'; // gold
      return '#ff2a6d'; // red
    },

    // Mana ratio → shimmer intensity: intensity = (mana/max)^0.5
    getManaShimmer: function(mana, maxMana) {
      if (maxMana <= 0) return 0;
      return Math.pow(mana / maxMana, 0.5);
    },

    // Power → energy color: shifts from blue (low) to gold (high) to red (max)
    getPowerColor: function(power, maxPower) {
      var r = maxPower > 0 ? power / maxPower : 0;
      if (r < 0.5) {
        // blue to gold
        return this._lerpColor('#00d9ff', '#ffd700', r * 2);
      } else {
        // gold to red
        return this._lerpColor('#ffd700', '#ff2a6d', (r - 0.5) * 2);
      }
    },

    _lerpColor: function(c1, c2, t) {
      t = Math.max(0, Math.min(1, t));
      var r1 = parseInt(c1.substr(1, 2), 16);
      var g1 = parseInt(c1.substr(3, 2), 16);
      var b1 = parseInt(c1.substr(5, 2), 16);
      var r2 = parseInt(c2.substr(1, 2), 16);
      var g2 = parseInt(c2.substr(3, 2), 16);
      var b2 = parseInt(c2.substr(5, 2), 16);
      var r = Math.round(r1 + (r2 - r1) * t);
      var g = Math.round(g1 + (g2 - g1) * t);
      var b = Math.round(b1 + (b2 - b1) * t);
      return '#' + r.toString(16).padStart(2,'0') + g.toString(16).padStart(2,'0') + b.toString(16).padStart(2,'0');
    },

    // Apply derived CSS variables to a DOM element based on card data
    applyCardShaders: function(el, card, opts) {
      if (!el || !card) return;
      opts = opts || {};
      var teamColor = this.getTeamColor(card.team);
      var teamGlow = this.getTeamGlow(card.team);
      var rarityData = this.rarityTiers[card.rarity] || this.rarityTiers['common'];

      el.style.setProperty('--shader-team-color', teamColor);
      el.style.setProperty('--shader-team-glow', teamGlow);
      el.style.setProperty('--shader-rarity-tier', rarityData.tier);
      el.style.setProperty('--shader-rarity-glow', rarityData.glowMax + 'px');
      el.style.setProperty('--shader-rarity-border', rarityData.borderWidth + 'px');
      el.style.setProperty('--shader-rarity-shadow', rarityData.shadowBlur + 'px');

      // HP-based properties for creatures
      if (card.type === 'Creature' && opts.hp !== undefined && opts.maxHp !== undefined) {
        var hpRatio = opts.maxHp > 0 ? opts.hp / opts.maxHp : 1;
        el.style.setProperty('--shader-hp-ratio', hpRatio);
        el.style.setProperty('--shader-hp-color', this.getHpColor(hpRatio));
        el.style.setProperty('--shader-hp-pulse-freq', this.getHpPulseFreq(hpRatio) + 'Hz');
      }

      // Selected state
      if (opts.selected) {
        el.style.setProperty('--shader-selected', '1');
      } else {
        el.style.setProperty('--shader-selected', '0');
      }

      // Playable state
      if (opts.playable) {
        el.style.setProperty('--shader-playable', '1');
      } else {
        el.style.setProperty('--shader-playable', '0');
      }

      // Frozen
      if (opts.frozen) {
        el.style.setProperty('--shader-frozen', '1');
      } else {
        el.style.setProperty('--shader-frozen', '0');
      }
    },

    // Apply derived CSS variables to a player bar based on game state
    applyPlayerBarShaders: function(el, player, isEnemy) {
      if (!el || !player) return;
      var hpRatio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
      var manaRatio = player.maxMana > 0 ? player.mana / player.maxMana : 0;
      var powerRatio = player.maxPower > 0 ? player.power / player.maxPower : 0;

      el.style.setProperty('--shader-hp-ratio', hpRatio);
      el.style.setProperty('--shader-hp-color', this.getHpColor(hpRatio));
      el.style.setProperty('--shader-hp-pulse-freq', this.getHpPulseFreq(hpRatio) + 'Hz');
      el.style.setProperty('--shader-mana-shimmer', this.getManaShimmer(player.mana, player.maxMana));
      el.style.setProperty('--shader-power-color', this.getPowerColor(player.power, player.maxPower));
      el.style.setProperty('--shader-is-enemy', isEnemy ? '1' : '0');

      if (player.shield > 0) {
        el.style.setProperty('--shader-shield', player.shield);
        el.style.setProperty('--shader-shield-glow', Math.min(1, player.shield / 5) + 'px');
      } else {
        el.style.setProperty('--shader-shield', '0');
        el.style.setProperty('--shader-shield-glow', '0px');
      }
    },

    // Apply biome shader variables to the battle arena
    applyBiomeShaders: function(el, battleground) {
      if (!el) return;
      var biome = 'cyber';
      if (battleground && battleground.biome) biome = battleground.biome;
      var params = this.biomeParams[biome] || this.biomeParams['cyber'];

      el.style.setProperty('--shader-biome-noise-freq', params.noiseFreq);
      el.style.setProperty('--shader-biome-flow-speed', params.flowSpeed);
      el.style.setProperty('--shader-biome-distortion', params.distortion);
      el.style.setProperty('--shader-biome-color-r', params.color[0]);
      el.style.setProperty('--shader-biome-color-g', params.color[1]);
      el.style.setProperty('--shader-biome-color-b', params.color[2]);
    }
  };

  // ===== GLOBAL INSTANCE =====
  var engine = new ShaderEngine();

  return {
    engine: engine,
    DERIVED: DERIVED,

    init: function(canvasId) {
      return engine.init(canvasId);
    },

    updateState: function(game) {
      engine.updateState(game);
    },

    addShockwave: function(x, y, damage, isCritical) {
      engine.addShockwave(x, y, damage, isCritical);
    },

    startLoop: function() {
      engine.startLoop();
    },

    // Apply shader-derived CSS to all cards on screen
    refreshCardShaders: function() {
      if (typeof ui === 'undefined' || !ui.game) return;
      var self = this;

      // Apply to all card elements with data-id (covers market, hand, field)
      var cardEls = document.querySelectorAll('.card[data-id]');
      cardEls.forEach(function(el) {
        var cardId = el.dataset.id;
        var instId = el.dataset.instance;
        var card = null;

        // Search player hand
        if (ui.game.player) {
          card = ui.game.player.hand.find(function(c) {
            return c.instanceId === instId || c.id === cardId;
          });
          // Search player field
          if (!card) {
            ui.game.player.field.battle.forEach(function(c) {
              if (c && (c.instanceId === instId || c.id === cardId)) card = c;
            });
          }
        }
        // Search enemy field
        if (!card && ui.game.enemy) {
          ui.game.enemy.field.battle.forEach(function(c) {
            if (c && (c.instanceId === instId || c.id === cardId)) card = c;
          });
        }
        // Search market cards
        if (!card && ui.game.currentMarket) {
          card = ui.game.currentMarket.find(function(c) {
            return c.instanceId === instId || c.id === cardId;
          });
        }

        if (!card) return;

        var opts = {};
        if (card.currentHp !== undefined && card.health > 0) {
          opts.hp = card.currentHp;
          opts.maxHp = card.health;
        }
        opts.frozen = card.frozenTurns && card.frozenTurns > 0;
        opts.selected = ui.selectedAttacker && ui.selectedAttacker.instanceId === instId;

        // Playable check for player hand cards
        if (ui.game.player && ui.game.player.hand.some(function(c) {
          return c.instanceId === instId || c.id === cardId;
        })) {
          var cost = ui.game.getEffectiveCost(ui.game.player, card);
          opts.playable = ui.game.player.power >= cost;
        }

        // For market cards, check affordability
        if (!opts.playable && ui.game.currentMarket && ui.game.currentMarket.indexOf(card) >= 0) {
          var marketCost = card.cost !== undefined ? card.cost : (card.power || 0);
          opts.playable = ui.game.player && ui.game.player.mana >= marketCost;
        }

        DERIVED.applyCardShaders(el, card, opts);
      });

      // Apply to player and enemy bars
      var playerBar = document.getElementById('player-bar');
      var enemyBar = document.getElementById('enemy-bar');
      if (playerBar && ui.game.player) DERIVED.applyPlayerBarShaders(playerBar, ui.game.player, false);
      if (enemyBar && ui.game.enemy) DERIVED.applyPlayerBarShaders(enemyBar, ui.game.enemy, true);

      // Apply biome shaders to arena
      var arena = document.getElementById('battle-arena');
      if (arena && ui.game) DERIVED.applyBiomeShaders(arena, ui.game.battleground);
    }
  };
})();

if (typeof module !== 'undefined') {
  module.exports = { SynthShaderEngine };
}