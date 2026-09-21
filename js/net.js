/**
 * Eunonymous-TCG — LAN Netcode  (js/net.js)
 * ========================================
 * Host-authoritative state mirror over a WebSocket room.
 *
 *   • HOST  runs the real GameEngine and is the single source of truth.
 *           After every meaningful change it broadcasts a full state snapshot.
 *   • GUEST runs NO game logic. It renders whatever the host sends and forwards
 *           its own actions ("buy X", "attack Y", "end turn") back to the host.
 *
 * The guest swaps player/enemy on receive, so each machine always sees ITSELF at
 * the bottom of the board — the UI code is written from the local player's POV
 * and needs no changes.
 *
 * IMPORTANT: `ui` and `GameEngine` are top-level `const`/`class` in classic
 * scripts. They live in the GLOBAL LEXICAL ENVIRONMENT, not on `window`, so they
 * must be referenced by bare name (see U() / EngineRef() below) — `window.ui` is
 * undefined.
 *
 * Requires: index.html's inline UI (`ui`) and js/game.js (`GameEngine`) first.
 * Loaded last, right before </body>.
 *
 * Payload protocol (opaque to the relay server):
 *   {k:'hello', name, deck}    both  — announce + share deck
 *   {k:'requestDeck'}          host  — ask guest for its current deck
 *   {k:'deck', cards:[...]}    guest — current deck (array of card objects)
 *   {k:'start', deck}          host  — match starting
 *   {k:'snap', g:{...}, full}  host  — authoritative state snapshot
 *   {k:'act', a:{...}}         guest — a player action to apply
 *   {k:'chat', text}           both  — lobby chat
 */
