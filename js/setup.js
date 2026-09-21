/**
 * Eunonymous-TCG — Battle setup, Shop, Login transition  (js/setup.js)
 * =====================================================================
 * Inserts the screen between the BATTLE button and the match itself:
 *
 *   home ──[BATTLE]──▶ setup (mode · deck · opponent · field vote)
 *                      ──[ENTER MATCH]──▶ login transition (1s, artwork)
 *                      ──▶ existing showdown / launchBattle
 *
 * Also owns the player PROFILE (persistent) and the SHOP (faction card backs,
 * unlocked by winning one match with that faction — free, as specified).
 *
 * Requires: js/factions.js loaded first (FactionRegistry), and the inline `ui`.
 */
(function () {
  'use strict';

  const STORE = 'eunonymous_profile';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // -------------------------------------------------------------------------
  // Player profile — persistent, versioned, and the single place user data lives.
  // -------------------------------------------------------------------------
  const Profile = {
    data: null,

    defaults() {
      return {
        schemaVersion: 1,
        gameVersion: (typeof GAME_VERSION !== 'undefined') ? GAME_VERSION : 'dev',
        name: 'Commander',
        createdAt: new Date().toISOString(),
        battles: 0,
        wins: 0,
        losses: 0,
        factionWins: {},          // factionId -> wins
        factionBattles: {},       // factionId -> battles
        unlocks: { cardBacks: {} }, // factionId -> true once earned
        history: [],              // recent matches (capped)
      };
    },

    load() {
      try {
        const raw = JSON.parse(localStorage.getItem(STORE));
        if (raw && typeof raw === 'object') {
          // shallow-merge onto defaults so new fields appear for old profiles
          const base = this.defaults();
          this.data = Object.assign(base, raw);
          this.data.unlocks = Object.assign({ cardBacks: {} }, raw.unlocks || {});
        } else {
          this.data = this.defaults();
        }
      } catch (e) {
        this.data = this.defaults();
      }
      return this.data;
    },

    save() {
      try { localStorage.setItem(STORE, JSON.stringify(this.data)); } catch (e) { /* quota */ }
    },

    /** Called at end of match. Returns the list of unlocks newly earned. */
    recordMatch({ win, factionId, mode, opponentName, turns }) {
      const d = this.data;
      d.battles++;
      if (win) d.wins++; else d.losses++;
      if (factionId) {
        d.factionBattles[factionId] = (d.factionBattles[factionId] || 0) + 1;
        if (win) d.factionWins[factionId] = (d.factionWins[factionId] || 0) + 1;
      }
      const earned = [];
      // Free faction card back after ONE victory with that faction.
      if (win && factionId && !d.unlocks.cardBacks[factionId]) {
        d.unlocks.cardBacks[factionId] = true;
        earned.push(factionId);
      }
      d.history.unshift({
        at: new Date().toISOString(), win: !!win, faction: factionId || null,
        mode: mode || 'ai', opponent: opponentName || 'AI', turns: turns || 0,
        version: (typeof GAME_VERSION !== 'undefined') ? GAME_VERSION : 'dev',
      });
      d.history = d.history.slice(0, 50);
      this.save();
      return earned;
    },

    hasCardBack(factionId) { return !!(this.data.unlocks.cardBacks || {})[factionId]; },
    factionWins(factionId) { return (this.data.factionWins || {})[factionId] || 0; },
  };

  // -------------------------------------------------------------------------
  // AI opponents — profiles with an intelligence degree, rank, MMR and tactics.
  // `intelligence` 1..5 drives the engine's aiStyle; `favourite` biases its deck
  // and its field vote. MMR is the number shown in matchmaking/leaderboards.
  // -------------------------------------------------------------------------
  const AI_PROFILES = [
    { id: 'rookie',  name: 'Rookie',   intelligence: 1, rank: 'Bronze',  mmr: 900,
      favourite: ['Cyborg'],                tactics: 'Curve-out aggro. Over-commits to the board.',
      style: 'aggro',   blurb: 'Plays on instinct. Punish its over-extension.' },
    { id: 'adept',   name: 'Adept',    intelligence: 2, rank: 'Silver',  mmr: 1150,
      favourite: ['Synthetic', 'Biopure'],  tactics: 'Trades efficiently. Holds back until it has tempo.',
      style: 'balanced', blurb: 'Solid fundamentals, no long plan.' },
    { id: 'tactician', name: 'Tactician', intelligence: 3, rank: 'Gold', mmr: 1400,
      favourite: ['Organizer', 'Refinist'], tactics: 'Builds engines. Values card advantage over tempo.',
      style: 'control',  blurb: 'Will out-value you if the game goes long.' },
    { id: 'vaultkeeper', name: 'VaultKeeper', intelligence: 4, rank: 'Platinum', mmr: 1680,
      favourite: ['Biopure', 'Architecte'], tactics: 'Fortress walls and heal loops. Wins by attrition.',
      style: 'tank',    blurb: 'Grinds. Do not try to race it.' },
    { id: 'schemist', name: 'The Schemist', intelligence: 5, rank: 'Diamond', mmr: 1950,
      favourite: ['Schemist', 'Technopriest'], tactics: 'Trap-forward tempo denial with a 3-turn kill plan.',
      style: 'control', blurb: 'Has already decided the winning line.' },
    { id: 'archon',  name: 'Archon',    intelligence: 5, rank: 'Master', mmr: 2210,
      favourite: ['Ethereal', 'Memetic'],   tactics: 'Reads your deck and denies your win condition.',
      style: 'control', blurb: 'Adaptive. Expect it to counter whatever you build.' },
  ];

  const MODES = [
    { id: '1v1',      icon: '⚔️', name: '1v1 — Player vs Player', desc: 'Hotseat locally, or use NET PLAY for LAN.' },
    { id: 'ai',       icon: '🤖', name: 'Player vs AI',           desc: 'Pick an opponent and its intelligence.' },
    { id: 'conflict', icon: '🏆', name: 'Conflict — Tournament',  desc: 'Battleground / TFT-style elimination.' },
    { id: 'aivai',    icon: '🎬', name: 'AI vs AI — Spectator',   desc: 'Two AIs play; watch and analyse.' },
  ];

  /** Modes the engine can actually run today. Others are selectable but flagged. */
  const MODE_IMPLEMENTED = { '1v1': true, ai: true, conflict: false, aivai: false };

  const Setup = {
    mode: 'ai',
    aiId: 'adept',
    myField: null,
    oppField: null,
    active: false,
  };

  function ui_() { return (typeof ui !== 'undefined') ? ui : null; }
  function F() { return (typeof FactionRegistry !== 'undefined') ? FactionRegistry : null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function myFaction() {
    const u = ui_();
    return (u && u.selectedCharacter) || (u && u.game && u.game.player && u.game.player.character) || null;
  }
  function myDeckName() {
    const u = ui_();
    if (!u) return '—';
    if (u.selectedDeckName) return u.selectedDeckName;
    if (Array.isArray(u.deck) && u.deck.length) return 'Custom (' + u.deck.length + ' cards)';
    return 'Random 40';
  }
  function fields() {
    const u = ui_();
    if (u && Array.isArray(u.BATTLEGROUNDS)) return u.BATTLEGROUNDS;
    if (typeof BATTLEGROUNDS !== 'undefined') return BATTLEGROUNDS;
    return [];
  }
  function aiProfile() {
    return AI_PROFILES.find((a) => a.id === Setup.aiId) || AI_PROFILES[1];
  }

  // -------------------------------------------------------------------------
  // Screen scaffolding (injected, so index.html stays untouched where possible)
  // -------------------------------------------------------------------------
  function makeScreen(id, inner) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = 'screen';
      document.body.appendChild(el);
    }
    el.innerHTML = inner;
    return el;
  }

  function renderSetup() {
    const fac = myFaction();
    const fr = F();
    const ai = aiProfile();
    const bg = fields();
    const myPal = (fr && fac && fr.FACTIONS[fac]) ? fr.FACTIONS[fac].palette : null;

    makeScreen('setup-screen',
      '<div class="setup-head">' +
        '<h2>Battle Setup</h2>' +
        '<div class="vote-note">' + esc(Profile.data.name) + ' · ' + Profile.data.wins + 'W / ' + Profile.data.losses + 'L</div>' +
      '</div>' +
      '<div class="setup-body">' +

        // ---- LEFT: you -------------------------------------------------
        '<div class="setup-col">' +
          '<div class="setup-panel">' +
            '<h3>You</h3>' +
            '<div class="who-card" style="--fx-primary:' + (myPal ? myPal.primary : '#00d9ff') + ';--fx-edge:' + (myPal ? myPal.edge : '#0af') + '">' +
              '<div class="who-avatar">' + (fr && fac ? fr.factionIconSVG(fac, { size: 34 }) : '🦾') + '</div>' +
              '<div><div class="who-name">' + esc(fac || 'No faction') + '</div>' +
              '<div class="who-meta">' + esc(Profile.data.name) + ' · ' + esc(myDeckName()) + '</div></div>' +
            '</div>' +
          '</div>' +
          '<div class="setup-panel">' +
            '<h3>Your deck</h3>' +
            '<div class="setup-row"><span class="lbl">Deck</span><span class="val">' + esc(myDeckName()) + '</span></div>' +
            '<div class="setup-row"><span class="lbl">Faction</span><span class="val">' + esc(fac || '—') + '</span></div>' +
            '<button class="mode-tile" onclick="ui.showScreen(\'deckbuilder\')"><b>Change in Deck Builder →</b>' +
            '<span>Pick your faction and rebuild your 40.</span></button>' +
          '</div>' +
        '</div>' +

        // ---- CENTER: mode + field vote ---------------------------------
        '<div class="setup-col center">' +
          '<div class="setup-panel">' +
            '<h3>Game mode</h3>' +
            '<div class="mode-grid">' +
              MODES.map((m) => {
                const impl = MODE_IMPLEMENTED[m.id];
                return '<button class="mode-tile' + (Setup.mode === m.id ? ' selected' : '') + '" ' +
                  'onclick="ui.setupSetMode(\'' + m.id + '\')">' +
                  '<span class="mt-icon">' + m.icon + '</span>' +
                  '<b>' + esc(m.name) + '</b>' +
                  '<span>' + esc(m.desc) + (impl ? '' : ' <em style="color:#ffd700">prototype</em>') + '</span>' +
                  '</button>';
              }).join('') +
            '</div>' +
          '</div>' +
          '<div class="setup-panel">' +
            '<h3>Field vote</h3>' +
            '<div class="field-grid">' +
              bg.slice(0, 8).map((b) => {
                const sel = Setup.myField === b.id;
                return '<button class="field-tile' + (sel ? ' selected' : '') + '" onclick="ui.setupVoteField(\'' + b.id + '\')">' +
                  '<div class="ft-swatch" style="background:linear-gradient(160deg,' + (b.color || '#123') + ', #04060c)"></div>' +
                  '<div class="ft-name">' + esc(b.name || b.id) + '</div></button>';
              }).join('') +
            '</div>' +
            '<div class="vote-note">Both sides vote. Agreement picks the field; disagreement rolls between the two.</div>' +
          '</div>' +
        '</div>' +

        // ---- RIGHT: opponent ------------------------------------------
        '<div class="setup-col">' +
          '<div class="setup-panel">' +
            '<h3>Opponent</h3>' +
            '<div class="who-card">' +
              '<div class="who-avatar">' + (Setup.mode === 'ai' ? '🤖' : '👤') + '</div>' +
              '<div><div class="who-name">' + esc(Setup.mode === 'ai' ? ai.name : (Setup.mode === 'aivai' ? ai.name + ' vs ' + AI_PROFILES[0].name : 'Player 2')) + '</div>' +
              '<div class="who-meta">' + (Setup.mode === 'ai' ? esc(ai.rank) + ' · ' + ai.mmr + ' MMR' : 'local') + '</div></div>' +
            '</div>' +
            (Setup.mode === 'ai'
              ? '<div class="setup-row"><span class="lbl">Intelligence</span><span class="val">' + '★'.repeat(ai.intelligence) + '☆'.repeat(5 - ai.intelligence) + ' (' + ai.intelligence + '/5)</span></div>' +
                '<div class="setup-row"><span class="lbl">Tactics</span><span class="val" style="white-space:normal;text-align:left;font-weight:400;opacity:.8">' + esc(ai.tactics) + '</span></div>' +
                '<button class="mode-tile" onclick="ui.setupCycleAI()"><b>Cycle opponent →</b><span>' + esc(ai.blurb) + '</span></button>'
              : '') +
          '</div>' +
          (Setup.mode === 'conflict'
            ? '<div class="setup-panel"><h3>Conflict</h3><div class="vote-note">Tournament elimination. <b style="color:#ffd700">Prototype</b> — currently resolves as a 1v1 duel.</div></div>'
            : '') +
          (Setup.mode === 'aivai'
            ? '<div class="setup-panel"><h3>Spectate</h3><div class="vote-note">Two AI profiles fight; you watch. <b style="color:#ffd700">Prototype</b> — currently resolves as a 1v1 duel.</div></div>'
            : '') +
        '</div>' +

      '</div>' +
      '<div class="setup-actions">' +
        '<button class="btn-primary" onclick="ui.setupConfirm()">' +
          (MODE_IMPLEMENTED[Setup.mode] ? 'Enter Match ▶' : 'Enter Match (prototype) ▶') +
        '</button>' +
      '</div>'
    );
  }

  // -------------------------------------------------------------------------
  // Shop — faction card backs, unlocked free by winning once with that faction.
  // -------------------------------------------------------------------------
  function renderShop() {
    const fr = F();
    if (!fr) return;
    makeScreen('shop-screen',
      '<div class="setup-head">' +
        '<h2>Shop — Card Backs</h2>' +
        '<div class="vote-note">Win one match with a faction to unlock its back. Free.</div>' +
      '</div>' +
      '<div class="shop-grid">' +
        fr.FACTION_LIST.map((id) => {
          const f = fr.FACTIONS[id];
          const unlocked = Profile.hasCardBack(id);
          const wins = Profile.factionWins(id);
          return '<div class="shop-item">' +
            '<div class="faction-cardback' + (unlocked ? '' : ' is-locked') + '" style="--fx-edge:' + f.palette.edge + ';' + fr.factionCardBackStyle(id) + '">' +
              fr.factionIconSVG(id, { size: 44 }) +
            '</div>' +
            '<div class="si-name">' + esc(f.name) + '</div>' +
            '<div class="si-state' + (unlocked ? ' unlocked' : '') + '">' +
              (unlocked ? '✓ Unlocked' : (wins ? wins + ' win' + (wins > 1 ? 's' : '') : 'Locked')) + '</div>' +
            '<button disabled>' + (unlocked ? 'Owned' : 'Win with ' + esc(f.name)) + '</button>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div class="setup-actions"><button class="mode-tile" onclick="ui.showScreen(\'title\')"><b>← Back to menu</b></button></div>'
    );
  }

  // -------------------------------------------------------------------------
  // Login / loading transition — exactly 1s, with background artwork.
  // -------------------------------------------------------------------------
  const Login = {
    el: null,
    build() {
      if (this.el) return this.el;
      const d = document.createElement('div');
      d.id = 'login-overlay';
      d.innerHTML =
        '<div class="lo-scrim"></div>' +
        '<div class="lo-inner">' +
          '<div class="lo-mark"></div>' +
          '<div class="lo-title">Eunonymous</div>' +
          '<div class="lo-vs"></div>' +
          '<div class="lo-bar"><i></i></div>' +
          '<div class="lo-status">Entering the vault…</div>' +
        '</div>';
      document.body.appendChild(d);
      this.el = d;
      return d;
    },
    /** Show for `ms`, then resolve. Artwork = faction tint + field gradient. */
    async show({ title, subtitle, status, faction, ms }) {
      const d = this.build();
      const fr = F();
      d.querySelector('.lo-title').textContent = title || 'Eunonymous';
      d.querySelector('.lo-vs').textContent = subtitle || '';
      d.querySelector('.lo-status').textContent = status || 'Entering the vault…';
      d.querySelector('.lo-mark').innerHTML =
        (fr && faction) ? fr.factionIconSVG(faction, { size: 72 }) : '';
      d.style.backgroundImage =
        (fr && faction) ? fr.factionFieldTint(faction).replace(/^background-image:/, '') : '';
      // restart the fill animation
      const bar = d.querySelector('.lo-bar > i');
      bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
      d.classList.add('active');
      await sleep(ms || 1000);
      d.classList.remove('active');
    },
  };

  // -------------------------------------------------------------------------
  // Public API (attached to `ui` so the existing onclick handlers can reach it)
  // -------------------------------------------------------------------------
  function attach() {
    const u = ui_();
    if (!u) return false;

    u.openBattleSetup = function () {
      Setup.active = true;
      // Default the field vote to whatever the player already picked, else first.
      const bg = fields();
      if (!Setup.myField && bg.length) Setup.myField = bg[0].id;
      renderSetup();
      u.showScreen('setup');
    };

    u.setupSetMode = function (id) {
      Setup.mode = id;
      // Reflect the mode on the engine's own mode switch where it matters.
      const uu = ui_();
      if (uu) uu.gameMode = (id === 'ai') ? 'bot' : 'casual';
      renderSetup();
    };

    u.setupCycleAI = function () {
      const i = AI_PROFILES.findIndex((a) => a.id === Setup.aiId);
      Setup.aiId = AI_PROFILES[(i + 1) % AI_PROFILES.length].id;
      renderSetup();
    };

    u.setupVoteField = function (id) {
      Setup.myField = id;
      renderSetup();
    };

    u.openShop = function () {
      renderShop();
      u.showScreen('shop');
    };

    /** Resolve the field vote, then run the login transition and start the match. */
    u.setupConfirm = async function () {
      const uu = ui_();
      const bg = fields();
      const ai = aiProfile();

      // --- field vote -----------------------------------------------------
      Setup.oppField = bg.length ? bg[Math.floor(Math.random() * bg.length)].id : null;
      let chosen = Setup.myField;
      let voteNote = 'Unanimous — ' + chosen;
      if (Setup.oppField && Setup.oppField !== Setup.myField) {
        chosen = Math.random() < 0.5 ? Setup.myField : Setup.oppField;
        voteNote = 'Split vote — decided by roll: ' + chosen;
      }
      const field = bg.find((b) => b.id === chosen) || null;
      if (uu && typeof uu.selectBattleground === 'function' && field) uu.selectBattleground(field.id);
      else if (uu) uu.selectedBattleground = field;

      // --- opponent wiring -------------------------------------------------
      if (uu) {
        uu.selectedOpponent = (Setup.mode === 'ai' || Setup.mode === 'aivai') ? ai.style : 'random';
        if (uu.game && uu.game.enemy) uu.game.enemy.aiStyle = uu.selectedOpponent;
      }

      // --- 1s login transition --------------------------------------------
      const fac = myFaction();
      await Login.show({
        title: 'Eunonymous',
        subtitle: (Setup.mode === 'ai' || Setup.mode === 'aivai')
          ? (Profile.data.name + '  vs  ' + ai.name + '  ·  ' + field?.name || 'Standard')
          : (Profile.data.name + '  vs  Player 2  ·  ' + (field ? field.name : 'Standard')),
        status: Setup.mode === 'conflict' ? 'Conflict — prototype duel'
              : Setup.mode === 'aivai'   ? 'Spectator — AI vs AI prototype'
              : 'Entering the vault…',
        faction: fac,
        ms: 1000,
      });

      // --- hand off to the existing, already-tested match start ------------
      try {
        if (uu && typeof uu.launchBattle === 'function') uu.launchBattle();
      } catch (e) {
        console.warn('[setup] launchBattle failed:', e && e.message);
      }
      return voteNote;
    };

    /** Called by the game over screen. Records the result + awards unlocks. */
    u.setupRecordResult = function (win) {
      const uu = ui_();
      const fac = myFaction();
      const ai = aiProfile();
      const earned = Profile.recordMatch({
        win: !!win,
        factionId: fac,
        mode: Setup.mode,
        opponentName: (Setup.mode === 'ai' ? ai.name : 'Player 2'),
        turns: (uu && uu.game) ? uu.game.turnCount : 0,
      });
      if (earned.length) {
        const fr = F();
        const names = earned.map((id) => (fr && fr.FACTIONS[id] ? fr.FACTIONS[id].name : id)).join(', ');
        if (uu && uu.toast) uu.toast('🏆 Card back unlocked: ' + names + '!', 'success');
      }
      renderShop();
      return earned;
    };

    return true;
  }

  // -------------------------------------------------------------------------
  // Boot — retry until `ui` exists (this script runs before the inline UI).
  // -------------------------------------------------------------------------
  function boot() {
    Profile.load();
    if (!attach()) { setTimeout(boot, 60); return; }
    window.SetupRegistry = { Setup, Profile, AI_PROFILES, MODES, Login };
    console.log('[setup] ready — profile: ' + Profile.data.name + ', ' + Profile.data.wins + 'W/' + Profile.data.losses + 'L');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();