(function () {
  'use strict';

  var WS_PATH = '/ws';

  // --- accessors for globals that live in the global lexical environment ---
  function U() { return (typeof ui !== 'undefined') ? ui : null; }
  function EngineCls() { return (typeof GameEngine !== 'undefined') ? GameEngine : null; }

  var Net = {
    mode: 'offline',        // 'offline' | 'host' | 'guest'
    ws: null,
    room: null,
    lane: null,
    connected: false,
    peerPresent: false,
    peerName: null,
    remoteDeck: null,       // host: the guest's deck
    myName: 'Commander',
    inMatch: false,
    _applying: false,
    _dirty: false,
    _lastFullAt: 0,
    _flushTimer: null,
    _safetyTimer: null,
    _pingTimer: null,
    _orig: {},
    _patched: false,
    _panel: null,
    _els: {},
    _startWhenDeckArrives: false
  };

  function log() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('%c[NET]', 'color:#00d9ff;font-weight:bold');
    console.log.apply(console, args);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function wsUrl() {
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return proto + '//' + location.host + WS_PATH;
  }

  // -------------------------------------------------------------------------
  // Snapshot / apply
  // -------------------------------------------------------------------------
  function snapshot(g, full) {
    var s = {
      state: g.state,
      phase: g.phase,
      gameMode: g.gameMode,
      turnCount: g.turnCount,
      turnTimer: g.turnTimer,
      maxTurnTimer: g.maxTurnTimer,
      winCondition: g.winCondition,
      dangerLevel: g.dangerLevel,
      _nextDangerTurn: g._nextDangerTurn,
      _instanceCounter: g._instanceCounter,
      gameStartTime: g.gameStartTime,
      applyBGRules: g.applyBGRules,
      battleground: g.battleground,
      cur: g.currentPlayer === g.enemy ? 'enemy' : 'player',
      player: g.player,
      enemy: g.enemy,
      currentMarket: g.currentMarket,
      battleLog: g.battleLog,
      battleHistory: g.battleHistory,
      pendingDangers: g.pendingDangers,
      shownCardIds: Array.from(g.shownCardIds || [])
    };
    if (full) s.metaDeck = g.metaDeck;
    return s;
  }

  function applySnapshot(g, s, uiObj) {
    Net._applying = true;
    try {
      var selAtkId = uiObj && uiObj.selectedAttacker ? uiObj.selectedAttacker.instanceId : null;
      var selCardId = uiObj && uiObj.selectedCard ? uiObj.selectedCard.instanceId : null;

      g.state = s.state;
      g.phase = s.phase;
      g.gameMode = s.gameMode || '1v1';
      g.turnCount = s.turnCount;
      g.turnTimer = s.turnTimer;
      g.maxTurnTimer = s.maxTurnTimer || g.maxTurnTimer;
      g.winCondition = s.winCondition;
      g.dangerLevel = s.dangerLevel;
      g._nextDangerTurn = s._nextDangerTurn;
      g._instanceCounter = s._instanceCounter;
      g.gameStartTime = s.gameStartTime;
      g.applyBGRules = s.applyBGRules;
      g.battleground = s.battleground;
      g.pendingDangers = s.pendingDangers || [];
      g.battleLog = s.battleLog || [];
      g.battleHistory = s.battleHistory || [];
      g.currentMarket = s.currentMarket || [];

      // ---- The swap: the host's own side becomes the guest's opponent. ----
      g.player = s.enemy;
      g.enemy = s.player;
      g.currentPlayer = (s.cur === 'player') ? g.enemy : g.player;

      if (s.metaDeck) g.metaDeck = s.metaDeck;
      if (s.shownCardIds) g.shownCardIds = new Set(s.shownCardIds);

      // Re-bind stale UI selections by instanceId against the fresh objects
      if (uiObj) {
        uiObj.selectedAttacker = selAtkId ? findCardAnywhere(g, selAtkId) : null;
        uiObj.selectedCard = selCardId ? findCardAnywhere(g, selCardId) : null;
      }
    } finally {
      Net._applying = false;
    }
  }

  function findCardAnywhere(g, instanceId) {
    if (!instanceId) return null;
    var players = [g.player, g.enemy];
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      if (!p) continue;
      if (p.field) {
        var rows = ['command', 'battle', 'base', 'trap', 'graveyard'];
        for (var r = 0; r < rows.length; r++) {
          var arr = p.field[rows[r]];
          if (!arr) continue;
          if (!Array.isArray(arr)) {
            if (arr && arr.instanceId === instanceId) return arr;
            continue;
          }
          for (var k = 0; k < arr.length; k++) {
            if (arr[k] && arr[k].instanceId === instanceId) return arr[k];
          }
        }
      }
      var lists = [p.hand, p.deck];
      for (var l = 0; l < lists.length; l++) {
        var list = lists[l];
        if (!list) continue;
        for (var m = 0; m < list.length; m++) {
          if (list[m] && list[m].instanceId === instanceId) return list[m];
        }
      }
    }
    return null;
  }

  function findInList(list, instanceId) {
    if (!list || !instanceId) return null;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].instanceId === instanceId) return list[i];
    }
    return null;
  }

  function sideOf(engine, player) {
    if (!engine || !player) return null;
    if (player === engine.player) return 'player';
    if (player === engine.enemy) return 'enemy';
    return null;
  }

  // -------------------------------------------------------------------------
  // Engine patching
  // -------------------------------------------------------------------------
  function patchEngine() {
    if (Net._patched) return;
    var GE = EngineCls();
    if (!GE) { log('GameEngine not found — net disabled'); return; }
    var P = GE.prototype;

    Net._orig = {
      buyCard: P.buyCard,
      playCard: P.playCard,
      attack: P.attack,
      endBankPhase: P.endBankPhase,
      endTurn: P.endTurn,
      startBattle: P.startBattle,
      emit: P.emit
    };

    P.buyCard = function (player, cardId) {
      if (Net.mode === 'guest') { Net.sendAction({ kind: 'buyCard', cardId: cardId, side: 'enemy' }); return true; }
      var r = Net._orig.buyCard.call(this, player, cardId);
      if (Net.mode === 'host') Net.markDirty();
      return r;
    };

    P.playCard = function (player, card, slot) {
      if (Net.mode === 'guest') { Net.sendAction({ kind: 'playCard', instanceId: card && card.instanceId, slot: slot, side: 'enemy' }); return true; }
      var r = Net._orig.playCard.call(this, player, card, slot);
      if (Net.mode === 'host') Net.markDirty();
      return r;
    };

    P.attack = function (attackerPlayer, attackerCard, target) {
      if (Net.mode === 'guest') {
        var tgt = (target === this.player || target === this.enemy)
          ? { kind: 'base' }
          : { kind: 'card', instanceId: target && target.instanceId };
        Net.sendAction({ kind: 'attack', instanceId: attackerCard && attackerCard.instanceId, target: tgt, side: 'enemy' });
        return true;
      }
      var r = Net._orig.attack.call(this, attackerPlayer, attackerCard, target);
      if (Net.mode === 'host') Net.markDirty();
      return r;
    };

    P.endBankPhase = function (player) {
      if (Net.mode === 'guest') { Net.sendAction({ kind: 'endBankPhase', side: 'enemy' }); return; }
      var r = Net._orig.endBankPhase.call(this, player);
      if (Net.mode === 'host') Net.markDirty();
      return r;
    };

    P.endTurn = function (player) {
      if (Net.mode === 'guest') { Net.sendAction({ kind: 'endTurn', side: 'enemy' }); return; }
      var r = Net._orig.endTurn.call(this, player);
      if (Net.mode === 'host') Net.markDirty();
      return r;
    };

    P.startBattle = function (deck, enemyDeck, mode, bg, firstSide) {
      if (Net.mode === 'guest') {
        log('guest: startBattle suppressed — awaiting host snapshot');
        return;
      }
      this.netHumanEnemy = (Net.mode === 'host');
      var r = Net._orig.startBattle.call(this, deck, enemyDeck, mode, bg, firstSide);
      if (Net.mode === 'host') { Net.inMatch = true; Net.markDirty(true); }
      return r;
    };

    P.emit = function (event, data) {
      var r = Net._orig.emit.call(this, event, data);
      if (Net.mode === 'host' && this.netHumanEnemy && event !== 'snap') Net.markDirty();
      return r;
    };

    Net._patched = true;
    log('engine patched');
  }

  // -------------------------------------------------------------------------
  // HOST: apply a guest action against the authoritative engine
  // -------------------------------------------------------------------------
  function applyAction(a) {
    var uiObj = U();
    var g = (uiObj && uiObj.game) || null;
    if (!g || g.state !== 'battle') return;
    if (!a || typeof a.kind !== 'string') return;

    var isGuestTurn = (g.currentPlayer === g.enemy);
    var guestSide = g.enemy;

    if (a.side && a.side !== 'enemy') { log('reject action from wrong side:', a.kind); return; }

    switch (a.kind) {
      case 'buyCard':
        if (!isGuestTurn || g.phase !== 'bank') { log('reject buyCard (not guest bank phase)'); return; }
        Net._orig.buyCard.call(g, guestSide, a.cardId);
        break;
      case 'playCard': {
        if (!isGuestTurn) { log('reject playCard (not guest turn)'); return; }
        var card = findInList(guestSide.hand, a.instanceId);
        if (!card) { log('reject playCard: card not in guest hand', a.instanceId); return; }
        Net._orig.playCard.call(g, guestSide, card, a.slot);
        break;
      }
      case 'attack': {
        if (!isGuestTurn) { log('reject attack (not guest turn)'); return; }
        var atk = findInList(guestSide.field.battle, a.instanceId);
        if (!atk) { log('reject attack: attacker not found', a.instanceId); return; }
        var target = (a.target && a.target.kind === 'base')
          ? g.player
          : findCardAnywhere(g, a.target && a.target.instanceId);
        if (!target) { log('reject attack: target not found'); return; }
        Net._orig.attack.call(g, guestSide, atk, target);
        break;
      }
      case 'endBankPhase':
        if (!isGuestTurn || g.phase !== 'bank') { log('reject endBankPhase'); return; }
        Net._orig.endBankPhase.call(g, guestSide);
        break;
      case 'endTurn':
        if (!isGuestTurn) { log('reject endTurn (not guest turn)'); return; }
        Net._orig.endTurn.call(g, guestSide);
        break;
      default:
        return;
    }
    Net.markDirty(true);
  }

  // -------------------------------------------------------------------------
  // Dirty-flag -> throttled snapshot broadcast
  // -------------------------------------------------------------------------
  Net.markDirty = function (immediate) {
    if (Net.mode !== 'host') return;
    Net._dirty = true;
    if (immediate) Net.flush(true);
  };

  Net.flush = function (force) {
    if (Net.mode !== 'host' || !Net.connected || !Net.peerPresent) return;
    var uiObj = U();
    var g = (uiObj && uiObj.game) || null;
    if (!g) return;
    if (!force && !Net._dirty) return;

    var now = Date.now();
    var wantFull = !!force || (now - Net._lastFullAt > 5000);
    if (wantFull) Net._lastFullAt = now;

    Net._dirty = false;
    try {
      Net.send({ t: 'relay', payload: { k: 'snap', g: snapshot(g, wantFull), full: wantFull } });
    } catch (e) {
      log('snapshot failed:', e && e.message);
    }
  };

  // -------------------------------------------------------------------------
  // Wire protocol
  // -------------------------------------------------------------------------
  Net.send = function (obj) {
    if (Net.ws && Net.ws.readyState === 1) {
      try { Net.ws.send(JSON.stringify(obj)); } catch (e) { log('send failed', e); }
    }
  };

  Net.sendAction = function (a) {
    if (!Net.connected || !Net.peerPresent) { Net.status('Not connected to an opponent yet.'); return; }
    Net.send({ t: 'relay', payload: { k: 'act', a: a } });
  };

  Net.chat = function (text) {
    if (!text) return;
    Net.send({ t: 'relay', payload: { k: 'chat', text: text } });
    addChat(Net.myName, text, true);
  };

  function onRelay(payload) {
    if (!payload || typeof payload.k !== 'string') return;
    switch (payload.k) {
      case 'hello':
        if (payload.name) { Net.peerName = payload.name; renderPanel(); }
        if (Net.mode === 'host' && Array.isArray(payload.deck) && payload.deck.length) {
          Net.remoteDeck = payload.deck;
          log('received peer deck (' + payload.deck.length + ' cards)');
        }
        Net.status((Net.peerName || 'Opponent') + ' is in the room.');
        break;

      case 'requestDeck':
        if (Net.mode === 'guest') Net.send({ t: 'relay', payload: { k: 'deck', cards: currentDeck() } });
        break;

      case 'deck':
        if (Net.mode === 'host' && Array.isArray(payload.cards)) {
          Net.remoteDeck = payload.cards;
          log('peer deck received (' + payload.cards.length + ' cards)');
          if (Net._startWhenDeckArrives) { Net._startWhenDeckArrives = false; maybeStartMatch(); }
        }
        break;

      case 'start':
        if (Net.mode === 'guest') { Net.inMatch = true; enterBattleScreen(); }
        break;

      case 'snap':
        if (Net.mode === 'guest') receiveSnapshot(payload);
        break;

      case 'act':
        if (Net.mode === 'host') applyAction(payload.a);
        break;

      case 'chat':
        addChat(Net.peerName || 'Opponent', payload.text, false);
        break;

      default:
        break;
    }
  }

  function receiveSnapshot(payload) {
    if (!payload.g) return;
    var uiObj = U();
    var g = (uiObj && uiObj.game) || null;
    if (!g) {
      var GE = EngineCls();
      if (!GE) return;
      g = new GE();
      g.netHumanEnemy = true;
      if (uiObj) uiObj.game = g;
    }
    if (!Net.inMatch) { Net.inMatch = true; enterBattleScreen(); }
    applySnapshot(g, payload.g, uiObj);
    Net.status('Live — turn ' + (g.turnCount || 0));
    try {
      if (uiObj) {
        if (uiObj.updateBattleLog) uiObj.updateBattleLog();
        if (uiObj.renderBattle) uiObj.renderBattle();
      }
    } catch (e) {
      log('render after snapshot failed:', e && e.message);
    }
  }

  function enterBattleScreen() {
    var uiObj = U();
    try {
      if (!uiObj) return;
      if (!uiObj.game) {
        var GE = EngineCls();
        if (!GE) return;
        uiObj.game = new GE();
        uiObj.game.netHumanEnemy = true;
      }
      if (uiObj.currentScreen !== 'battle' && uiObj.showScreen) uiObj.showScreen('battle');
      if (uiObj.initBattleDrag) uiObj.initBattleDrag();
    } catch (e) {
      log('enterBattleScreen failed:', e && e.message);
    }
  }

  function currentDeck() {
    var uiObj = U();
    try {
      if (uiObj && uiObj.getSelectedDeck) {
        var d = uiObj.getSelectedDeck();
        if (Array.isArray(d) && d.length) return d;
      }
      if (uiObj && Array.isArray(uiObj.deck) && uiObj.deck.length) return uiObj.deck.slice();
    } catch (e) { /* ignore */ }
    return [];
  }

  // -------------------------------------------------------------------------
  // Connection lifecycle
  // -------------------------------------------------------------------------
  Net.connect = function (role, roomCode) {
    if (Net.ws && (Net.ws.readyState === 0 || Net.ws.readyState === 1)) {
      try { Net.ws.close(); } catch (e) {}
    }
    Net.mode = role;
    Net.lane = role;
    Net.myName = Net.myName || 'Commander';
    Net.status('Connecting…');

    var ws;
    try { ws = new WebSocket(wsUrl()); }
    catch (e) { Net.status('Cannot open WebSocket: ' + e.message); return; }
    Net.ws = ws;

    ws.onopen = function () {
      Net.connected = true;
      if (role === 'host') Net.send({ t: 'create', name: Net.myName });
      else Net.send({ t: 'join', room: roomCode, name: Net.myName });
    };

    ws.onmessage = function (ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      switch (msg.t) {
        case 'created':
          Net.room = msg.room;
          Net.status('Room ' + msg.room + ' created — waiting for your opponent.');
          renderPanel();
          break;
        case 'joined':
          Net.room = msg.room;
          Net.peerPresent = true;
          if (msg.hostName) Net.peerName = msg.hostName;
          Net.status('Joined room ' + msg.room + ' — host: ' + (msg.hostName || '?'));
          Net.send({ t: 'relay', payload: { k: 'hello', name: Net.myName, deck: currentDeck() } });
          renderPanel();
          break;
        case 'peerJoined':
          Net.peerPresent = true;
          Net.peerName = msg.name || 'Opponent';
          Net.status(Net.peerName + ' joined. Ready when you are.');
          Net.send({ t: 'relay', payload: { k: 'hello', name: Net.myName, deck: currentDeck() } });
          renderPanel();
          break;
        case 'peerLeft':
          Net.peerPresent = false;
          Net.status('Opponent disconnected (' + (msg.reason || 'left') + ').');
          renderPanel();
          break;
        case 'relay':
          onRelay(msg.payload);
          break;
        case 'error':
          Net.status('Error: ' + (msg.message || msg.code));
          break;
        default:
          break;
      }
    };

    ws.onclose = function () {
      Net.connected = false;
      Net.peerPresent = false;
      if (Net.mode !== 'offline') Net.status('Disconnected from LAN server.');
      renderPanel();
    };

    ws.onerror = function () { Net.status('WebSocket error — is the LAN server running?'); };
  };

  Net.disconnect = function () {
    if (Net.connected) Net.send({ t: 'leave' });
    try { if (Net.ws) Net.ws.close(); } catch (e) {}
    Net.mode = 'offline';
    Net.room = null;
    Net.connected = false;
    Net.peerPresent = false;
    Net.inMatch = false;
    renderPanel();
  };

  // -------------------------------------------------------------------------
  // Host: begin the authoritative battle
  // -------------------------------------------------------------------------
  Net.startMatchAsHost = function () {
    if (Net.mode !== 'host') { Net.status('Only the host can start the match.'); return; }
    if (!Net.peerPresent) { Net.status('No opponent in the room yet.'); return; }
    if (!Net.remoteDeck) {
      Net.status('Requesting opponent deck…');
      Net._startWhenDeckArrives = true;
      Net.send({ t: 'relay', payload: { k: 'requestDeck' } });
      return;
    }
    maybeStartMatch();
  };

  function maybeStartMatch() {
    if (Net.mode !== 'host' || !Net.remoteDeck) return;
    var deck = currentDeck();
    if (!deck.length) { Net.status('Pick a deck first (Deck Builder), then start.'); return; }
    Net.send({ t: 'relay', payload: { k: 'start', deck: deck } });
    Net.inMatch = true;
    Net.status('Starting match…');
    try {
      var uiObj = U();
      if (uiObj && uiObj.launchBattle) uiObj.launchBattle();
    } catch (e) {
      log('launchBattle failed:', e && e.message);
      Net.status('Failed to start: ' + (e && e.message));
    }
    setTimeout(function () { Net.flush(true); }, 250);
  }

  // -------------------------------------------------------------------------
  // Lobby / NET PLAY panel
  // -------------------------------------------------------------------------
  var PANEL_CSS = [
    '#net-panel{position:fixed;right:14px;bottom:14px;z-index:99999;width:272px;',
    'background:linear-gradient(160deg,rgba(10,14,28,.97),rgba(6,9,20,.97));',
    'border:1px solid rgba(0,217,255,.35);border-radius:12px;',
    'box-shadow:0 8px 40px rgba(0,0,0,.6),0 0 22px rgba(0,217,255,.12);',
    'color:#cfe9ff;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;}',
    '#net-panel *{box-sizing:border-box;}',
    '#net-head{display:flex;align-items:center;justify-content:space-between;',
    'padding:8px 10px;cursor:pointer;border-bottom:1px solid rgba(0,217,255,.2);',
    'background:rgba(0,217,255,.06);border-radius:12px 12px 0 0;}',
    '#net-head b{color:#00d9ff;letter-spacing:.14em;font-size:11px;}',
    '#net-body{padding:9px 10px;}',
    '#net-panel.collapsed #net-body{display:none;}',
    '#net-panel.collapsed #net-head{border-radius:12px;}',
    '.net-row{display:flex;gap:6px;margin-bottom:7px;}',
    '.net-btn{flex:1;padding:6px 8px;border-radius:7px;cursor:pointer;',
    'border:1px solid rgba(0,217,255,.4);background:rgba(0,217,255,.10);',
    'color:#bfe9ff;font:inherit;font-weight:700;letter-spacing:.06em;}',
    '.net-btn:hover{background:rgba(0,217,255,.22);color:#fff;}',
    '.net-btn.primary{border-color:rgba(5,255,161,.55);background:rgba(5,255,161,.14);color:#a9ffdb;}',
    '.net-btn.primary:hover{background:rgba(5,255,161,.26);}',
    '.net-btn:disabled{opacity:.35;cursor:not-allowed;}',
    '.net-in{flex:1;min-width:0;padding:6px 8px;border-radius:7px;',
    'border:1px solid rgba(0,217,255,.28);background:rgba(0,0,0,.35);color:#e6f6ff;font:inherit;}',
    '.net-in.code{text-transform:uppercase;letter-spacing:.32em;text-align:center;font-weight:700;}',
    '#net-status{font-size:11px;color:#7fb6d6;min-height:28px;margin:2px 0 6px;white-space:pre-wrap;}',
    '#net-room{font-weight:700;color:#05ffa1;letter-spacing:.3em;}',
    '#net-chat{height:84px;overflow-y:auto;background:rgba(0,0,0,.35);',
    'border:1px solid rgba(0,217,255,.18);border-radius:7px;padding:5px 7px;margin-bottom:6px;}',
    '.net-msg{margin-bottom:3px;word-break:break-word;}',
    '.net-msg .who{color:#ffd700;}',
    '.net-msg.me .who{color:#05ffa1;}',
    '.net-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;vertical-align:1px;}',
    // Responsive: below the tablet breakpoint the panel must never cover the
    // menu. It shrinks, caps its own height, and starts collapsed (see boot()).
    '@media (max-width:860px){',
    '#net-panel{width:min(92vw,332px);right:8px;bottom:8px;max-height:72vh;}',
    '#net-body{max-height:calc(72vh - 38px);overflow-y:auto;}',
    '#net-chat{height:58px;}',
    '.net-btn{padding:8px 8px;}',
    '.net-in{padding:8px;}',
    '}',
    '@media (max-width:860px){',
    '#net-panel.collapsed{width:auto;max-width:none;}',
    '#net-panel.collapsed #net-head{padding:7px 11px;}',
    '}'
  ].join('');

  function buildPanel() {
    if (Net._panel) return;
    var style = document.createElement('style');
    style.textContent = PANEL_CSS;
    document.head.appendChild(style);

    var p = document.createElement('div');
    p.id = 'net-panel';
    p.innerHTML =
      '<div id="net-head"><b>◈ NET PLAY</b><span id="net-toggle">▾</span></div>' +
      '<div id="net-body">' +
      '  <div class="net-row"><input id="net-name" class="net-in" placeholder="Your name" maxlength="18"></div>' +
      '  <div class="net-row">' +
      '    <button id="net-create" class="net-btn key">CREATE</button>' +
      '    <button id="net-disconnect" class="net-btn key">LEAVE</button>' +
      '  </div>' +
      '  <div class="net-row">' +
      '    <input id="net-room-in" class="net-in code" placeholder="CODE" maxlength="4">' +
      '    <button id="net-join" class="net-btn key" style="flex:0 0 74px;">JOIN</button>' +
      '  </div>' +
      '  <div id="net-status">Idle. Same Wi-Fi? Open the LAN URL, then CREATE / JOIN.</div>' +
      '  <div id="net-chat"></div>' +
      '  <div class="net-row" style="margin-bottom:0;">' +
      '    <input id="net-chat-in" class="net-in" placeholder="Message opponent…" maxlength="200">' +
      '    <button id="net-send" class="net-btn key" style="flex:0 0 54px;">↑</button>' +
      '  </div>' +
      '  <div class="net-row" style="margin:8px 0 0;">' +
      '    <button id="net-start" class="net-btn primary key" disabled>START MATCH (host)</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(p);

    Net._panel = p;
    Net._els = {
      name: p.querySelector('#net-name'),
      create: p.querySelector('#net-create'),
      join: p.querySelector('#net-join'),
      disconn: p.querySelector('#net-disconnect'),
      roomIn: p.querySelector('#net-room-in'),
      status: p.querySelector('#net-status'),
      chat: p.querySelector('#net-chat'),
      chatIn: p.querySelector('#net-chat-in'),
      send: p.querySelector('#net-send'),
      start: p.querySelector('#net-start'),
      head: p.querySelector('#net-head'),
      toggle: p.querySelector('#net-toggle')
    };

    Net._els.name.value = Net.myName;
    Net._els.name.addEventListener('change', function () {
      Net.myName = this.value.trim() || 'Commander';
      localStorage.setItem('eunonymous_playerName', Net.myName);
    });
    Net._els.create.addEventListener('click', function () { Net.connect('host'); });
    Net._els.join.addEventListener('click', function () {
      var code = (Net._els.roomIn.value || '').trim().toUpperCase();
      if (code.length < 4) { Net.status('Enter the 4-letter room code.'); return; }
      Net.connect('guest', code);
    });
    Net._els.disconn.addEventListener('click', function () { Net.disconnect(); });
    Net._els.send.addEventListener('click', function () {
      var v = Net._els.chatIn.value.trim();
      if (v) { Net.chat(v); Net._els.chatIn.value = ''; }
    });
    Net._els.chatIn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); Net._els.send.click(); }
    });
    Net._els.start.addEventListener('click', function () { Net.startMatchAsHost(); });
    Net._els.head.addEventListener('click', function () {
      p.classList.toggle('collapsed');
      Net._els.toggle.textContent = p.classList.contains('collapsed') ? '◂' : '▾';
    });
    Net._els.roomIn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') Net._els.join.click();
    });
  }

  Net.status = function (text) {
    if (Net._els && Net._els.status) Net._els.status.textContent = text;
    log(text);
  };

  function addChat(who, text, mine) {
    if (!Net._els || !Net._els.chat) return;
    var d = document.createElement('div');
    d.className = 'net-msg' + (mine ? ' me' : '');
    d.innerHTML = '<span class="who">' + esc(who) + ':</span> ' + esc(text);
    Net._els.chat.appendChild(d);
    Net._els.chat.scrollTop = Net._els.chat.scrollHeight;
  }

  function renderPanel() {
    if (!Net._els || !Net._els.status) return;
    var dotColor = Net.connected ? (Net.peerPresent ? '#05ffa1' : '#ffd700') : '#ff2a6d';
    var head = Net._panel.querySelector('#net-head b');
    if (head) {
      head.innerHTML = '◈ NET PLAY <span class="net-dot" style="background:' + dotColor + '"></span>' +
        (Net.room ? '<span id="net-room"> ' + esc(Net.room) + '</span>' : '');
    }
    if (Net._els.start) {
      Net._els.start.disabled = !(Net.mode === 'host' && Net.peerPresent);
      Net._els.start.style.display = Net.mode === 'guest' ? 'none' : 'block';
    }
    Net._els.create.disabled = Net.connected;
    Net._els.join.disabled = Net.connected;
  }

  // -------------------------------------------------------------------------
  // UI patches
  // -------------------------------------------------------------------------
  function patchUI() {
    var uiObj = U();
    if (!uiObj) return;

    var origOpp = uiObj.getOpponentDeckForMode;
    uiObj.getOpponentDeckForMode = function () {
      if (Net.mode === 'host' && Net.remoteDeck && Net.remoteDeck.length) return Net.remoteDeck;
      if (origOpp) return origOpp.apply(this, arguments);
      return [];
    };

    var origTimer = uiObj.startPhaseTimer;
    uiObj.startPhaseTimer = function (secs, label) {
      if (Net.mode !== 'offline') {
        var l = document.getElementById('clock-phase-label');
        if (l) l.textContent = (label || '') + ' · LAN';
        return;
      }
      if (origTimer) return origTimer.apply(this, arguments);
    };
  }

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------
  function boot() {
    patchEngine();
    patchUI();
    try { Net.myName = localStorage.getItem('eunonymous_playerName') || 'Commander'; } catch (e) {}
    buildPanel();
    Net.mode = 'offline';

    // Below the tablet breakpoint the panel would sit on top of the menu, so it
    // auto-collapses. Driven by a media-query listener (not a one-shot width read)
    // so it also reacts to resize/rotation, and it only ever auto-collapses —
    // an explicit user expand is never fought.
    var narrow = window.matchMedia('(max-width: 860px)');
    function applyNarrow(mq) {
      if (!Net._panel) return;
      var isNarrow = mq ? mq.matches : narrow.matches;
      if (isNarrow) {
        Net._panel.classList.add('collapsed');
        if (Net._els.toggle) Net._els.toggle.textContent = '◂';
      }
    }
    applyNarrow(null);
    if (narrow.addEventListener) narrow.addEventListener('change', applyNarrow);

    Net._flushTimer = setInterval(function () { if (Net._dirty) Net.flush(); }, 120);
    Net._safetyTimer = setInterval(function () { Net.flush(false); }, 2000);
    Net._pingTimer = setInterval(function () { if (Net.connected) Net.send({ t: 'ping' }); }, 25000);
    document.addEventListener('visibilitychange', function () { if (Net.mode === 'host') Net.markDirty(); });

    window.Net = Net;
    log('net layer ready.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
