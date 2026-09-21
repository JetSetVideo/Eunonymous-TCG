/**
 * Synthopwars Core Game Engine v4.0
 * - Zero-start economy: both players begin with 0 cards in hand and 0 in a personal deck.
 *   Every card either player will ever hold is bought from the shared Metadeck via the Bank
 *   (GAME_RULES.md §2.3/§3.1). This was previously undermined by a hard-coded opening hand of
 *   3 cards per player — removed (see startBattle) so code matches the documented design.
 * - Unique instance IDs for every card in play (fixes hand-removal bug)
 * - Richer player state: shield, energy overrides, buff stacks
 * - Bank phase no longer auto-ends on 0 mana
 * v4.0 BATTLE SYSTEM OVERHAUL:
 * - Hearthstone-style per-creature attack readiness (`readyToAttack`, `attacksLeft`)
 * - Windfury-style extra attacks via `attacksPerTurn`
 * - Star-Realms faction escalation: 2-of / 3-of ally bonuses
 * - Out There Omega danger events that fire periodically
 * - Slay-the-Spire enemy intent projection
 * - Full stealth / untargetable / flying rules
 */

class GameEngine {
  constructor() {
    this.state = 'menu';
    this.player = this._createPlayer('Commander', true);
    this.enemy  = this._createPlayer('Opponent', false);
    this.battleground = null;
    this.phase = 'draw';
    this.turnTimer = 30;
    this.maxTurnTimer = 30;
    this.animating = false;
    this.battleLog = [];
    this.selectedCard = null;
    this.selectedSlot = null;
    this.gameMode = '1v1';
    this.callbacks = {};
    this.turnCount = 0;
    this.maxTurns = 30;
    this.gameStartTime = null;
    this.maxGameTimeMs = 20 * 60 * 1000;
    this.winCondition = null;
    this.metaDeck = [];
    this.shownCardIds = new Set();
    this.currentMarket = [];
    this._instanceCounter = 0;
    this.battleHistory = [];   // Structured per-step event log
    this.dangerLevel = 0;    // Out-There-Omega escalation 0..5
    this._nextDangerTurn = 6; // first danger event fires on this global turn
    this.pendingDangers = [];
  }

  _createPlayer(name, isHuman) {
    return {
      name: name,
      isHuman: isHuman,
      aiStyle: 'balanced',  // 'aggro', 'control', 'tank', 'balanced'
      hp: 30, maxHp: 30,
      shield: 0,           // absorbs flat damage before HP
      maxShield: 10,
      power: 0, maxPower: 12, basePower: 1,
      mana: 0, maxMana: 0,
      energyPool: 0,       // surplus energy banked from structures/abilities
      turn: 0, deck: [], hand: [],
      field: { command: null, base: [], battle: [], trap: [], graveyard: [] },
      role: null,
      wins: 0, losses: 0,
      credits: 1000, synth: 50,
      fatigueTurns: 0,
      dominationTurns: 0,
      teamSynergies: {},
      buffStacks: [],      // { type:'atk'|'def'|'hp', amount, duration, source }
      fieldModifiers: [],  // { stat, amount, condition }
      // Battle statistics tracking
      stats: {
        damageDealt: 0,
        damageTaken: 0,
        cardsPlayed: 0,
        creaturesKilled: 0,
        creaturesLost: 0,
        spellsCast: 0,
        combosTriggered: 0,
        manaSpent: 0,
        powerSpent: 0,
        cardsBought: 0,
        healsTotal: 0,
        structuresBuilt: 0
      }
    };
  }

  _newInstanceId() {
    this._instanceCounter++;
    return 'inst_' + this._instanceCounter + '_' + Math.random().toString(36).substr(2, 6);
  }

  _stampCard(card) {
    // Deep-copy and stamp with a truly unique instanceId
    var copy = Object.assign({}, card);
    copy.instanceId = this._newInstanceId();
    copy._metaId = copy._metaId || this._newInstanceId();
    return copy;
  }

  on(event, callback) {
    this.callbacks[event] = this.callbacks[event] || [];
    this.callbacks[event].push(callback);
  }

  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(data));
    }
  }

  startBattle(deck, enemyDeck, mode, battleground) {
    mode = mode || '1v1';
    battleground = battleground || null;
    this.state = 'battle';
    this.gameMode = mode;
    this.battleground = battleground;
    this._instanceCounter = 0;

    // Stamp every card with a unique instanceId so the same base card
    // can exist multiple times without confusing hand-removal logic.
    var stampAll = function(arr) {
      var self = this;
      return arr.map(function(c) { return self._stampCard(c); });
    }.bind(this);

    this.player.deck = this.shuffle(stampAll(deck));
    this.enemy.deck  = this.shuffle(stampAll(enemyDeck));
    this.player.hand = [];
    this.enemy.hand  = [];
    this.player.field = { command: null, base: [], battle: [], trap: [], graveyard: [] };
    this.enemy.field  = { command: null, base: [], battle: [], trap: [], graveyard: [] };
    this.player.hp = mode === 'battleground' ? 20 : 30;
    this.enemy.hp  = mode === 'battleground' ? 20 : 30;
    this.player.maxHp = this.player.hp;
    this.enemy.maxHp  = this.enemy.hp;
    this.player.shield = 0;
    this.enemy.shield  = 0;
    this.player.energyPool = 0;
    this.enemy.energyPool  = 0;
    this.player.power = 0;
    this.enemy.power  = 0;
    this.player.mana = 0;
    this.enemy.mana  = 0;
    this.player.maxMana = 0;
    this.enemy.maxMana  = 0;
    this.player.turn = 0;
    this.enemy.turn  = 0;
    this.player.fatigueTurns = 0;
    this.enemy.fatigueTurns  = 0;
    this.player.dominationTurns = 0;
    this.enemy.dominationTurns  = 0;
    this.player.teamSynergies = {};
    this.enemy.teamSynergies  = {};
    this.player.buffStacks = [];
    this.enemy.buffStacks  = [];
    this.player.fieldModifiers = [];
    this.enemy.fieldModifiers  = [];
    this.phase = 'bank';
    this.battleLog = [];
    this.turnTimer = this.maxTurnTimer;
    this.animating = false;
    this.turnCount = 0;
    this.winCondition = null;
    this.gameStartTime = Date.now();

    // Build metadeck from both players' decks (stamped copies)
    this.metaDeck = this.shuffle(stampAll([...deck, ...enemyDeck]));
    this.shownCardIds = new Set();
    this.currentMarket = [];

    // Zero-start economy (GAME_RULES.md §2.3): both players begin with 0 cards in hand and
    // 0 in a personal deck. Everything is acquired from the Metadeck via the Bank, starting
    // turn 1 — no opening hand is dealt. The first player's Bank market is intentionally
    // smaller (3 cards vs. 5) specifically to offset the lack of a head start here.

    this.log('Battle started! ' + (battleground ? 'Field: ' + battleground.name : 'Standard Field'));
    this.log('Metadeck created with ' + this.metaDeck.length + ' cards. Both Commanders start with an empty hand.');
    this.recordEvent('battleStart', { battleground: battleground ? battleground.name : 'Standard', metadeckSize: this.metaDeck.length });
    this.emit('battleStart', { battleground: battleground });
    this.startTurn(this.player);
  }

  shuffle(array) {
    var arr = [...array];
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  drawCard(player) {
    if (player.deck.length === 0) {
      player.fatigueTurns = (player.fatigueTurns || 0) + 1;
      var fatigueDmg = player.fatigueTurns;
      player.hp = Math.max(0, player.hp - fatigueDmg);
      this.log(player.name + ' takes ' + fatigueDmg + ' fatigue damage! (Deck empty)');
      this.emit('damage', { target: player, amount: fatigueDmg, type: 'fatigue' });
      if (player.fatigueTurns >= 3) {
        var opponent = player === this.player ? this.enemy : this.player;
        this.endGame(opponent, 'exodus');
        return null;
      }
      this.checkWinCondition();
      return null;
    }
    player.fatigueTurns = 0;
    var handLimit = (this.battleground && this.battleground.id === 'odessa') ? 7 : 10;
    if (player.hand.length >= handLimit) {
      this.log(player.name + ' hand is full! Card discarded.');
      var discarded = player.deck.pop();
      player.field.graveyard.push(discarded);
      return null;
    }
    var card = player.deck.pop();
    player.hand.push(card);
    this.emit('draw', { player: player, card: card });
    return card;
  }

  // ===== OUT THERE OMEGA: DANGER EVENT TABLE =====
  _triggerDangerEvent(currentPlayer) {
    var self = this;
    var lvl = this.dangerLevel || 1;
    var events = [
      { id: 'void_storm', name: '⚡ VOID STORM', desc: 'All creatures take ' + lvl + ' damage!',
        apply: function() {
          [self.player, self.enemy].forEach(function(p) {
            p.field.battle.forEach(function(c) {
              if (!c) return;
              c.currentHp = (c.currentHp !== undefined ? c.currentHp : c.health) - lvl;
              if (c.currentHp <= 0) self.destroyCard(p, c);
            });
          });
        } },
      { id: 'solar_flare', name: '☀️ SOLAR FLARE', desc: 'Both commanders take ' + (lvl + 1) + ' damage!',
        apply: function() {
          [self.player, self.enemy].forEach(function(p) {
            p.hp = Math.max(0, p.hp - (lvl + 1));
            self.emit('damage', { target: p, amount: lvl + 1, type: 'danger' });
          });
        } },
      { id: 'gravity_surge', name: '🌀 GRAVITY SURGE', desc: 'All creatures lose ' + lvl + ' ATK this turn!',
        apply: function() {
          [self.player, self.enemy].forEach(function(p) {
            p.field.battle.forEach(function(c) {
              if (!c) return;
              c.currentAtk = Math.max(0, (c.currentAtk !== undefined ? c.currentAtk : c.attack) - lvl);
            });
          });
        } },
      { id: 'scavenger_pod', name: '🛰 SCAVENGER POD', desc: 'Both commanders draw 1 card & gain 2 Power!',
        apply: function() {
          [self.player, self.enemy].forEach(function(p) {
            self.drawCard(p);
            p.power = Math.min(p.maxPower, (p.power || 0) + 2);
          });
        } },
      { id: 'nebula_bloom', name: '🌌 NEBULA BLOOM', desc: 'All creatures heal ' + lvl + ' HP!',
        apply: function() {
          [self.player, self.enemy].forEach(function(p) {
            p.field.battle.forEach(function(c) {
              if (!c) return;
              c.currentHp = Math.min(c.health, (c.currentHp !== undefined ? c.currentHp : c.health) + lvl);
            });
          });
        } }
    ];
    var evt = events[Math.floor(Math.random() * events.length)];
    this.log('═══ DANGER ' + evt.name + ' (Lv' + lvl + ') — ' + evt.desc + ' ═══');
    this.recordEvent('dangerEvent', { event: evt.name, desc: evt.desc, level: lvl });
      this.emit('dangerEvent', { event: evt, level: lvl });
    evt.apply();
    this.checkWinCondition();
  }

  // ===== SLAY THE SPIRE: ENEMY INTENT PROJECTION =====
  // Approximates what the AI will do next turn so the player can plan.
  getEnemyIntent() {
    if (!this.enemy) return null;
    var e = this.enemy;
    var readyAttackers = e.field.battle.filter(function(c) {
      return c && (!c.justPlayed || c.canAttack) && !(c.frozenTurns && c.frozenTurns > 0);
    });
    var totalAtk = readyAttackers.reduce(function(s, c) {
      return s + (c.currentAtk !== undefined ? c.currentAtk : (c.attack || 0));
    }, 0);
    var playable = e.hand.filter(function(c) {
      return this.getEffectiveCost(e, c) <= (e.power || 0);
    }, this);
    var willPlay = playable.length;
    if (readyAttackers.length === 0 && willPlay === 0) return { icon: '🛡', text: 'Holding position', atk: 0, play: 0 };
    if (totalAtk >= this.player.hp) return { icon: '💀', text: 'LETHAL — ' + totalAtk + ' incoming', atk: totalAtk, play: willPlay };
    if (readyAttackers.length > 0) return { icon: '⚔️', text: readyAttackers.length + ' attacker' + (readyAttackers.length > 1 ? 's' : '') + ' • ~' + totalAtk + ' dmg', atk: totalAtk, play: willPlay };
    return { icon: '✨', text: 'Playing ' + willPlay + ' card' + (willPlay > 1 ? 's' : ''), atk: 0, play: willPlay };
  }

  startTurn(player) {
    this.currentPlayer = player;
    this.turnTimer = this.maxTurnTimer;
    player.turn++;
    this.turnCount++;

    // Sudden Death: after turn 30, both players take 2 damage per turn
    if (this.turnCount > 30 && this.state === 'battle') {
      this.player.hp = Math.max(0, this.player.hp - 2);
      this.enemy.hp = Math.max(0, this.enemy.hp - 2);
      this.log('SUDDEN DEATH! Both players take 2 damage! (Turn ' + this.turnCount + ')');
      this.emit('damage', { target: this.player, amount: 2, type: 'suddendeath' });
      this.emit('damage', { target: this.enemy, amount: 2, type: 'suddendeath' });
      if (this.player.hp <= 0 || this.enemy.hp <= 0) {
        if (this.player.hp <= 0 && this.enemy.hp <= 0) { this.endGame(null, 'draw'); }
        else if (this.player.hp <= 0) { this.endGame(this.enemy, 'annihilation'); }
        else { this.endGame(this.player, 'annihilation'); }
        return;
      }
    }

    if (this.player.turn > this.maxTurns && this.enemy.turn > this.maxTurns) {
      if (this.player.hp > this.enemy.hp) {
        this.endGame(this.player, 'timeout');
      } else if (this.enemy.hp > this.player.hp) {
        this.endGame(this.enemy, 'timeout');
      } else {
        this.endGame(null, 'draw');
      }
      return;
    }

    if (this.gameStartTime && Date.now() - this.gameStartTime > this.maxGameTimeMs) {
      var winner = this.player.hp > this.enemy.hp ? this.player : this.enemy;
      this.endGame(winner, 'timeout');
      return;
    }

    // Hearthstone mana: +1 per turn, cap at 10, refills to max
    player.maxMana = Math.max(2, Math.min(player.turn, 10)); // Minimum 2 mana for playability
    player.mana = player.maxMana;
    player.basePower = Math.min(12, player.turn);

    // Tick down temporary buff stacks at the start of each turn
    if (player.buffStacks && player.buffStacks.length > 0) {
      var remaining = [];
      for (var bi = 0; bi < player.buffStacks.length; bi++) {
        var b = player.buffStacks[bi];
        b.duration--;
        if (b.duration > 0) {
          remaining.push(b);
        }
      }
      player.buffStacks = remaining;
    }

    // Energy pool contribution: surplus energy banked from previous turns
    if (player.energyPool > 0) {
      player.basePower = Math.min(player.maxPower, player.basePower + player.energyPool);
      player.energyPool = 0; // spent each turn
    }

    // FIRST turn only: 3 cards in bank. All other turns: 5 cards.
    // If bank already has cards (from previous turn's refills), fill to 5 (or 3 on first turn)
    var marketCount = (player.turn === 1 && player === this.player) ? 3 : 5;
    // Always refill to the target count — cards that were bought are already replaced
    while (this.currentMarket.length < marketCount && this.metaDeckHasCards()) {
      this.currentMarket.push(this.drawFromMetadeck());
    }

    // ===== OUT THERE OMEGA: DANGER EVENTS =====
    // Escalating space hazards hit BOTH commanders — the war zone is hostile.
    if (this.turnCount >= this._nextDangerTurn && this.state === 'battle') {
      this.dangerLevel = Math.min(5, (this.dangerLevel || 0) + 1);
      this._nextDangerTurn = this.turnCount + 4; // every 4 global turns
      this._triggerDangerEvent(player);
    }

        // Ensure at least 1 affordable card in the market (if any affordable cards exist in metadeck)
    var affordableInMarket = this.currentMarket.filter(function(c) {
      return (c.cost !== undefined ? c.cost : (c.power || 0)) <= player.mana;
    });
    if (affordableInMarket.length === 0 && this.metaDeckHasCards()) {
      // Find affordable cards in metadeck not yet shown
      var affordableInMeta = this.metaDeck.filter(function(c) {
        var cost = c.cost !== undefined ? c.cost : (c.power || 0);
        return cost <= player.mana && !this.shownCardIds.has(c.id);
      }, this);
      if (affordableInMeta.length > 0) {
        // Replace the most expensive market card with an affordable one
        var mostExpensive = this.currentMarket.reduce(function(a, b) {
          var costA = a.cost !== undefined ? a.cost : (a.power || 0);
          var costB = b.cost !== undefined ? b.cost : (b.power || 0);
          return costA > costB ? a : b;
        });
        var expensiveIdx = this.currentMarket.indexOf(mostExpensive);
        var randomAffordable = affordableInMeta[Math.floor(Math.random() * affordableInMeta.length)];
        var replacement = Object.assign({}, randomAffordable);
        replacement._metaId = Math.random().toString(36).substr(2, 9);
        this.shownCardIds.add(replacement.id + '_' + replacement._metaId);
        this.currentMarket[expensiveIdx] = replacement;
        this.log('Bank adjusted — added ' + replacement.name + ' (cost ' + (replacement.cost || replacement.power) + ')');
      }
    }

    this.phase = 'bank';
    this.log('--- Turn ' + player.turn + ' (' + player.name + ') Bank Phase. Mana: ' + player.mana + '/' + player.maxMana + ' ---');
    this.recordEvent('turnStart', { player: player === this.player ? 'player' : 'enemy', turn: player.turn, maxMana: player.maxMana, power: player.basePower });
    this.emit('bankStart', { player: player, turn: player.turn, marketCards: this.currentMarket.slice(), mana: player.mana, maxMana: player.maxMana });

    if (player === this.enemy && !this.netHumanEnemy) {
      var self = this;
      setTimeout(function() {
        if (self.state !== 'battle') return;
        self.aiBankPhase();
        self.endBankPhase(self.enemy);
      }, 400);
    }
  }

  drawFromMetadeck() {
    // Draw a random card from the metadeck (not already shown)
    var available = this.metaDeck.filter(function(c) { return !this.shownCardIds.has(c.id + '_' + c._metaId); }, this);
    if (available.length === 0) {
      // Allow duplicates if all shown — reset shown set
      this.shownCardIds = new Set();
      available = this.metaDeck.slice();
    }
    var idx = Math.floor(Math.random() * available.length);
    var card = this._stampCard(available[idx]);
    this.shownCardIds.add(card.id + '_' + card._metaId);
    return card;
  }

  metaDeckHasCards() {
    return this.metaDeck.length > 0 && this.shownCardIds.size < this.metaDeck.length * 2;
  }

  getMarketCards(count) {
    var result = [];
    for (var i = 0; i < count; i++) {
      result.push(this.drawFromMetadeck());
    }
    return result;
  }

  buyCard(player, cardId) {
    // cardId may be a _metaId (preferred, unique per market slot) or a base id.
    var card = null;
    var boughtMetaId = null;
    for (var i = 0; i < this.currentMarket.length; i++) {
      if (this.currentMarket[i]._metaId === cardId) { card = this.currentMarket[i]; boughtMetaId = card._metaId; break; }
    }
    if (!card) {
      for (var j = 0; j < this.currentMarket.length; j++) {
        if (this.currentMarket[j].id === cardId) { card = this.currentMarket[j]; boughtMetaId = card._metaId; break; }
      }
    }
    if (!card) { this.emit('error', { message: 'Card not in market!' }); return false; }

    var cost = card.cost !== undefined ? card.cost : (card.power || 0);
    if (player.mana < cost) {
      this.emit('error', { message: 'Not enough mana! Need ' + cost + ', have ' + player.mana });
      return false;
    }

    player.mana -= cost;
    if (player.stats) { player.stats.manaSpent += cost; player.stats.cardsBought++; }
    // Stamp the bought copy with a fresh instanceId before adding to hand
    player.hand.push(this._stampCard(card));

    // Remove the bought card from the market (match by _metaId for precision)
    var boughtIndex = this.currentMarket.findIndex(function(c) { return c._metaId === boughtMetaId; });
    if (boughtIndex >= 0) {
      if (this.metaDeckHasCards()) {
        this.currentMarket[boughtIndex] = this.drawFromMetadeck();
        this.log('Bank replenishes — new card available!');
      } else {
        this.currentMarket.splice(boughtIndex, 1);
        this.log('Metadeck exhausted — no more replacements!');
      }
    }

    this.log(player.name + ' buys ' + card.name + ' [Cost: ' + cost + '] Mana: ' + player.mana + '/' + player.maxMana);
    this.recordEvent('buy', { player: player === this.player ? 'player' : 'enemy', card: card.name, cost: cost });
    this.emit('buyCard', { player: player, card: card, mana: player.mana, maxMana: player.maxMana });
    return true;
  }

  endBankPhase(player) {
    if (this.state !== 'battle') return;
    this.currentMarket = [];

    // Mana Burn: if player has >2 unused mana at end of bank, take 1 damage per 2 excess
    if (player.mana > 2) {
      var excess = player.mana - 2;
      var manaBurnDmg = Math.floor(excess / 2);
      if (manaBurnDmg > 0) {
        player.hp = Math.max(0, player.hp - manaBurnDmg);
        this.log('MANA BURN! ' + player.name + ' takes ' + manaBurnDmg + ' damage from ' + excess + ' excess mana!');
        this.emit('damage', { target: player, amount: manaBurnDmg, type: 'manaburn' });
        if (player.hp <= 0) {
          var manaBurnWinner = player === this.player ? this.enemy : this.player;
          this.endGame(manaBurnWinner, 'annihilation');
          return;
        }
      }
    }

    this.log(player.name + ' ends Bank Phase.');
    this.recordEvent('bankEnd', { player: player === this.player ? 'player' : 'enemy', manaSpent: player.maxMana - player.mana, manaBurn: player.mana > 2 ? Math.floor((player.mana - 2) / 2) : 0 });
      this.emit('bankEnd', { player: player });

    // REFINE (Refinist) — convert unused mana to permanent production
    this.applyRefine(player);

    this.continueTurn(player);
  }

  aiBankPhase() {
    // Strategic bank purchasing AI
    var self = this;
    var market = this.currentMarket ? this.currentMarket.slice() : [];
    var enemyStyle = this.enemy.aiStyle || this._enemyStyle || 'balanced';

    // Score each market card based on AI strategy and current game state
    var scored = market.map(function(c) {
      var cost = c.cost !== undefined ? c.cost : (c.power || 0);
      if (cost > self.enemy.mana) return { card: c, score: -1, cost: cost };

      var score = 0;
      // Base value: stats efficiency
      var stats = (c.attack || 0) + (c.defense || 0) + (c.health || 0);
      var efficiency = cost > 0 ? stats / cost : stats;
      score += efficiency * 2;

      // Rarity bonus
      var RARITY_VAL = { mythic: 10, legendary: 7, epic: 5, rare: 3, uncommon: 2, common: 1 };
      score += RARITY_VAL[c.rarity] || 0;

      // Strategy-specific scoring
      if (enemyStyle === 'aggro') {
        // Aggro: prioritize low-cost creatures with high ATK and Charge/Haste
        if (c.type === 'Creature') {
          score += (c.attack || 0) * 3;
          if (c.speed >= 7) score += 5;
          if (c.ability && (c.ability.includes('Charge') || c.ability.includes('Haste'))) score += 8;
          if (cost <= 2) score += 4;
        }
        if (c.type === 'Spell' && c.ability && c.ability.includes('damage')) score += 6;
      } else if (enemyStyle === 'control') {
        // Control: prioritize spells, traps, denial, high DEF creatures
        if (c.type === 'Spell') score += 8;
        if (c.type === 'Trap') score += 6;
        if (c.ability && (c.ability.includes('Drain') || c.ability.includes('Mute') || c.ability.includes('Silence'))) score += 10;
        if (c.type === 'Creature' && (c.defense || 0) >= 5) score += 5;
        if (c.ability && c.ability.includes('Draw')) score += 6;
      } else if (enemyStyle === 'tank') {
        // Tank: prioritize high-DEF creatures, structures, healing, Regenerate
        if (c.type === 'Creature' && (c.defense || 0) >= 5) score += 8;
        if (c.type === 'Structure') score += 7;
        if (c.ability && (c.ability.includes('Regenerate') || c.ability.includes('Taunt') || c.ability.includes('Cover'))) score += 8;
        if (c.ability && c.ability.includes('Restore')) score += 6;
      } else {
        // Balanced: value efficiency and synergy
        if (c.type === 'Creature') score += stats * 0.5;
        if (c.type === 'Structure' && c.production > 0) score += 5;
        if (c.comboId) score += 3; // synergy potential
      }

      // Team synergy: bonus for cards that match teams already in hand
      var sameTeamInHand = self.enemy.hand.filter(function(h) { return h.team === c.team; }).length;
      score += sameTeamInHand * 2;

      // Don't buy if hand is getting large (save for later turns)
      if (self.enemy.hand.length >= 7) score -= 10;

      // Penalty for overpaying
      if (cost === self.enemy.mana && self.enemy.maxMana > 3) score -= 2;

      return { card: c, score: score, cost: cost };
    });

    // Sort by score descending
    scored.sort(function(a, b) { return b.score - a.score; });

    // Buy the best card, then re-evaluate
    for (var i = 0; i < scored.length; i++) {
      var item = scored[i];
      if (item.score < 0) break;
      // Re-check the card is still in market and affordable
      var stillInMarket = self.currentMarket.find(function(c) { return c._metaId === item.card._metaId; });
      if (!stillInMarket) continue;
      if (self.enemy.mana < item.cost) continue;
      self.buyCard(self.enemy, item.card.id);
      // Recurse: re-score remaining market with updated mana/hand
      if (self.enemy.mana > 0 && self.enemy.hand.length < 8) {
        self.aiBankPhase();
      }
      break;
    }
  }

  continueTurn(player) {
    this.currentPlayer = player;

    if (this.state !== 'battle') return;

    this.phase = 'power';
    var powerGain = player.basePower;
    player.field.base.forEach(function(s) {
      if (!s) return;
      if (s.production) powerGain += s.production;
    });

    player.power = Math.min(player.maxPower, powerGain);
    this.log(player.name + ' gains ' + powerGain + ' Power (' + player.power + ' available)');

    // Structure start-of-turn effects
    var selfS = this;
    player.field.base.forEach(function(s) {
      if (!s) return;
      // Regenerate structures
      if (s.ability && s.ability.includes('Regenerate') && !s.silenced) {
        s.currentHp = Math.min(s.health, (s.currentHp || s.health) + 2);
        selfS.log(s.name + ' regenerates 2 HP!');
      }
      // Time Vault: extra mana
      if (s.name === 'Time Vault') {
        player.mana = Math.min(player.mana + 1, 10);
        selfS.log('Time Vault: +1 Mana!');
      }
      // Mutation Lab: random keyword to random ally
      if (s.name === 'Mutation Lab') {
        var allies = player.field.battle.filter(function(c) { return c; });
        if (allies.length > 0) {
          var target = allies[Math.floor(Math.random() * allies.length)];
          var kws = ['Ward', 'Pierce', 'Lifesteal', 'Thorns', 'Regenerate', 'Enrage'];
          var kw = kws[Math.floor(Math.random() * kws.length)];
          target.ability = (target.ability || '') + ' ' + kw;
          selfS.log('Mutation Lab: ' + target.name + ' gains ' + kw + '!');
        }
      }
      // Dark Portal: random destroy
      if (s.name === 'Dark Portal') {
        var roll = Math.random();
        if (roll < 0.3) {
          var enemies = selfS.player === player ? selfS.enemy.field.battle : selfS.player.field.battle;
          enemies = enemies.filter(function(c) { return c; });
          if (enemies.length > 0) {
            var target = enemies[Math.floor(Math.random() * enemies.length)];
            selfS.destroyCard(selfS.player === player ? selfS.enemy : selfS.player, target);
            selfS.log('Dark Portal destroys ' + target.name + '!');
          }
        } else if (roll < 0.6) {
          var allies2 = player.field.battle.filter(function(c) { return c; });
          if (allies2.length > 0) {
            var target2 = allies2[Math.floor(Math.random() * allies2.length)];
            selfS.destroyCard(player, target2);
            selfS.log('Dark Portal backfires! Destroys ' + target2.name + '!');
          }
        }
      }
      // Lightning Rod: spell trigger damage
      if (s.name === 'Lightning Rod' && s._lastSpellTurn !== player.turn) {
        // handled in applySpellEffect
      }
    });

    if (this.battleground && this.battleground.id === 'beijing' && this.applyBGRules !== false) {
      var self = this;
      player.field.battle.forEach(function(c) {
        if (c) {
          c.currentHp = (c.currentHp !== undefined ? c.currentHp : c.health) - 1;
          if (c.currentHp <= 0) self.destroyCard(player, c);
        }
      });
    }

    if (this.battleground && this.battleground.id === 'lahore' && this.applyBGRules !== false) {
      player.field.base.forEach(function(s) {
        if (s && s.currentHp !== undefined) {
          s.currentHp = Math.min(s.health, s.currentHp + 1);
        }
      });
    }

    this.updateTeamSynergies(player);

    // ===== CHARACTER KEYWORD START-OF-TURN =====
    // BLOOM (Biopure) — heal base for each Biopure creature
    this.applyBloom(player);

    // ===== END CHARACTER KEYWORDS =====

    this.phase = 'main';
    player.field.base.forEach(function(s) {
      if (s && s.ability && s.ability.includes('Generate')) {
        // power already counted from production
      }
    });

    // Investment payout check
    if (player.investmentTurns > 0) {
      player.investmentTurns--;
      if (player.investmentTurns === 0) {
        player.power = Math.min(player.maxPower, player.power + 6);
        this.log('Investment matures! +6 Power!');
      }
    }

    this.emit('turnStart', { player: player, turn: player.turn });

    if (player === this.enemy && !this.netHumanEnemy) {
      var self = this;
      // Stagger AI actions for visual clarity — let player see each move
      setTimeout(function() {
        if (self.state !== 'battle') return;
        self.aiPlayCards();
        // Pause between play and attack phases
        setTimeout(function() {
          if (self.state !== 'battle') return;
          self.aiAttack();
          // Pause before ending turn
          setTimeout(function() {
            if (self.state !== 'battle') return;
            self.endTurn(self.enemy);
          }, 300);
        }, 400);
      }, 500);
    }
  }

  updateTeamSynergies(player) {
    var teamCounts = {};
    player.field.battle.filter(function(c) { return c; }).forEach(function(c) {
      if (c.team && c.team !== 'Neutral' && c.team !== null) {
        teamCounts[c.team] = (teamCounts[c.team] || 0) + 1;
      }
    });
    player.field.base.filter(function(s) { return s; }).forEach(function(s) {
      if (s.team && s.team !== 'Neutral' && s.team !== null) {
        teamCounts[s.team] = (teamCounts[s.team] || 0) + 1;
      }
    });

    var oldSynergies = player.teamSynergies || {};
    player.teamSynergies = {};

    var self = this;
    Object.keys(teamCounts).forEach(function(team) {
      var count = teamCounts[team];
      if (count >= 2) {
        player.teamSynergies[team] = count;
        var wasActive = oldSynergies[team] && oldSynergies[team] >= 2;
        var tierJustHit = (!oldSynergies[team] || oldSynergies[team] < count);
        if (!wasActive || (count >= 3 && oldSynergies[team] < 3)) {
          self.log('TEAM SYNERGY: ' + team + ' x' + count + ' activated!' + (count >= 3 ? ' (FULL)' : ' (minor)'));
          self.emit('teamSynergy', { player: player, team: team, count: count, full: count >= 3 });
          self.applyTeamSynergyBonus(player, team);
        } else if (tierJustHit && count > 3) {
          // stacking beyond 3 — small echo bonus, no full re-trigger
          self.emit('teamSynergy', { player: player, team: team, count: count, full: true });
        }
      }
    });
  }

  applyTeamSynergyBonus(player, team) {
    var self = this;
    // Star-Realms style tiers: 2-of = minor ally bonus, 3+ = full team bonus
    var count = (player.teamSynergies && player.teamSynergies[team]) || 0;
    var full = count >= 3;
    var bonuses = {
      'Overchargers': function(cards) { cards.forEach(function(c) { c.currentAtk = (c.currentAtk || c.attack) + (full ? 1 : 1); if (full) c.canAttack = true; }); self.log(full ? 'Overchargers Synergy: +1 ATK + Charge!' : 'Overchargers Ally: +1 ATK!'); },
      'Fortress': function(cards) { cards.forEach(function(c) { c.currentDef = (c.currentDef || c.defense) + (full ? 2 : 1); }); self.log(full ? 'Fortress Synergy: +2 DEF!' : 'Fortress Ally: +1 DEF!'); },
      'Control': function(cards) { player.power = Math.min(player.maxPower, player.power + (full ? 2 : 1)); self.log(full ? 'Control Synergy: +2 Power!' : 'Control Ally: +1 Power!'); },
      'Synergy': function(cards) { cards.forEach(function(c) { c.currentAtk = (c.currentAtk || c.attack) + 1; if (full) c.currentDef = (c.currentDef || c.defense) + 1; }); self.log(full ? 'Synergy Synergy: +1/+1!' : 'Synergy Ally: +1 ATK!'); },
      'Economy': function(cards) { player.power = Math.min(player.maxPower, player.power + (full ? 3 : 1)); self.log(full ? 'Economy Synergy: +3 Power!' : 'Economy Ally: +1 Power!'); },
      'Chaos': function(cards) { cards.forEach(function(c) { c.currentAtk = Math.floor(Math.random() * (full ? 4 : 2)) + c.attack; }); self.log('Chaos Synergy: ATK randomized!'); },
      'Synth Legends': function(cards) { cards.forEach(function(c) { c.currentHp = Math.min(c.health, (c.currentHp || c.health) + (full ? 3 : 1)); }); self.log(full ? 'Synth Legends Synergy: +3 HP!' : 'Synth Legends Ally: +1 HP!'); },
      'Titanborn': function(cards) { cards.forEach(function(c) { c.currentAtk = (c.currentAtk || c.attack) + (full ? 2 : 1); if (full) c.currentDef = (c.currentDef || c.defense) + 2; }); self.log(full ? 'Titanborn Synergy: +2/+2!' : 'Titanborn Ally: +1 ATK!'); }
    };
    var bonus = bonuses[team];
    if (bonus) {
      var cards = player.field.battle.filter(function(c) { return c && c.team === team; });
      bonus(cards);
    }
    this.recordEvent('teamSynergy', { player: player === this.player ? 'player' : 'enemy', team: team, count: player.teamSynergies[team] });
      this.emit('synergyEffect', { player: player, team: team });
  }

  aiTurn() {
    // Add small delay between AI actions for visual clarity
    this.aiPlayCards();
    if (this.state !== 'battle') return;
    this.aiAttack();
    if (this.state !== 'battle') return;
    this.endTurn(this.enemy);
  }

  aiPlayCards() {
    var self = this;
    var style = this.enemy.aiStyle || this._enemyStyle || 'balanced';

    // Context: current board state
    var myBoard = this.enemy.field.battle.filter(function(x) { return x; });
    var myCount = myBoard.length;
    var playerBoard = this.player.field.battle.filter(function(x) { return x; });
    var playerCount = playerBoard.length;
    var myHp = this.enemy.hp;
    var playerHp = this.player.hp;
    var myPower = this.enemy.power;

    // Score and sort all playable hand cards
    var playable = this.enemy.hand.slice().map(function(c) {
      var cost = self.getEffectiveCost(self.enemy, c);
      if (cost > myPower) return { card: c, score: -999, cost: cost, slot: null };

      var slot = self.findEmptySlot(self.enemy, c.type);
      if (!slot && c.type !== 'Spell' && c.type !== 'Action' && c.type !== 'Gear') {
        return { card: c, score: -999, cost: cost, slot: null };
      }

      var score = 0;
      var atk = c.attack || 0;
      var def = c.defense || 0;
      var hp = c.health || 0;
      var stats = atk + def + hp;
      var ability = c.ability || '';
      var lowAb = ability.toLowerCase();

      // === GENERAL SCORING ===
      // Base stat efficiency
      score += stats;

      // Cost efficiency (good stats per power)
      if (cost > 0) score += (stats / cost) * 2;

      // Rarity bonus for impactful cards
      var RARITY_VAL = { mythic: 8, legendary: 6, epic: 4, rare: 3, uncommon: 2, common: 1 };
      score += (RARITY_VAL[c.rarity] || 0);

      // === TYPE-SPECIFIC SCORING ===
      if (c.type === 'Creature') {
        // Board presence matters
        score += atk * 1.5 + def + hp * 0.5;

        // Taunt/Cover: extra value when defending low HP
        if (myHp <= 15 && (lowAb.includes('taunt') || lowAb.includes('cover'))) score += 12;
        // Haste/Charge: immediate damage
        if (lowAb.includes('charge') || lowAb.includes('haste')) score += 8;

        // Don't overfill board
        if (myCount >= 5) score -= 30;
        // Play creatures if board is empty
        if (myCount === 0) score += 8;
      }

      if (c.type === 'Spell') {
        // === OFFENSIVE SPELLS (damage) ===
        var dmgMatch = ability.match(/Deal (\d+) damage/);
        var dmgAmount = dmgMatch ? parseInt(dmgMatch[1]) : 0;

        // AoE damage: value goes up with more enemy creatures
        if (dmgAmount > 0 && lowAb.includes('all enemy')) {
          var potentialDmg = dmgAmount * playerCount;
          score += potentialDmg * 2;
          // Clear their board
          if (potentialDmg >= self._avgHp(playerBoard)) score += 15;
        }
        // Single target damage
        if (dmgAmount > 0 && !lowAb.includes('all')) {
          // Can it kill anything?
          var killable = playerBoard.filter(function(cr) {
            return (cr.currentHp !== undefined ? cr.currentHp : cr.health) <= dmgAmount;
          });
          if (killable.length > 0) {
            score += 12; // removal is premium
            var highestThreat = killable.reduce(function(a, b) {
              return ((a.currentAtk || a.attack || 0) > (b.currentAtk || b.attack || 0)) ? a : b;
            }, killable[0]);
            score += (highestThreat.currentAtk || highestThreat.attack || 0) * 1.5;
          }
          // Direct base damage when opponent is low
          if (dmgAmount >= playerHp - dmgAmount) score += 100; // lethal!
          if (playerHp <= 10 && dmgAmount >= 3) score += 20;
        }

        // === BUFF SPELLS ===
        if (lowAb.includes('all creatures gain') || lowAb.includes('atk') || lowAb.includes('charge')) {
          if (myCount > 0) score += myCount * 6; // buff your board
          if (myCount === 0) score -= 8;  // useless with no board
        }

        // === HEALING SPELLS ===
        if (lowAb.includes('restore') || lowAb.includes('heal') || lowAb.includes('healing')) {
          if (myHp <= 15) score += 15;
          var healMatch = ability.match(/Restore (\d+)/);
          var healAmt = healMatch ? parseInt(healMatch[1]) : 0;
          if (healAmt >= playerHp - myHp) score += 20; // keep alive
        }

        // === DRAW SPELLS ===
        if (lowAb.includes('draw')) {
          if (self.enemy.hand.length <= 4) score += 6;
          else score += 2;
        }

        // === DESTROY / REMOVAL ===
        if (lowAb.includes('destroy') || lowAb.includes('oblivion')) {
          if (playerCount >= 2) score += 15;
          // Board wipe when outnumbered
          if (playerCount > myCount + 2) score += 25;
        }

        // Strategy-specific spell bonuses
        if (style === 'aggro' && (lowAb.includes('damage') || lowAb.includes('atk') || lowAb.includes('charge'))) score += 6;
        if (style === 'control' && (lowAb.includes('silence') || lowAb.includes('drain') || lowAb.includes('destroy'))) score += 8;
        if (style === 'tank' && (lowAb.includes('restore') || lowAb.includes('def') || lowAb.includes('taunt'))) score += 6;
      }

      if (c.type === 'Trap') {
        // Traps are more valuable with more enemy attackers
        score += playerCount * 3;
        if (c.ability && (c.ability.includes('Deal') || c.ability.includes('destroy'))) score += 5;
        if (style === 'control') score += 8;
        if (style === 'tank') score += 5;
      }

      if (c.type === 'Structure') {
        // Production structures are always valuable
        if (c.production && c.production > 0) {
          score += c.production * 10;
          // More valuable when low on power
          if (myPower < 4) score += 8;
        }
        if (c.health) score += c.health;
        if (lowAb.includes('taunt') || lowAb.includes('cover')) score += 8;
        if (style === 'tank') score += 10;
      }

      // === CONTEXT OVERLAYS ===
      // Going for the kill: play everything
      if (playerHp <= 0) score += 50;
      // Don't waste cards if already winning
      if (myHp <= 5 && c.type !== 'Structure' && !lowAb.includes('restore') && !lowAb.includes('taunt') && !lowAb.includes('cover')) score -= 5;
      // Hand size management
      if (self.enemy.hand.length >= 8) score += 3; // play cards to avoid overdraw

      return { card: c, score: Math.round(score), cost: cost, slot: slot };
    });

    // Sort by score descending
    playable.sort(function(a, b) { return b.score - a.score; });

    // Play cards in priority order while power allows
    for (var i = 0; i < playable.length; i++) {
      var item = playable[i];
      if (item.score < 0) break;
      if (this.enemy.power < item.cost) continue;
      if (this.state !== 'battle') return;

      // Re-find slot (may have changed after previous plays)
      var slot = this.findEmptySlot(this.enemy, item.card.type);
      if (!slot && item.card.type !== 'Spell' && item.card.type !== 'Action' && item.card.type !== 'Gear') continue;

      this.playCard(this.enemy, item.card, slot || { zone: 'battle', index: 0 });

      // === AI CHARACTER KEYWORD: TRANSMUTE (Refinist) ===
      // If the played card has Transmute and there's a Colorless creature to sacrifice, do it
      if (this.state === 'battle' && this.hasKeyword(item.card, 'Transmute')) {
        var colorlessSac = this.enemy.field.battle.filter(function(c) {
          return c && c !== item.card && !c.character && !c.id.startsWith('ref_') && !c.id.startsWith('token_');
        }).sort(function(a, b) {
          var aVal = (a.currentAtk || a.attack || 0) + (a.currentDef || a.defense || 0);
          var bVal = (b.currentAtk || b.attack || 0) + (b.currentDef || b.defense || 0);
          return aVal - bVal; // sacrifice the weakest first
        });
        if (colorlessSac.length > 0 && (colorlessSac[0].currentAtk || 0) <= 3) {
          // Only sacrifice if the creature is weak enough to be worth it
          var sacrificed = colorlessSac[0];
          this.applyTransmute(this.enemy, item.card, sacrificed);
        }
      }

      if (this.state !== 'battle') return;
      if (this.enemy.power <= 0) break;

      // Re-sort remaining playable after each play (stats change)
      break; // break to re-evaluate from scratch
    }

    // Recurse if we still have power and playable cards
    if (this.enemy.power > 0 && this.state === 'battle') {
      var stillPlayable = this.enemy.hand.filter(function(c) {
        return self.getEffectiveCost(self.enemy, c) <= self.enemy.power;
      });
      if (stillPlayable.length > 0) {
        this.aiPlayCards();
      }
    }
  }

  // Helper: average HP of a board (for AoE evaluation)
  _avgHp(cards) {
    if (!cards || cards.length === 0) return 0;
    var total = 0, count = 0;
    cards.forEach(function(c) {
      if (c) { total += (c.currentHp !== undefined ? c.currentHp : c.health || 0); count++; }
    });
    return count > 0 ? total / count : 0;
  }

  aiAttack() {
    var self = this;
    var style = this.enemy.aiStyle || this._enemyStyle || 'balanced';

    // Get all attackers that can attack
    var attackers = this.enemy.field.battle.filter(function(c) {
      return c && (!c.justPlayed || c.canAttack) && !(c.frozenTurns && c.frozenTurns > 0);
    }).sort(function(a, b) {
      // Higher speed first for First Strike, then ATK
      var speedA = a.speed || 0;
      var speedB = b.speed || 0;
      if (speedB !== speedA) return speedB - speedA;
      return (b.currentAtk || b.attack || 0) - (a.currentAtk || a.attack || 0);
    });

    var playerCreatures = this.player.field.battle.filter(function(c) { return c; });
    var playerStructures = this.player.field.base.filter(function(s) { return s && s.currentHp > 0; });

    for (var i = 0; i < attackers.length; i++) {
      var attacker = attackers[i];
      if (!attacker || this.state !== 'battle') break;

      var atkVal = attacker.currentAtk !== undefined ? attacker.currentAtk : (attacker.attack || 0);

      // === AI CHARACTER KEYWORD: OVERCLOCK (Cyborg) ===
      // Activate Overclock if it gives meaningful extra reach (+1 attack at cost of 1 self-damage)
      if (this.hasKeyword(attacker, 'Overclock') && attacker.attacksPerTurn < 3) {
        var hpAfterSelfDmg = (attacker.currentHp || attacker.health || 1) - 1;
        if (hpAfterSelfDmg > 0 && (atkVal >= 2 || (playerCreatures.length > 0 && playerCreatures.some(function(c) { return (c.currentHp || c.health || 0) <= atkVal; })))) {
          attacker.attacksPerTurn = Math.min(3, (attacker.attacksPerTurn || 1) + 1);
          attacker.attacksLeft = (attacker.attacksLeft || 0) + 1;
          attacker._overclockExtraAttack = true;
          this.log(attacker.name + ' Overclock activated! +1 attack!');
          this.emit('abilityTrigger', { player: this.enemy, card: attacker, type: 'overclock' });
        }
      }

      if (playerCreatures.length > 0) {
        // Must attack Taunt if present
        var taunted = playerCreatures.find(function(c) {
          return c.ability && c.ability.includes('Taunt') && !c.silenced;
        });

        if (taunted) {
          this.attack(this.enemy, attacker, taunted);
        } else {
          // Strategic target selection
          var target = this._aiSelectAttackTarget(attacker, playerCreatures, style);
          this.attack(this.enemy, attacker, target);
        }
      } else if (playerStructures.length > 0 && atkVal >= 4 && style !== 'aggro') {
        // Destroy key structures before going face
        var priorityStructure = playerStructures.sort(function(a, b) {
          var aProd = a.production || 0;
          var bProd = b.production || 0;
          return bProd - aProd;
        })[0];
        this.attackStructure(this.enemy, attacker, this.player, priorityStructure);
      } else {
        // Go face — attack the player base directly
        this.attack(this.enemy, attacker, this.player);
      }

      if (this.state !== 'battle') return;
    }
  }

  _aiSelectAttackTarget(attacker, playerCreatures, style) {
    var atkVal = attacker.currentAtk !== undefined ? attacker.currentAtk : (attacker.attack || 0);

    // Aggro: go face if possible (trade only if a creature threatens lethal next turn)
    if (style === 'aggro') {
      // Find the weakest creature we can kill
      var killable = playerCreatures.filter(function(c) {
        var hp = c.currentHp !== undefined ? c.currentHp : c.health;
        return hp <= atkVal;
      });
      if (killable.length > 0) {
        // Kill the highest-ATK creature we can to remove threat
        return killable.sort(function(a, b) {
          return (b.currentAtk || b.attack || 0) - (a.currentAtk || a.attack || 0);
        })[0];
      }
      // Can't kill anything — attack the weakest to chip damage
      return playerCreatures.slice().sort(function(a, b) {
        return (a.currentHp || a.health) - (b.currentHp || b.health);
      })[0];
    }

    // Control: prioritize removing high-value targets
    if (style === 'control') {
      // Target the creature with the best ability
      var abilityTarget = playerCreatures.filter(function(c) {
        return c.ability && c.ability.length > 5;
      }).sort(function(a, b) {
        var aThreat = (a.currentAtk || a.attack || 0) + (a.currentHp || a.health || 0);
        var bThreat = (b.currentAtk || b.attack || 0) + (b.currentHp || b.health || 0);
        return bThreat - aThreat;
      })[0];
      if (abilityTarget) return abilityTarget;
    }

    // Tank: target the most dangerous attacker
    if (style === 'tank') {
      return playerCreatures.slice().sort(function(a, b) {
        return (b.currentAtk || b.attack || 0) - (a.currentAtk || a.attack || 0);
      })[0];
    }

    // Balanced: optimal trading — kill what we can, trade efficiently
    var killable = playerCreatures.filter(function(c) {
      var hp = c.currentHp !== undefined ? c.currentHp : c.health;
      var def = c.currentDef !== undefined ? c.currentDef : (c.defense || 0);
      return hp + def <= atkVal;
    });
    if (killable.length > 0) {
      // Kill the highest-threat creature we can
      return killable.sort(function(a, b) {
        return (b.currentAtk || b.attack || 0) - (a.currentAtk || a.attack || 0);
      })[0];
    }
    // Can't kill — attack the weakest to set up future kills
    return playerCreatures.slice().sort(function(a, b) {
      return (a.currentHp || a.health) - (b.currentHp || b.health);
    })[0];
  }

  findEmptySlot(player, type) {
    if (type === 'Creature') {
      for (var i = 0; i < 5; i++) { if (!player.field.battle[i]) return { zone: 'battle', index: i }; }
    } else if (type === 'Structure') {
      for (var i = 0; i < 5; i++) { if (!player.field.base[i]) return { zone: 'base', index: i }; }
    } else if (type === 'Trap') {
      for (var i = 0; i < 3; i++) { if (!player.field.trap[i]) return { zone: 'trap', index: i }; }
    } else if (type === 'Spell') {
      return { zone: 'battle', index: 0 };
    }
    return null;
  }

  playCard(player, card, slot) {
    var effectiveCost = this.getEffectiveCost(player, card);
    if (player.power < effectiveCost) {
      this.emit('error', { message: 'Not enough Power! Need ' + effectiveCost + ', have ' + player.power });
      return false;
    }

    player.power -= effectiveCost;
    if (player.stats) {
      player.stats.powerSpent += effectiveCost;
      player.stats.cardsPlayed++;
      if (card.type === 'Spell') player.stats.spellsCast++;
      if (card.type === 'Structure') player.stats.structuresBuilt++;
    }
    // Remove the played card from hand by its unique instanceId (not id,
    // which would match all copies of the same base card).
    var playedInstId = card.instanceId;
    player.hand = player.hand.filter(function(c) { return c.instanceId !== playedInstId; });

    var cardInstance = Object.assign({}, card, {
      currentHp: card.health || 0,
      currentAtk: card.attack || 0,
      currentDef: card.defense || 0,
      currentStructureHp: (card.type === 'Structure') ? (card.health || 0) : 0,
      buffs: [],
      turnsOnField: 0,
      justPlayed: true,
      canAttack: false,
      attacksLeft: 0,
      attacksPerTurn: 1,
      instanceId: card.instanceId || this._newInstanceId()
    });

    // Structures with attack can attack (they are ranged weapons, not creatures)
    if (card.type === 'Structure' && card.attack > 0) {
      cardInstance.canAttack = true;
      cardInstance.attacksLeft = 1;
    }

    // HASTE keyword: creature can attack immediately (no summoning sickness)
    if (card.ability && (card.ability.includes('Haste') || card.ability.includes('haste'))) {
      cardInstance.canAttack = true;
      cardInstance.attacksLeft = 1;
      this.log(card.name + ' has Haste — can attack immediately!');
    }

    // CHARGE keyword: same as Haste (legacy keyword)
    if (card.ability && card.ability.includes('Charge')) {
      cardInstance.canAttack = true;
      cardInstance.attacksLeft = 1;
    }

    // SURGE keyword: extra attack this turn (windfury-style)
    if (card.ability && card.ability.includes('Surge')) {
      cardInstance.attacksPerTurn = 2;
      if (cardInstance.canAttack) cardInstance.attacksLeft = 2;
    }

    // OVERCLOCK (Cyborg): may attack extra times, with self-damage
    if (card.ability && card.ability.includes('Overclock')) {
      cardInstance.attacksPerTurn = 2;
      if (cardInstance.canAttack) cardInstance.attacksLeft = 2;
      this.log(card.name + ' has Overclock — can attack twice!');
    }

    if (slot.zone === 'battle') player.field.battle[slot.index] = cardInstance;
    else if (slot.zone === 'base') player.field.base[slot.index] = cardInstance;
    else if (slot.zone === 'trap') player.field.trap[slot.index] = cardInstance;
    else if (slot.zone === 'command') player.field.command = cardInstance;

    this.log(player.name + ' plays ' + card.name + ' [Cost: ' + effectiveCost + '] to ' + slot.zone);
    this.recordEvent('play', { player: player === this.player ? 'player' : 'enemy', card: card.name, type: card.type, cost: effectiveCost, zone: slot.zone });
    this.emit('playCard', { player: player, card: cardInstance, slot: slot, rarity: card.rarity });

    this.applyOnPlayEffect(player, cardInstance, slot);

    // ===== CHARACTER KEYWORD TRIGGERS ON PLAY =====
    if (cardInstance.type === 'Creature') {
      // REPLICATE (Memetic)
      if (this.hasKeyword(cardInstance, 'Replicate')) {
        this.applyReplicate(player, cardInstance);
      }
      // DEPLOY (Organizer)
      if (this.hasKeyword(cardInstance, 'Deploy')) {
        this.applyDeploy(player, cardInstance, slot.index);
      }
      // SACRAMENT (Technopriest)
      if (this.hasKeyword(cardInstance, 'Sacrament')) {
        // Auto-sacrifice the weakest creature if available
        var sacrificeTargets = player.field.battle.filter(function(c) {
          return c && c !== cardInstance;
        });
        if (sacrificeTargets.length > 0) {
          sacrificeTargets.sort(function(a, b) {
            return (a.currentAtk || a.attack || 0) - (b.currentAtk || b.attack || 0);
          });
          this.applySacrament(player, cardInstance, sacrificeTargets[0]);
        }
      }
      // DEVOTION (Technopriest)
      if (this.hasKeyword(cardInstance, 'Devotion')) {
        this.applyDevotion(player, cardInstance);
      }
      // DRIFT (Ethereal)
      if (this.hasKeyword(cardInstance, 'Drift')) {
        this.applyDrift(cardInstance);
      }
      // MANIFEST (Ethereal) — check if played as face-down
      if (this.hasKeyword(cardInstance, 'Manifest')) {
        // If the card was bought for 1 Power, treat as manifest
        this.applyManifest(player, cardInstance, effectiveCost);
      }
      // SYMBIOSIS (Biopure)
      if (this.hasKeyword(cardInstance, 'Symbiosis')) {
        var idx = player.field.battle.indexOf(cardInstance);
        var adjacents = [];
        if (idx > 0 && player.field.battle[idx - 1]) adjacents.push(player.field.battle[idx - 1]);
        if (idx < 4 && player.field.battle[idx + 1]) adjacents.push(player.field.battle[idx + 1]);
        adjacents.sort(function(a, b) {
          return (b.currentDef || b.defense || 0) - (a.currentDef || a.defense || 0);
        });
        if (adjacents.length > 0) this.applySymbiosis(cardInstance, adjacents[0]);
      }
    } else if (cardInstance.type === 'Structure') {
      // NETWORK (Organizer) — structures only
      if (this.hasKeyword(cardInstance, 'Network')) {
        this.applyNetwork(player, cardInstance);
      }
    }

    this.emit('playCardEffects', { player: player, card: cardInstance, slot: slot });

    if (card.type === 'Spell') {
      this.applySpellEffect(player, cardInstance);
      if (slot.zone === 'battle') player.field.battle[slot.index] = null;
      player.field.graveyard.push(cardInstance);
    }

    this.checkCombos(player);
    this.updateTeamSynergies(player);
    return true;
  }

  getEffectiveCost(player, card) {
    var cost = card.power || 0;

    if (player.field.command) {
      var cmd = player.field.command;
      if (cmd.ability && cmd.ability.includes('cost -1 Power')) cost = Math.max(1, cost - 1);
    }

    var hasCodex = player.field.base.some(function(s) { return s && s.name === 'Codex of Power'; });
    if (hasCodex && card.comboId === 'legend') cost = Math.max(1, cost - 1);

    var hasCamp = player.field.base.some(function(s) { return s && s.name === 'Forward Camp'; });
    if (hasCamp && card.type === 'Creature') cost = Math.max(1, cost - 1);

    var opponent = player === this.player ? this.enemy : this.player;
    var hasNullTower = opponent.field.base.some(function(s) { return s && s.name === 'Null Tower'; });
    if (hasNullTower) cost = cost + 1;

    if (this.battleground && this.battleground.id === 'beijing' && card.type === 'Spell') cost = Math.max(1, cost - 1);

    return Math.max(0, cost);
  }

  applyOnPlayEffect(player, card, slot) {
    var opponent = player === this.player ? this.enemy : this.player;
    var ability = card.ability || '';

    if (ability.includes('Invoke:') || ability.includes('Invocation')) {
      this.summonToken(player, slot);
    }

    if (ability.includes('Resonance:')) {
      var sameTeam = player.field.battle.filter(function(c) { return c && c.team === card.team && c !== card; }).length;
      if (sameTeam >= 1) {
        card.currentAtk += 2;
        card.currentDef += 2;
        this.log(card.name + ' Resonance activated! +2/+2');
        this.emit('abilityTrigger', { player: player, card: card, type: 'resonance' });
      }
    }

    if (ability.includes('Quake:')) {
      opponent.field.battle.forEach(function(c) {
        if (c) c.currentDef = Math.max(0, (c.currentDef || c.defense) - 1);
      });
      this.log(card.name + ' Quake! All enemy creatures -1 DEF!');
    }

    if (ability.includes('Drain:')) {
      opponent.basePower = Math.max(0, (opponent.basePower || 1) - 1);
      this.log(card.name + ' drains enemy power generation!');
    }

    if (ability.includes('Mute:')) {
      opponent.muted = true;
      this.log(card.name + ' silences the enemy!');
    }

    if (ability.includes('Scout:') || ability.includes('Deep Scan:') || ability.includes('Oracle:')) {
      var revealCount = ability.includes('ALL') ? opponent.hand.length
        : ability.includes('2 random') ? Math.min(2, opponent.hand.length)
        : Math.min(1, opponent.hand.length);
      if (revealCount > 0 && opponent.hand.length > 0) {
        var revealed = opponent.hand.slice(0, revealCount).map(function(c) { return c.name; }).join(', ');
        this.log(player.name + ' reveals: ' + revealed);
        this.emit('reveal', { player: player, revealed: opponent.hand.slice(0, revealCount) });
      }
      if (ability.includes('discards 1 revealed Spell')) {
        var spell = opponent.hand.find(function(c) { return c.type === 'Spell'; });
        if (spell) {
          opponent.hand = opponent.hand.filter(function(c) { return c !== spell; });
          opponent.field.graveyard.push(spell);
          this.log(opponent.name + ' discards ' + spell.name + '!');
        }
      }
    }

    if (ability.includes('Foresight:')) {
      var top = player.deck.slice(-2).reverse();
      if (top.length > 0) {
        this.log(player.name + ' foresight: ' + top.map(function(c) { return c.name; }).join(', '));
        this.emit('reveal', { player: player, revealed: top });
      }
    }

    if (ability.includes('Gravedig:')) {
      var gyCards = (player.field.graveyard || []).concat(opponent.field.graveyard || []);
      if (gyCards.length > 0) {
        var picked = gyCards[gyCards.length - 1];
        player.hand.push(Object.assign({}, picked));
        this.log(player.name + ' recovers ' + picked.name + ' from graveyard!');
      }
    }

    if (ability.includes('Levy:')) {
      opponent.basePower = Math.max(0, (opponent.basePower || 1) - 1);
      player.power = Math.min(player.maxPower, player.power + 1);
      this.log(card.name + ' Levy! Steal 1 power generation.');
    }

    // SILENCE keyword: find strongest enemy creature and silence it
    if (ability.includes('Silence') || ability.includes('Mute target')) {
      var silenceTargets = opponent.field.battle.filter(function(c) { return c && c.ability; });
      if (silenceTargets.length > 0) {
        silenceTargets.sort(function(a, b) {
          return (b.currentAtk || b.attack) - (a.currentAtk || a.attack);
        });
        this.applySilence(silenceTargets[0]);
        this.log(card.name + ' silences ' + silenceTargets[0].name + '!');
        this.emit('silence', { player: player, target: silenceTargets[0] });
      }
    }

    // POISON keyword: poison target creature with 2 stacks
    if (ability.includes('Poison') || ability.includes('poison')) {
      var poisonTargets = opponent.field.battle.filter(function(c) { return c; });
      if (poisonTargets.length > 0) {
        for (var pi = 0; pi < poisonTargets.length; pi++) {
          this.applyPoison(poisonTargets[pi], 2);
        }
        this.log(card.name + ' poisons enemy creatures! (2 stacks)');
        this.emit('poison', { player: player, stacks: 2 });
      }
    }

    // INFECT (Memetic) — infect target on combat damage
    if (ability.includes('Infect') && opponent.field.battle.length > 0) {
      var infectTargets = opponent.field.battle.filter(function(c) { return c; });
      if (infectTargets.length > 0) this.applyInfect(card, infectTargets[0]);
    }

    // BARRAGE keyword: attack all enemy creatures at once
    if (ability.includes('Barrage') || ability.includes('barrage')) {
      var barrageTargets = opponent.field.battle.filter(function(c) { return c; });
      var barrageAttacker = player.field.battle.find(function(c) { return c === card; });
      if (!barrageAttacker) barrageAttacker = card;
      this.log(card.name + ' BARRAGE! Attacks all enemy creatures!');
      var self2 = this;
      barrageTargets.forEach(function(t) {
        if (self2.state !== 'battle') return;
        self2.attack(player, barrageAttacker, t);
      });
      this.emit('barrage', { player: player, card: card });
    }
  }

  applySpellEffect(player, card) {
    this.log(player.name + ' casts ' + card.name + '!');
    var opponent = player === this.player ? this.enemy : this.player;
    var ability = card.ability || '';
    var self = this;

    if (player !== this.player && opponent.muted) {
      this.log('Spell blocked by Mute!');
      return;
    }

    if (ability.includes('All creatures gain')) {
      var atkMatch = ability.match(/\+(\d+) ATK/);
      var defMatch = ability.match(/\+(\d+) DEF/);
      var atkBuff = atkMatch ? parseInt(atkMatch[1]) : 0;
      var defBuff = defMatch ? parseInt(defMatch[1]) : 0;
      player.field.battle.forEach(function(c) {
        if (c) {
          c.currentAtk = (c.currentAtk || c.attack) + atkBuff;
          if (defBuff) c.currentDef = (c.currentDef || c.defense) + defBuff;
        }
      });
      this.log('All creatures +' + atkBuff + ' ATK' + (defBuff ? ' +' + defBuff + ' DEF' : ''));
    }

    if (ability.includes('Deal') && ability.includes('damage') && ability.includes('all enemy')) {
      var dmgMatch = ability.match(/Deal (\d+) damage/);
      var dmg = dmgMatch ? parseInt(dmgMatch[1]) : 2;
      opponent.field.battle.forEach(function(c) {
        if (c) {
          c.currentHp = (c.currentHp || c.health) - dmg;
          if (c.currentHp <= 0) self.destroyCard(opponent, c);
        }
      });
      this.log('Dealt ' + dmg + ' damage to all enemy creatures!');
    }

    if (ability.includes('Deal 2 damage to target enemy creature, then 1 damage to adjacent')) {
      var targets = opponent.field.battle.filter(function(c) { return c; });
      if (targets.length > 0) {
        targets[0].currentHp = (targets[0].currentHp || targets[0].health) - 2;
        if (targets[0].currentHp <= 0) this.destroyCard(opponent, targets[0]);
        if (targets[1]) {
          targets[1].currentHp = (targets[1].currentHp || targets[1].health) - 1;
          if (targets[1].currentHp <= 0) this.destroyCard(opponent, targets[1]);
        }
        this.log('Chain Lightning! 2+1 damage!');
      }
    }

    if (ability.includes('Restore') && ability.includes('HP') && ability.includes('all allied')) {
      var healMatch = ability.match(/Restore (\d+) HP/);
      var heal = healMatch ? parseInt(healMatch[1]) : 3;
      player.field.battle.forEach(function(c) {
        if (c) c.currentHp = Math.min(c.health, (c.currentHp || c.health) + heal);
      });
      this.log('Restored ' + heal + ' HP to all allied creatures!');
    }

    if (card.name === 'Healing Pulse') {
      player.field.battle.forEach(function(c) {
        if (c) c.currentHp = Math.min(c.health, (c.currentHp || c.health) + 4);
      });
    }

    if (ability.includes('Draw') && !ability.includes('Graveyard') && !ability.includes('deck')) {
      var drawMatch = ability.match(/Draw (\d+)/);
      var count = drawMatch ? parseInt(drawMatch[1]) : 1;
      for (var i = 0; i < count; i++) this.drawCard(player);
    }

    if (ability.includes('Destroy all')) {
      opponent.field.battle.forEach(function(c) { if (c) self.destroyCard(opponent, c); });
      player.field.battle.forEach(function(c) { if (c) self.destroyCard(player, c); });
      this.log('All creatures destroyed!');
    }

    if (ability.includes('Enemy loses') && ability.includes('Power') && ability.includes('You gain')) {
      var powerNums = ability.match(/(\d+) Power/g);
      var lostPower = powerNums ? parseInt(powerNums[0]) : 3;
      var gainedPower = powerNums && powerNums[1] ? parseInt(powerNums[1]) : 3;
      opponent.power = Math.max(0, opponent.power - lostPower);
      player.power = Math.min(player.maxPower, player.power + gainedPower);
      this.log('Power Drain! -' + lostPower + ' enemy, +' + gainedPower + ' you');
    }

    if (card.name === 'Investment') {
      player.power = Math.max(0, player.power - 2);
      player.investmentTurns = 1;
      this.log('Investment! +6 Power next turn.');
    }

    if (card.name === 'Emergency Fund') {
      player.power = Math.min(player.maxPower, player.power + 5);
      player.skipNextDraw = true;
      this.log('Emergency Fund! +5 Power, skip next draw.');
    }

    if (card.name === 'Market Crash') {
      var stolen = Math.ceil(opponent.power / 2);
      opponent.power = 0;
      player.power = Math.min(player.maxPower, player.power + stolen);
      this.log('Market Crash! Stole ' + stolen + ' power!');
    }

    if (card.name === 'Chaos Bolt') {
      var dmg = Math.floor(Math.random() * 8) + 1;
      var allTargets = opponent.field.battle.filter(function(c) { return c; });
      if (allTargets.length > 0 && Math.random() > 0.5) {
        var t = allTargets[Math.floor(Math.random() * allTargets.length)];
        t.currentHp = (t.currentHp || t.health) - dmg;
        if (t.currentHp <= 0) this.destroyCard(opponent, t);
        this.log('Chaos Bolt hits ' + t.name + ' for ' + dmg + '!');
      } else {
        opponent.hp = Math.max(0, opponent.hp - dmg);
        this.log('Chaos Bolt hits ' + opponent.name + ' base for ' + dmg + '!');
        this.emit('damage', { target: opponent, amount: dmg, type: 'base' });
      }
    }

    if (card.name === 'Shuffle') {
      var ph = [...player.hand]; player.hand = [];
      ph.forEach(function(c) { player.deck.push(c); });
      player.deck = this.shuffle(player.deck);
      var eh = [...opponent.hand]; opponent.hand = [];
      eh.forEach(function(c) { opponent.deck.push(c); });
      opponent.deck = this.shuffle(opponent.deck);
      for (var i = 0; i < 5; i++) this.drawCard(player);
      for (var i = 0; i < 5; i++) this.drawCard(opponent);
      this.log('Shuffle! Both drew 5 new cards!');
    }

    if (card.name === 'Mirror Realm') {
      var tmp = [...player.field.battle];
      player.field.battle = [...opponent.field.battle];
      opponent.field.battle = tmp;
      this.log('Mirror Realm! Creatures swapped!');
    }

    if (card.name === 'Oblivion') {
      opponent.field.battle.forEach(function(c) { if (c) self.destroyCard(opponent, c); });
      player.field.battle.forEach(function(c) { if (c) self.destroyCard(player, c); });
      for (var i = 0; i < 2; i++) { this.drawCard(player); this.drawCard(opponent); }
      this.log('Oblivion! All destroyed. Both draw 2.');
    }

    if (card.name === 'Counter Spell') {
      opponent.counterSpellActive = true;
      this.drawCard(player);
      this.log('Counter Spell! Next enemy spell negated. Drew 1.');
    }

    if (card.name === 'Freeze Ray') {
      var target = opponent.field.battle.find(function(c) { return c; });
      if (target) {
        target.frozenTurns = 2;
        this.log(target.name + ' frozen for 2 turns!');
      }
      this.drawCard(player);
    }

    if (card.name === 'Thoughtseize') {
      var nonCreature = opponent.hand.find(function(c) { return c.type !== 'Creature'; });
      if (nonCreature) {
        opponent.hand = opponent.hand.filter(function(c) { return c !== nonCreature; });
        opponent.field.graveyard.push(nonCreature);
        this.log('Thoughtseize discards ' + nonCreature.name + '!');
      }
    }

    if (card.name === 'Unity') {
      player.field.battle.forEach(function(c) {
        if (c) {
          c.currentAtk = (c.currentAtk || c.attack) + 2;
          c.currentDef = (c.currentDef || c.defense) + 2;
        }
      });
      this.log('Unity! All creatures +2/+2!');
    }

    if (card.name === 'Chain Reaction') {
      var linkCards = player.field.battle.filter(function(c) { return c && c.comboId === 'link'; });
      var dmg = linkCards.length * 3;
      opponent.hp = Math.max(0, opponent.hp - dmg);
      this.log('Chain Reaction! ' + linkCards.length + ' links = ' + dmg + ' damage!');
      if (dmg > 0) this.emit('damage', { target: opponent, amount: dmg, type: 'base' });
    }

    if (card.name === 'Harmonic Blast') {
      var linkCards = player.field.battle.filter(function(c) { return c && c.comboId === 'link'; });
      var dmg = linkCards.length * 2;
      opponent.hp = Math.max(0, opponent.hp - dmg);
      player.hp = Math.min(player.maxHp, player.hp + dmg);
      this.log('Harmonic Blast! ' + dmg + ' dealt and healed!');
    }

    if (card.name === 'Wild Mutation') {
      var target = opponent.field.battle.find(function(c) { return c; }) || player.field.battle.find(function(c) { return c; });
      if (target) {
        target.currentAtk = Math.floor(Math.random() * 8) + 1;
        target.currentDef = Math.floor(Math.random() * 8) + 1;
        this.log('Wild Mutation! ' + target.name + ' => ' + target.currentAtk + '/' + target.currentDef);
      }
    }

    if (card.name === 'Pandemonium') {
      var allCards = player.field.battle.filter(function(c) { return c; }).concat(opponent.field.battle.filter(function(c) { return c; }));
      allCards.forEach(function(c) {
        if (!c) return;
        var randTarget = allCards[Math.floor(Math.random() * allCards.length)];
        if (!randTarget) return;
        var dmg = Math.max(1, (c.currentAtk || c.attack) - (randTarget.currentDef || randTarget.defense));
        randTarget.currentHp = (randTarget.currentHp || randTarget.health) - dmg;
        if (randTarget.currentHp <= 0) {
          var owner = player.field.battle.indexOf(randTarget) >= 0 ? player : opponent;
          self.destroyCard(owner, randTarget);
        }
      });
      this.log('Pandemonium! All creatures attack random targets!');
    }

    if (card.name === 'Revitalize') {
      player.hp = player.maxHp;
      player.field.base.forEach(function(s, i) {
        if (s) { player.field.graveyard.push(s); player.field.base[i] = null; }
      });
      this.log('Revitalize! Full HP, structures gone!');
    }

    if (card.name === 'Overclock Surge') {
      player.field.battle.forEach(function(c) {
        if (c) { c.currentAtk = (c.currentAtk || c.attack) + 2; c.canAttack = true; }
      });
      this.log('Overclock Surge! All +2 ATK + Charge!');
    }

    if (card.name === 'Blitz Protocol') {
      for (var i = 0; i < 3; i++) {
        var drawn = this.drawCard(player);
        if (drawn && drawn.type === 'Creature') drawn.canAttack = true;
      }
      this.log('Blitz Protocol! Drew 3 cards with Charge!');
    }

    if (card.name === 'Muse Inspiration') {
      var weakest = player.field.battle.filter(function(c) { return c; }).sort(function(a, b) {
        return (a.currentAtk || a.attack) - (b.currentAtk || b.attack);
      })[0];
      if (weakest) {
        weakest.currentAtk = Math.max(weakest.currentAtk || weakest.attack, 8);
        weakest.currentDef = Math.max(weakest.currentDef || weakest.defense, 8);
        weakest.currentHp = Math.max(weakest.currentHp || weakest.health, 8);
        weakest.rarity = 'legendary';
        this.log('Muse Inspiration! ' + weakest.name + ' ascended!');
        this.emit('ascend', { player: player, card: weakest });
      }
    }

    if (card.name === 'Mountain Call') {
      var tokenSlot = this.findEmptySlot(player, 'Creature');
      if (tokenSlot) {
        var titan = {
          id: 'titan_' + Date.now(), name: 'Titan Avatar', type: 'Creature',
          team: 'Titanborn', rarity: 'epic', cost: 0,
          attack: 5, defense: 5, power: 0, production: 0,
          speed: 3, health: 5, range: 1, comboId: 'titan',
          currentHp: 5, currentAtk: 5, currentDef: 5,
          icon: '🏔️', ability: 'Taunt: Enemies must attack this creature if able.',
          instanceId: Date.now() + Math.random()
        };
        player.field.battle[tokenSlot.index] = titan;
        this.log(player.name + ' summons 5/5 Titan Avatar!');
        this.emit('summonToken', { player: player, card: titan });
      }
    }

    if (card.name === 'Signal Intercept') {
      var topCards = opponent.deck.slice(-3).reverse();
      this.log(player.name + ' peeks: ' + topCards.map(function(c) { return c.name; }).join(', '));
      this.emit('peek', { player: player, cards: topCards });
    }

    if (card.name === 'Mind Probe') {
      if (opponent.hand.length > 0) {
        var stolen = opponent.hand[0];
        opponent.hand.shift();
        player.hand.push(Object.assign({}, stolen));
        this.log(player.name + ' steals ' + stolen.name + '!');
      }
    }

    this.recordEvent('spellEffect', { player: player === this.player ? 'player' : 'enemy', card: card.name });
      this.emit('spellEffect', { player: player, card: card });
    this.checkWinCondition();
  }

  summonToken(player, slot) {
    var tokenSlot = this.findEmptySlot(player, 'Creature');
    if (tokenSlot) {
      var token = {
        id: 'token_' + Date.now(), name: 'Synth Token', type: 'Creature',
        team: (player.field.command && player.field.command.team) || 'Neutral',
        rarity: 'common', cost: 0,
        attack: 2, defense: 2, power: 0, production: 0,
        speed: 5, health: 2, range: 1,
        currentHp: 2, currentAtk: 2, currentDef: 2,
        icon: '✦', ability: 'Summon: Generated by ability.',
        instanceId: Date.now() + Math.random()
      };
      player.field.battle[tokenSlot.index] = token;
      this.log(player.name + ' summons a Synth Token!');
      this.emit('playCard', { player: player, card: token, slot: tokenSlot });
    }
  }

  checkCombos(player) {
    var battleCards = player.field.battle.filter(function(c) { return c; });
    var comboIds = {};
    battleCards.forEach(function(c) {
      if (c.comboId) comboIds[c.comboId] = (comboIds[c.comboId] || 0) + 1;
    });

    // 5-card combo win check: 5 unique teams on field wins the game
    var uniqueTeams = {};
    battleCards.forEach(function(c) {
      if (c.team && c.team !== 'Neutral' && c.team !== null) {
        uniqueTeams[c.team] = true;
      }
    });
    var teamCount = Object.keys(uniqueTeams).length;
    if (teamCount >= 5) {
      this.log('COMBO VICTORY! ' + player.name + ' has 5 unique teams on the field!');
      this.emit('combo', { type: 'Ultimate Combo', rarity: 'mythic', teams: Object.keys(uniqueTeams) });
      this.endGame(player, 'combo');
      return;
    }

    var self = this;
    Object.keys(comboIds).forEach(function(id) {
      var count = comboIds[id];
      var cards = battleCards.filter(function(c) { return c.comboId === id; });
      if (count >= 2) {
        if (id === 'rush') {
          cards.forEach(function(c) { c.currentAtk = (c.currentAtk || c.attack) + 2; c.canAttack = true; });
          self.log('⚡ TWIN STRIKE! Rush cards +2 ATK + Charge!');
          if (player.stats) player.stats.combosTriggered++;
          self.emit('combo', { type: 'Twin Strike', cards: cards, rarity: 'uncommon' });
        } else if (id === 'link') {
          cards.forEach(function(c) { c.currentAtk = (c.currentAtk || c.attack) + 1; c.currentDef = (c.currentDef || c.defense) + 1; });
          self.log('🔗 LINK SYNC! Link cards +1/+1!');
          self.emit('combo', { type: 'Link Sync', cards: cards, rarity: 'rare' });
        } else if (id === 'wall') {
          cards.forEach(function(c) { c.currentDef = (c.currentDef || c.defense) + 2; });
          self.log('🛡️ FORTRESS WALL! Wall cards +2 DEF!');
          self.emit('combo', { type: 'Fortress Wall', cards: cards, rarity: 'uncommon' });
        } else if (id === 'titan') {
          cards.forEach(function(c) { c.currentAtk = (c.currentAtk || c.attack) + 2; c.currentDef = (c.currentDef || c.defense) + 2; });
          self.log('🏔️ TITAN CLASH! Titan cards +2/+2!');
          self.emit('combo', { type: 'Titan Clash', cards: cards, rarity: 'epic' });
        } else if (id === 'legend') {
          cards.forEach(function(c) { c.currentHp = Math.min(c.health, (c.currentHp || c.health) + 4); });
          self.log('⭐ ANCIENT ACCORD! Legend cards +4 HP!');
          self.emit('combo', { type: 'Ancient Accord', cards: cards, rarity: 'legendary' });
        }
      }
      if (count >= 3 && id === 'gold') {
        player.power = Math.min(player.maxPower, player.power + 2);
        self.log('💰 GOLD RUSH! +2 Power!');
        self.emit('combo', { type: 'Gold Rush', cards: cards, rarity: 'epic' });
      }
    });

    // Check 5 unique team combo win
    this.checkComboWin(player);
  }

  attack(attackerPlayer, attackerCard, target) {
    if (!attackerCard || this.state !== 'battle') return;

    // Combat visual trigger: combat start
    this.emit('combatStart', { attacker: attackerCard, target: target, attackerPlayer: attackerPlayer });

    if (attackerCard.justPlayed && !attackerCard.canAttack) {
      this.emit('error', { message: attackerCard.name + ' has summoning sickness!' });
      return;
    }

    if (attackerCard.frozenTurns && attackerCard.frozenTurns > 0) {
      this.emit('error', { message: attackerCard.name + ' is frozen!' });
      return;
    }

    // Hearthstone-style: one attack per creature per turn (Surge = extra)
    if (attackerCard.attacksLeft !== undefined && attackerCard.attacksLeft <= 0) {
      this.emit('error', { message: attackerCard.name + ' has already attacked this turn!' });
      return;
    }

    // STEALTH breaks when the creature attacks
    if (attackerCard.ability && attackerCard.ability.includes('Stealth')) {
      attackerCard.ability = attackerCard.ability.replace(/Stealth/g, '').trim();
      this.log(attackerCard.name + ' breaks Stealth by attacking!');
    }

    attackerCard.turnsOnField = (attackerCard.turnsOnField || 0) + 1;
    if (attackerCard.attacksLeft !== undefined) attackerCard.attacksLeft--;

    var targetCard = null;
    var targetPlayer = null;

    if (target === this.player || target === this.enemy) {
      targetPlayer = target;
    } else {
      targetCard = target;
      targetPlayer = this.player.field.battle.indexOf(targetCard) >= 0 ? this.player : this.enemy;
    }

    if (targetCard && targetPlayer) {
      // STEALTH: untargetable until it attacks
      if (this.hasKeyword(targetCard, 'Stealth')) {
        this.emit('error', { message: targetCard.name + ' is Stealthed — cannot be targeted!' });
        return;
      }
      // FLYING: only Flying or Ranged attackers can hit it
      if (this.hasKeyword(targetCard, 'Flying')) {
        var canHitFlyer = this.hasKeyword(attackerCard, 'Flying') || this.hasKeyword(attackerCard, 'Ranged') || (attackerCard.range >= 2);
        if (!canHitFlyer) {
          this.emit('error', { message: attackerCard.name + ' cannot reach Flying target!' });
          return;
        }
      }
      var coverCard = targetPlayer.field.battle.find(function(c) { return c && c.ability && c.ability.includes('Cover') && c !== targetCard && !c.silenced; });
      if (coverCard) {
        this.log(coverCard.name + ' uses Cover!');
        targetCard = coverCard;
      }
    }

    if (!targetCard && targetPlayer) {
      var taunted = targetPlayer.field.battle.find(function(c) { return c && c.ability && c.ability.includes('Taunt') && !c.silenced; });
      if (taunted) {
        this.log('Forced to attack ' + taunted.name + ' (Taunt)!');
        targetCard = taunted;
      }
    }

    if (!targetCard && targetPlayer) {
      var trap = targetPlayer.field.trap.find(function(t) { return t; });
      if (trap) {
        this.triggerTrap(trap, attackerPlayer, attackerCard);
        return;
      }
    }

    var atkValue = attackerCard.currentAtk !== undefined ? attackerCard.currentAtk : (attackerCard.attack || 0);
    var defValue = targetCard ? (targetCard.currentDef !== undefined ? targetCard.currentDef : (targetCard.defense || 0)) : 0;

    // PRECISION (Synthetic) — ignores Stealth, Cover, and absolute defense
    var hasPrecision = this.hasKeyword(attackerCard, 'Precision');
    if (hasPrecision) {
      this.log(attackerCard.name + ' Precision! Pierces defenses.');
    }

    var damageReduction = 0;
    if (targetCard && targetCard.ability && targetCard.ability.includes('Absolute Defense') && !hasPrecision) damageReduction = 3;

    var damage = Math.max(1, atkValue - defValue - damageReduction);
    // Damage formula: damage = max(1, ATK - DEF - damageReduction)
    // Keyword modifiers: Ward, Shield, Pierce, Reflect, Thorns, Lifesteal, Immortal, Overkill, Enrage
    var kwResult = this.applyKeywordDamageModifiers(attackerCard, targetCard, damage, attackerPlayer, targetPlayer);
    damage = kwResult.damage;

    // First Strike: if attacker is faster, target doesn't counter
    var firstStrike = this.hasFirstStrike(attackerCard, targetCard);
    if (firstStrike) {
      this.log(attackerCard.name + ' has First Strike (Speed ' + (attackerCard.speed||0) + ' > ' + (targetCard ? (targetCard.speed||0) : 0) + ')!');
    }

    if (targetCard) {
      targetCard.currentHp = (targetCard.currentHp !== undefined ? targetCard.currentHp : targetCard.health) - damage;
      if (attackerPlayer.stats) attackerPlayer.stats.damageDealt += damage;
      this.log(attackerCard.name + ' [' + atkValue + '] attacks ' + targetCard.name + ' [DEF:' + defValue + '] for ' + damage + '!');
      this.emit('attack', { attacker: attackerCard, target: targetCard, damage: damage, rarity: attackerCard.rarity });
      this.emit('combatHit', { attacker: attackerCard, target: targetCard, damage: damage, attackerPlayer: attackerPlayer, targetPlayer: targetPlayer });
      this.recordEvent('attack', { attacker: attackerCard.name, target: targetCard.name, damage: damage });
      this.recordEvent('damage', { target: targetPlayer === this.player ? 'player' : 'enemy', card: targetCard.name, amount: damage, type: 'combat' });

      var counterAtk = targetCard.currentAtk !== undefined ? targetCard.currentAtk : (targetCard.attack || 0);
      var attackerDef = attackerCard.currentDef !== undefined ? attackerCard.currentDef : (attackerCard.defense || 0);
      var counterDmg = Math.max(0, counterAtk - attackerDef);
      // First Strike: no counter if attacker is faster
      if (counterDmg > 0 && !firstStrike) {
        attackerCard.currentHp = (attackerCard.currentHp !== undefined ? attackerCard.currentHp : attackerCard.health) - counterDmg;
        this.log(targetCard.name + ' counters for ' + counterDmg + '!');
        this.emit('combatCounter', { attacker: attackerCard, target: targetCard, counterDamage: counterDmg });
      }
      // Thorns: deal 1 counter damage to attacker regardless of first strike
      if (kwResult.thorns > 0) {
        attackerCard.currentHp = (attackerCard.currentHp !== undefined ? attackerCard.currentHp : attackerCard.health) - kwResult.thorns;
      }
      // Reflect: 50% damage back
      if (kwResult.reflected > 0) {
        attackerCard.currentHp = (attackerCard.currentHp !== undefined ? attackerCard.currentHp : attackerCard.health) - kwResult.reflected;
        this.log(targetCard.name + ' reflects ' + kwResult.reflected + ' damage!');
      }

      if (kwResult.overkill > 0) {
        targetPlayer.hp = Math.max(0, targetPlayer.hp - kwResult.overkill);
        this.emit('damage', { target: targetPlayer, amount: kwResult.overkill, type: 'overkill' });
      }
      if (targetCard.currentHp <= 0) { targetCard.survivedCombatThisTurn = false; this.destroyCard(targetPlayer, targetCard); }
      else { targetCard.survivedCombatThisTurn = true; }
      if (attackerCard.currentHp <= 0) this.destroyCard(attackerPlayer, attackerCard);
    } else {
      // Structure intercept: frontmost structure takes damage first
      var baseDmg = atkValue;

      // Combat visual trigger: base attack
      this.emit('baseAttack', { attacker: attackerCard, targetPlayer: targetPlayer, incomingDamage: baseDmg });

      var interceptStructure = null;
      for (var si = 0; si < targetPlayer.field.base.length; si++) {
        if (targetPlayer.field.base[si] && targetPlayer.field.base[si].currentHp > 0) {
          interceptStructure = targetPlayer.field.base[si];
          break;
        }
      }
      if (interceptStructure && !this.hasKeyword(attackerCard, 'Pierce')) {
        var structDef = interceptStructure.currentDef || interceptStructure.defense || 0;
        var structDmg = Math.max(1, baseDmg - structDef);
        // Demolish: double damage to structures
        if (this.hasKeyword(attackerCard, 'Demolish')) structDmg *= 2;
        interceptStructure.currentHp = (interceptStructure.currentHp || interceptStructure.health) - structDmg;
        this.log(attackerCard.name + ' hits ' + interceptStructure.name + ' for ' + structDmg + '!');
        this.recordEvent('structureDamage', { player: targetPlayer === this.player ? 'player' : 'enemy', structure: interceptStructure.name, damage: structDmg, remaining: interceptStructure.currentHp });
      this.emit('structureDamage', { player: targetPlayer, structure: interceptStructure, damage: structDmg });
        this.emit('structureHit', { player: targetPlayer, structure: interceptStructure, damage: structDmg, remaining: interceptStructure.currentHp, source: attackerCard });
        if (interceptStructure.currentHp <= 0) {
          this.recordEvent('structureDestroyed', { player: targetPlayer === this.player ? 'player' : 'enemy', structure: interceptStructure.name });
      this.emit('structureDestroyed', { player: targetPlayer, structure: interceptStructure, source: attackerCard });
          this.destroyCard(targetPlayer, interceptStructure);
          // Overflow damage to base
          var overflow = Math.abs(interceptStructure.currentHp);
          if (overflow > 0) {
            targetPlayer.hp = Math.max(0, targetPlayer.hp - overflow);
            this.log('Overflow: ' + overflow + ' damage to base!');
            this.emit('damage', { target: targetPlayer, amount: overflow, type: 'overkill' });
          }
        }
        // Counter from structure if it has Reflect
        if (interceptStructure.ability && interceptStructure.ability.includes('Reflect') && interceptStructure.currentHp > 0) {
          var reflectDmg = Math.floor(structDmg * 0.5);
          attackerCard.currentHp = (attackerCard.currentHp || attackerCard.health) - reflectDmg;
          this.log(interceptStructure.name + ' reflects ' + reflectDmg + '!');
          this.emit('combatCounter', { attacker: attackerCard, target: interceptStructure, counterDamage: reflectDmg });
          if (attackerCard.currentHp <= 0) this.destroyCard(attackerPlayer, attackerCard);
        }
        this.emit('structureDefense', { player: targetPlayer, totalAbsorbed: structDmg, remainingDamage: 0 });
        this.checkWinCondition();
        return;
      }
      var fortressWall = targetPlayer.field.base.find(function(s) { return s && s.name === 'Fortress Wall'; });
      if (fortressWall && fortressWall.currentHp > 0) {
        var absorbed = Math.min(3, baseDmg);
        baseDmg -= absorbed;
        fortressWall.currentHp = (fortressWall.currentHp || fortressWall.health) - absorbed;
        this.log('Fortress Wall absorbs ' + absorbed + '!');
        this.emit('structureHit', { player: targetPlayer, structure: fortressWall, damage: absorbed, remaining: fortressWall.currentHp, source: attackerCard });
        if (fortressWall.currentHp <= 0) {
          this.emit('structureDestroyed', { player: targetPlayer, structure: fortressWall, source: attackerCard });
          this.destroyCard(targetPlayer, fortressWall);
        }
      }
      // Shield absorbs flat damage before HP
      var shieldAbsorb = Math.min(targetPlayer.shield || 0, baseDmg);
      if (shieldAbsorb > 0) {
        targetPlayer.shield -= shieldAbsorb;
        baseDmg -= shieldAbsorb;
        this.log(targetPlayer.name + "'s shield absorbs " + shieldAbsorb + ' damage!');
        this.emit('shieldAbsorb', { player: targetPlayer, absorbed: shieldAbsorb });
      }
      targetPlayer.hp = Math.max(0, targetPlayer.hp - baseDmg);
      if (attackerPlayer.stats) attackerPlayer.stats.damageDealt += baseDmg;
      if (targetPlayer.stats) targetPlayer.stats.damageTaken += baseDmg;
      this.log(attackerCard.name + ' hits ' + targetPlayer.name + ' base for ' + baseDmg + '!');
      this.recordEvent('damage', { target: targetPlayer === this.player ? 'player' : 'enemy', amount: baseDmg, type: 'base' });
      this.emit('damage', { target: targetPlayer, amount: baseDmg, type: 'base', attacker: attackerCard });

      // ADRENALINE (Cyborg) — +1 ATK on direct base damage
      this.applyAdrenaline(attackerCard, baseDmg);

      var counterWall = targetPlayer.field.trap.find(function(t) { return t && t.name === 'Counter Wall'; });
      if (counterWall) {
        attackerCard.currentHp = (attackerCard.currentHp !== undefined ? attackerCard.currentHp : attackerCard.health) - atkValue;
        this.log('Counter Wall reflects ' + atkValue + ' back!');
        if (attackerCard.currentHp <= 0) this.destroyCard(attackerPlayer, attackerCard);
      }
    }

    this.emit('combatEnd', { attacker: attackerCard, target: targetCard, attackerPlayer: attackerPlayer });
    // ===== OVERCLOCK self-damage after attack =====
    this._applyOverclockSelfDamage(attackerCard);

    this.checkWinCondition();
    this.checkDominationWin();
  }

  triggerTrap(trap, attackerPlayer, attackerCard) {
    if (trap.ability.includes('Deal')) {
      var match = trap.ability.match(/Deal (\d+)/);
      var dmg = match ? parseInt(match[1]) : 3;
      attackerCard.currentHp = (attackerCard.currentHp !== undefined ? attackerCard.currentHp : attackerCard.health) - dmg;
      this.log('TRAP! ' + trap.name + ' deals ' + dmg + ' to ' + attackerCard.name + '!');
      this.recordEvent('trapTrigger', { trap: trap.name, target: attackerCard.name, damage: dmg });
      this.emit('trapTrigger', { trap: trap, attacker: attackerCard, damage: dmg });
      if (attackerCard.currentHp <= 0) this.destroyCard(attackerPlayer, attackerCard);
    }

    if (trap.name === 'Confusion Grid' && Math.random() < 0.5) {
      attackerPlayer.hp = Math.max(0, attackerPlayer.hp - (attackerCard.currentAtk || attackerCard.attack));
      this.log('Confusion Grid! Enemy attacks own base!');
    }

    if (trap.name === 'Unstable Mine') {
      if (Math.random() < 0.5) {
        this.destroyCard(attackerPlayer, attackerCard);
        this.log('Unstable Mine destroys ' + attackerCard.name + '!');
      } else {
        var ally = attackerPlayer.field.battle.find(function(c) { return c && c !== attackerCard; });
        if (ally) { this.destroyCard(attackerPlayer, ally); this.log('Unstable Mine backfires!'); }
      }
    }

    var trapOwner = this.player.field.trap.indexOf(trap) >= 0 ? this.player : this.enemy;
    var idx = trapOwner.field.trap.indexOf(trap);
    if (idx >= 0) {
      trapOwner.field.trap[idx] = null;
      trapOwner.field.graveyard.push(trap);
    }
  }

  destroyCard(player, card) {
    if (!card) return;
    this.log(card.name + ' destroyed!');
    // Track creature kill/loss stats
    if (player.stats && card.type === 'Creature') player.stats.creaturesLost++;
    var opponent = player === this.player ? this.enemy : this.player;
    if (opponent.stats && card.type === 'Creature') opponent.stats.creaturesKilled++;

    var recalled = false;
    if (card.ability && (card.ability.includes('Recall') || card.ability.includes('Seal:') || card.name === 'Vault Keeper')) {
      player.hand.push(Object.assign({}, card, { currentHp: card.health, currentAtk: card.attack, currentDef: card.defense, justPlayed: false, turnsOnField: 0 }));
      this.log(card.name + ' returns to hand!');
      this.emit('recall', { player: player, card: card });
      recalled = true;
    }
    if (!recalled) {
      player.field.graveyard.push(card);
    }

    if (card.ability && (card.ability.includes('Cataclysm') || card.ability.includes('Detonate'))) {
      var dmgMatch = card.ability.match(/deal (\d+) damage/i);
      var dmg = dmgMatch ? parseInt(dmgMatch[1]) : 3;
      var allPlayers = [this.player, this.enemy];
      var self = this;
      allPlayers.forEach(function(p) {
        p.field.battle.forEach(function(c) {
          if (c && c !== card) {
            c.currentHp = (c.currentHp !== undefined ? c.currentHp : c.health) - dmg;
            if (c.currentHp <= 0) self.destroyCard(p, c);
          }
        });
      });
      this.log(card.name + ' Cataclysm! ' + dmg + ' to all creatures!');
      this.emit('cataclysm', { card: card, damage: dmg });
    }

    if (card.name === 'Banker' && card.storedPower) {
      player.power = Math.min(player.maxPower, player.power + card.storedPower);
      this.log('Banker releases ' + card.storedPower + ' Power!');
    }

    for (var z = 0; z < ['battle', 'base', 'trap'].length; z++) {
      var zone = ['battle', 'base', 'trap'][z];
      var idx = player.field[zone].indexOf(card);
      if (idx >= 0) {
        player.field[zone][idx] = null;
        break;
      }
    }

    // Structure destruction: deal 1 splash damage to base
    if (card.type === 'Structure') {
      player.hp = Math.max(0, player.hp - 1);
      this.log(card.name + ' destroyed! Base takes 1 collateral damage!');
      this.emit('damage', { target: player, amount: 1, type: 'structure_destroyed' });
      // Mega Reactor death damage
      if (card.name === 'Mega Reactor') {
        var self3 = this;
        [this.player, this.enemy].forEach(function(p) {
          p.field.battle.forEach(function(c) {
            if (c) { c.currentHp = (c.currentHp || c.health) - 3; if (c.currentHp <= 0) self3.destroyCard(p, c); }
          });
        });
        this.log('Mega Reactor explodes! 3 damage to all creatures!');
      }
    }

    // Unsilence if was silenced
    if (card._originalAbility) {
      card.ability = card._originalAbility;
    }

    // INFECT spread on death (Memetic)
    this._spreadInfectOnDeath(player, card);

    // GAMBIT (Schemist) — coin-flip to survive
    if (this.checkGambit(card)) {
      return; // card survives at 1 HP
    }

    this.emit('destroy', { player: player, card: card });
    this.checkWinCondition();
  }

  checkDominationWin() {
    var self = this;
    [this.player, this.enemy].forEach(function(player) {
      var myStructures = player.field.base.filter(function(s) { return s; }).length;
      if (myStructures >= 3) {
        player.dominationTurns = (player.dominationTurns || 0) + 1;
        if (player.dominationTurns >= 3) {
          self.endGame(player, 'domination');
        }
      } else {
        player.dominationTurns = 0;
      }
    });
  }

  // ===== STRUCTURE DAMAGE/DEFENSE SYSTEM =====

  getFrontStructure(player) {
    for (var i = 0; i < player.field.base.length; i++) {
      var s = player.field.base[i];
      if (s && s.name !== 'Fortress Wall') {
        var hp = s.currentHp !== undefined ? s.currentHp : (s.health || 3);
        if (hp > 0) return s;
      }
    }
    return null;
  }

  damageStructure(player, structure, incomingAttack, source) {
    if (!structure || incomingAttack <= 0) return 0;
    var def = structure.currentDef !== undefined ? structure.currentDef : (structure.defense || 0);
    var dmgAfterDef = Math.max(1, incomingAttack - def);
    // Demolish: double damage to structures
    if (source && this.hasKeyword(source, 'Demolish')) dmgAfterDef *= 2;
    var oldHp = structure.currentHp !== undefined ? structure.currentHp : (structure.health || 3);
    var hpLost = Math.min(dmgAfterDef, oldHp);
    structure.currentHp = oldHp - hpLost;
    this.emit('structureHit', { player: player, structure: structure, damage: hpLost, remaining: structure.currentHp, source: source });
    this.log(structure.name + ' takes ' + hpLost + ' structural damage! (' + structure.currentHp + ' HP left)');
    if (structure.currentHp <= 0) {
      this.emit('structureDestroyed', { player: player, structure: structure, source: source });
      this.destroyCard(player, structure);
    }
    return hpLost;
  }

  attackStructure(attackerPlayer, attackerCard, targetPlayer, structure) {
    if (!attackerCard || !structure || this.state !== 'battle') return;
    if (attackerCard.justPlayed && !attackerCard.canAttack) {
      this.emit('error', { message: attackerCard.name + ' has summoning sickness!' });
      return;
    }
    if (attackerCard.frozenTurns && attackerCard.frozenTurns > 0) {
      this.emit('error', { message: attackerCard.name + ' is frozen!' });
      return;
    }

    // Hearthstone-style: one attack per creature per turn (Surge = extra)
    if (attackerCard.attacksLeft !== undefined && attackerCard.attacksLeft <= 0) {
      this.emit('error', { message: attackerCard.name + ' has already attacked this turn!' });
      return;
    }

    // STEALTH breaks when the creature attacks
    if (attackerCard.ability && attackerCard.ability.includes('Stealth')) {
      attackerCard.ability = attackerCard.ability.replace(/Stealth/g, '').trim();
      this.log(attackerCard.name + ' breaks Stealth by attacking!');
    }

    // Combat visual trigger: combat start
    this.emit('combatStart', { attacker: attackerCard, target: structure, attackerPlayer: attackerPlayer });
    attackerCard.turnsOnField = (attackerCard.turnsOnField || 0) + 1;
    if (attackerCard.attacksLeft !== undefined) attackerCard.attacksLeft--;

    var atkValue = attackerCard.currentAtk !== undefined ? attackerCard.currentAtk : (attackerCard.attack || 0);
    var hpLost = this.damageStructure(targetPlayer, structure, atkValue, attackerCard);

    this.emit('attack', { attacker: attackerCard, target: structure, damage: hpLost, rarity: attackerCard.rarity });
    this.emit('combatHit', { attacker: attackerCard, target: structure, damage: hpLost, attackerPlayer: attackerPlayer, targetPlayer: targetPlayer });

    // Counter: structure may have its own ATK value that hits back
    var structAliveHp = structure.currentHp !== undefined ? structure.currentHp : (structure.health || 0);
    if (structAliveHp > 0) {
      var structAtk = structure.currentAtk !== undefined ? structure.currentAtk : (structure.attack || 0);
      if (structAtk > 0) {
        var attackerDef = attackerCard.currentDef !== undefined ? attackerCard.currentDef : (attackerCard.defense || 0);
        var counterDmg = Math.max(0, structAtk - attackerDef);
        if (counterDmg > 0) {
          attackerCard.currentHp = (attackerCard.currentHp !== undefined ? attackerCard.currentHp : attackerCard.health) - counterDmg;
          this.log(structure.name + ' counters for ' + counterDmg + '!');
          this.emit('combatCounter', { attacker: attackerCard, target: structure, counterDamage: counterDmg });
          if (attackerCard.currentHp <= 0) this.destroyCard(attackerPlayer, attackerCard);
        }
      }
    }

    this.emit('combatEnd', { attacker: attackerCard, target: structure, attackerPlayer: attackerPlayer });
    this.checkWinCondition();
  }

  getStructureDefenseRating(player) {
    var total = 0;
    player.field.base.forEach(function(s) {
      if (s) {
        total += (s.currentDef !== undefined ? s.currentDef : (s.defense || 0));
        total += (s.currentHp !== undefined ? s.currentHp : (s.health || 0));
      }
    });
    return total;
  }

  endTurn(player) {
    this.phase = 'end';
    var self = this;

    player.field.battle.forEach(function(c) {
      if (c) {
        // Remove summoning sickness at end of owner's turn — creature can attack next turn
        c.canAttack = true;
        c.justPlayed = false;
        c.attacksLeft = c.attacksPerTurn || 1;
        if (c.frozenTurns && c.frozenTurns > 0) c.frozenTurns--;
        c.turnsOnField = (c.turnsOnField || 0) + 1;

        // POISON: take 1 damage per stack
        if (c.poisonStacks && c.poisonStacks > 0) {
          var pdmg = c.poisonStacks;
          c.currentHp = (c.currentHp !== undefined ? c.currentHp : c.health) - pdmg;
          c.poisonStacks = Math.max(0, c.poisonStacks - 1);
          self.log(c.name + ' takes ' + pdmg + ' poison damage!');
          self.emit('damage', { target: c, amount: pdmg, type: 'poison' });
          if (c.currentHp <= 0) { self.destroyCard(player, c); return; }
        }

        // REGENERATE: heal 1 HP at start of turn
        if (c.ability && c.ability.includes('Regenerate') && !c.silenced) {
          c.currentHp = Math.min(c.health, (c.currentHp || c.health) + 1);
          self.log(c.name + ' regenerates 1 HP!');
        }

        // FORTIFY: if survived combat this turn, gain +1/+1
        if (c.survivedCombatThisTurn) {
          c.currentAtk = (c.currentAtk || c.attack) + 1;
          c.currentDef = (c.currentDef || c.defense) + 1;
          c.survivedCombatThisTurn = false;
          self.log(c.name + ' Fortify! +1/+1 permanently!');
        }

        if (c.ability) {
          if (c.ability.includes('Ephemeral')) {
            self.destroyCard(player, c);
            return;
          }
          if (c.ability.includes('Regeneration')) {
            c.currentHp = Math.min(c.health, (c.currentHp || c.health) + 2);
            self.log(c.name + ' regenerates 2 HP!');
          }
          if (c.name === 'Hive Queen' && c.turnsOnField > 0) {
            var tokenSlot = self.findEmptySlot(player, 'Creature');
            if (tokenSlot) {
              var swarm = {
                id: 'swarm_' + Date.now(), name: 'Swarm Link', type: 'Creature',
                team: 'Synergy', rarity: 'common', cost: 0,
                attack: 2, defense: 2, power: 0, production: 0,
                speed: 4, health: 2, range: 1, comboId: 'link',
                currentHp: 2, currentAtk: 2, currentDef: 2,
                icon: '🐝', ability: 'Link: Synergy network member.',
                instanceId: Date.now() + Math.random()
              };
              player.field.battle[tokenSlot.index] = swarm;
              self.log('Hive Queen spawns 2/2 Link Swarm!');
            }
          }
          if (c.name === 'Chaos Engine') {
            var effect = Math.floor(Math.random() * 5);
            var opp = player === self.player ? self.enemy : self.player;
            if (effect === 0) { opp.hp = Math.max(0, opp.hp - 3); self.log('Chaos Engine deals 3!'); }
            else if (effect === 1) { player.hp = Math.min(player.maxHp, player.hp + 3); self.log('Chaos Engine heals 3!'); }
            else if (effect === 2) { self.drawCard(player); self.drawCard(player); self.log('Chaos Engine draws 2!'); }
            else if (effect === 3) { var d = player.hand.pop(); if (d) { player.field.graveyard.push(d); self.log('Chaos Engine discards ' + d.name + '!'); } }
            else { player.field.battle.forEach(function(c2) { if (c2) c2.currentAtk = Math.floor(Math.random() * 6) + 1; }); self.log('Chaos Engine scrambles ATK!'); }
          }
          // Ascendant Prototype: +1/+1 per turn survived (max +4/+4)
          if (c.name === 'Ascendant Prototype') {
            var maxBonus = 4;
            var bonus = Math.min(maxBonus, c.turnsOnField);
            c.currentAtk = c.attack + bonus;
            c.currentDef = c.defense + bonus;
          }
        }
      }
    });

    player.field.base.forEach(function(s) {
      if (s && s.name === 'Spy Network') {
        var opp = player === self.player ? self.enemy : self.player;
        if (opp.deck.length > 0) {
          var top = opp.deck[opp.deck.length - 1];
          self.log('Spy Network reveals: ' + top.name);
          self.emit('spy', { player: player, card: top });
        }
      }
    });

    var handLimit = (this.battleground && this.battleground.id === 'odessa') ? 7 : 10;
    while (player.hand.length > handLimit) {
      var discarded = player.hand.pop();
      player.field.graveyard.push(discarded);
      this.log(player.name + ' discards ' + discarded.name);
    }

    this.log(player.name + ' ends turn.');
    this.emit('turnEnd', { player: player });

    this.checkWinCondition();
    this.checkDominationWin();
    if (this.state !== 'battle') return;

    var nextPlayer = player === this.player ? this.enemy : this.player;
    this.startTurn(nextPlayer);
  }

  checkWinCondition() {
    if (this.state !== 'battle') return;
    if (this.player.hp <= 0) this.endGame(this.enemy, 'annihilation');
    else if (this.enemy.hp <= 0) this.endGame(this.player, 'annihilation');
  }

  endGame(winner, condition) {
    condition = condition || 'annihilation';
    if (this.state !== 'battle') return;
    this.state = 'result';
    this.winCondition = condition;

    var conditionMessages = {
      annihilation: 'Base HP reduced to zero!',
      domination: '3 Structures held for 3 turns!',
      exodus: 'Enemy deck exhausted!',
      combo: '5 unique teams on the field!',
      timeout: 'Time limit reached — highest HP wins!',
      suddendeath: 'Sudden Death — opponent eliminated!',
      draw: 'Both commanders fought to a standstill!'
    };

    if (winner === null) {
      this.log('=== DRAW! ' + (conditionMessages[condition] || '') + ' ===');
      this.emit('gameDraw', { condition: condition, message: conditionMessages[condition] });
      return;
    }

    this.log('=== ' + winner.name + ' WINS! [' + (conditionMessages[condition] || condition) + '] ===');
    this.recordEvent('gameEnd', { winner: winner === this.player ? 'player' : 'enemy', condition: condition });

    if (winner === this.player) {
      this.player.wins++;
      this.player.credits += 50;
      this.emit('victory', { player: this.player, condition: condition, message: conditionMessages[condition] });
    } else {
      this.player.losses++;
      this.emit('defeat', { player: this.player, condition: condition, message: conditionMessages[condition] });
    }
  }

  log(message) {
    var entry = { turn: this.currentPlayer ? this.currentPlayer.turn : 0, message: message, time: Date.now() };
    this.battleLog.push(entry);
    this.emit('log', entry);
  }

  recordEvent(type, data) {
    var event = {
      type: type,
      turn: this.turnCount,
      phase: this.phase,
      player: this.currentPlayer ? (this.currentPlayer === this.player ? 'player' : 'enemy') : 'system',
      data: data || {},
      time: Date.now(),
      playerHp: this.player ? this.player.hp : 0,
      enemyHp: this.enemy ? this.enemy.hp : 0
    };
    this.battleHistory.push(event);
  }

  getBattleHistory() { return this.battleHistory; }

  getMatchStats() {
    var p = this.player;
    var e = this.enemy;
    return {
      turns: this.turnCount,
      player: {
        hp: p.hp, maxHp: p.maxHp,
        damageDealt: (p.stats||{}).damageDealt || 0,
        damageTaken: (p.stats||{}).damageTaken || 0,
        cardsPlayed: (p.stats||{}).cardsPlayed || 0,
        creaturesKilled: (p.stats||{}).creaturesKilled || 0,
        creaturesLost: (p.stats||{}).creaturesLost || 0,
        spellsCast: (p.stats||{}).spellsCast || 0,
        combosTriggered: (p.stats||{}).combosTriggered || 0,
        manaSpent: (p.stats||{}).manaSpent || 0,
        powerSpent: (p.stats||{}).powerSpent || 0,
        cardsBought: (p.stats||{}).cardsBought || 0,
        healsTotal: (p.stats||{}).healsTotal || 0,
        structuresBuilt: (p.stats||{}).structuresBuilt || 0,
        graveyardCount: (p.field.graveyard||[]).length,
        cardsInHand: p.hand.length
      },
      enemy: {
        hp: e.hp, maxHp: e.maxHp,
        damageDealt: (e.stats||{}).damageDealt || 0,
        cardsPlayed: (e.stats||{}).cardsPlayed || 0,
        creaturesKilled: (e.stats||{}).creaturesKilled || 0
      },
      battleground: this.battleground ? this.battleground.name : 'Standard',
      winCondition: this.winCondition,
      historyCount: this.battleHistory.length
    };
  }

  getBattleLog() { return this.battleLog; }

  // ===== NEW KEYWORD ENGINE METHODS =====

  hasKeyword(card, keyword) {
    if (!card || !card.ability) return false;
    if (card.silenced) return false;
    return card.ability.toLowerCase().indexOf(keyword.toLowerCase()) >= 0;
  }

  // ===== CHARACTER KEYWORD IMPLEMENTATIONS =====

  // PRECISION (Synthetic) — Ignores Stealth and Cover when choosing a target.
  applyPrecision(attackerCard) {
    if (!this.hasKeyword(attackerCard, 'Precision')) return false;
    this.log(attackerCard.name + ' Precision! Ignores Stealth and Cover.');
    return true; // handled in targeting UI — removes stealth/cover targeting restriction
  }

  // REPLICATE (Memetic) — On play, create a token copy of the cheapest Colorless creature you control
  applyReplicate(player, card) {
    if (!this.hasKeyword(card, 'Replicate')) return false;
    var colorless = player.field.battle.filter(function(c) {
      return c && !c.character && !c.id.startsWith('mem_') && !c.id.startsWith('token_');
    });
    colorless.sort(function(a, b) {
      var costA = a.cost || a.power || 0;
      var costB = b.cost || b.power || 0;
      return costA - costB;
    });
    var tokenSlot = this.findEmptySlot(player, 'Creature');
    if (!tokenSlot) return false;
    var token;
    if (colorless.length > 0 && colorless[0]) {
      var src = colorless[0];
      token = {
        id: 'replicate_' + Date.now(), name: src.name + ' (Copy)', type: 'Creature',
        team: src.team, rarity: 'common', cost: 0,
        attack: src.attack || 0, defense: src.defense || 0, power: 0, production: 0,
        speed: src.speed || 3, health: src.health || 1, range: src.range || 1,
        currentHp: src.health || 1, currentAtk: src.attack || 0, currentDef: src.defense || 0,
        icon: src.icon || '🦠', ability: src.ability || '',
        instanceId: Date.now() + Math.random(),
        justPlayed: true, canAttack: false, attacksLeft: 0, attacksPerTurn: 1, turnsOnField: 0
      };
    } else {
      token = {
        id: 'meme_fragment_' + Date.now(), name: 'Meme Fragment', type: 'Creature',
        team: 'Chaos', rarity: 'common', cost: 0,
        attack: 1, defense: 1, power: 0, production: 0,
        speed: 3, health: 1, range: 1,
        currentHp: 1, currentAtk: 1, currentDef: 1,
        icon: '🦠', ability: '',
        instanceId: Date.now() + Math.random(),
        justPlayed: true, canAttack: false, attacksLeft: 0, attacksPerTurn: 1, turnsOnField: 0
      };
    }
    player.field.battle[tokenSlot.index] = token;
    this.log(card.name + ' Replicates! Creates ' + token.name + '!');
    this.emit('playCard', { player: player, card: token, slot: tokenSlot });
    return true;
  }

  // INFECT (Memetic) — Attached creature loses 1 ATK per turn; spreads on death
  applyInfect(attackerCard, targetCard) {
    if (!this.hasKeyword(attackerCard, 'Infect')) return false;
    if (!targetCard) return false;
    targetCard._infected = (targetCard._infected || 0) + 1;
    targetCard.currentAtk = Math.max(0, (targetCard.currentAtk || targetCard.attack || 0) - 1);
    this.log(targetCard.name + ' Infected! -1 ATK!');
    this.emit('poisonApplied', { target: targetCard, stacks: targetCard._infected });
    return true;
  }

  _spreadInfectOnDeath(player, deadCard) {
    if (!deadCard._infected) return;
    var adjacents = player.field.battle.filter(function(c) {
      return c && c !== deadCard;
    });
    if (adjacents.length > 0) {
      var target = adjacents[Math.floor(Math.random() * adjacents.length)];
      target._infected = (target._infected || 0) + 1;
      target.currentAtk = Math.max(0, (target.currentAtk || target.attack || 0) - 1);
      this.log('Infect spreads to ' + target.name + '!');
    }
  }

  // TRANSMUTE (Refinist) — Sacrifice a friendly Colorless creature: gain its stats, reduce Power cost
  applyTransmute(player, card, sacrificeTarget) {
    if (!this.hasKeyword(card, 'Transmute')) return false;
    if (!sacrificeTarget) return false;
    var stats = {
      atk: sacrificeTarget.currentAtk !== undefined ? sacrificeTarget.currentAtk : (sacrificeTarget.attack || 0),
      def: sacrificeTarget.currentDef !== undefined ? sacrificeTarget.currentDef : (sacrificeTarget.defense || 0),
      hp: sacrificeTarget.currentHp !== undefined ? sacrificeTarget.currentHp : (sacrificeTarget.health || 0)
    };
    var sacCost = sacrificeTarget.cost || sacrificeTarget.power || 0;
    card.currentAtk = (card.currentAtk || card.attack || 0) + stats.atk;
    card.currentDef = (card.currentDef || card.defense || 0) + stats.def;
    card.currentHp = (card.currentHp || card.health || 0) + stats.hp;
    card.health = (card.health || 0) + stats.hp;
    // Reduce this card's Power cost by the sacrifice's Cost (min 1)
    card._transmutePowerReduction = (card._transmutePowerReduction || 0) + sacCost;
    this.destroyCard(player, sacrificeTarget);
    this.log(card.name + ' Transmutes! Gains ' + stats.atk + '/' + stats.def + '/' + stats.hp + ' from ' + sacrificeTarget.name + '!');
    this.emit('abilityTrigger', { player: player, card: card, type: 'transmute' });
    return true;
  }

  // SACRAMENT (Technopriest) — Sacrifice friendly creature for +2/+2 and immediate trigger
  applySacrament(player, card, sacrificeTarget) {
    if (!this.hasKeyword(card, 'Sacrament')) return false;
    if (!sacrificeTarget) return false;
    card.currentAtk = (card.currentAtk || card.attack || 0) + 2;
    card.currentDef = (card.currentDef || card.defense || 0) + 2;
    card.currentHp = (card.currentHp || card.health || 0) + 2;
    card.health = (card.health || 0) + 2;
    this.destroyCard(player, sacrificeTarget);
    this.log(card.name + ' Sacrament! +2/+2 from sacrifice of ' + sacrificeTarget.name + '!');
    this.emit('abilityTrigger', { player: player, card: card, type: 'sacrament' });
    return true;
  }

  // DEVOTION (Technopriest) — +1/+1 per Technopriest card in graveyard
  applyDevotion(player, card) {
    if (!this.hasKeyword(card, 'Devotion')) return false;
    var gyCount = (player.field.graveyard || []).filter(function(c) {
      return c && (c.character === 'Technopriest' || (c.id && c.id.startsWith('tec_')));
    }).length;
    if (gyCount > 0) {
      card.currentAtk = (card.currentAtk || card.attack || 0) + gyCount;
      card.currentDef = (card.currentDef || card.defense || 0) + gyCount;
      this.log(card.name + ' Devotion! +' + gyCount + '/+' + gyCount + ' from graveyard!');
    }
    return true;
  }

  // OVERCLOCK (Cyborg) — May attack a second time; takes 1 self-damage after each extra attack
  applyOverclock(attackerCard) {
    if (!this.hasKeyword(attackerCard, 'Overclock')) return false;
    if (attackerCard.attacksPerTurn >= 2) {
      attackerCard.attacksPerTurn = Math.min(3, attackerCard.attacksPerTurn + 1);
      attackerCard.attacksLeft = (attackerCard.attacksLeft || 0) + 1;
      // Self-damage after extra attack (applied after attack resolves via check)
      attackerCard._overclockExtraAttack = true;
      this.log(attackerCard.name + ' Overclock! +1 attack!');
      return true;
    }
    attackerCard.attacksPerTurn = 2;
    attackerCard.attacksLeft = attackerCard.canAttack ? 2 : 0;
    this.log(attackerCard.name + ' Overclock! Can attack twice!');
    return true;
  }

  _applyOverclockSelfDamage(attackerCard) {
    if (!attackerCard._overclockExtraAttack) return;
    attackerCard._overclockExtraAttack = false;
    attackerCard.currentHp = Math.max(0, (attackerCard.currentHp || attackerCard.health || 1) - 1);
    this.log(attackerCard.name + ' takes 1 Overclock self-damage!');
    if (attackerCard.currentHp <= 0) {
      var owner = this.player.field.battle.indexOf(attackerCard) >= 0 ? this.player : this.enemy;
      this.destroyCard(owner, attackerCard);
    }
  }

  // ADRENALINE (Cyborg) — +1 ATK permanently on direct base damage
  applyAdrenaline(attackerCard, damageDealt) {
    if (!this.hasKeyword(attackerCard, 'Adrenaline')) return false;
    if (damageDealt > 0) {
      attackerCard.currentAtk = (attackerCard.currentAtk || attackerCard.attack || 0) + 1;
      this.log(attackerCard.name + ' Adrenaline! +1 ATK permanently!');
      return true;
    }
    return false;
  }

  // BLOOM (Biopure) — At start of turn, heal base for each Biopure creature
  applyBloom(player) {
    var biopureCount = player.field.battle.filter(function(c) {
      return c && (c.character === 'Biopure' || (c.id && c.id.startsWith('bio_')));
    }).length;
    if (biopureCount > 0) {
      var healAmt = biopureCount;
      player.hp = Math.min(player.maxHp, player.hp + healAmt);
      this.log('Bloom heals base for ' + healAmt + '!');
      this.emit('heal', { target: player, amount: healAmt, type: 'bloom' });
    }
    return biopureCount > 0;
  }

  // SYMBIOSIS (Biopure) — Gains ATK/DEF equal to half adjacent ally's DEF
  applySymbiosis(card, adjacentAlly) {
    if (!this.hasKeyword(card, 'Symbiosis')) return false;
    if (!adjacentAlly || !adjacentAlly.currentDef) return false;
    var bonus = Math.floor(adjacentAlly.currentDef / 2);
    if (bonus > 0) {
      card.currentAtk = (card.currentAtk || card.attack || 0) + bonus;
      card.currentDef = (card.currentDef || card.defense || 0) + bonus;
      this.log(card.name + ' Symbiosis! +' + bonus + '/+' + bonus + ' from ' + adjacentAlly.name + '!');
    }
    return bonus > 0;
  }

  // DRIFT (Ethereal) — Untargetable by enemy creature abilities until it attacks
  applyDrift(card) {
    if (!this.hasKeyword(card, 'Drift')) return false;
    card._driftActive = true;
    return true;
  }

  checkDrift(card) {
    return card._driftActive === true;
  }

  breakDrift(card) {
    if (!card._driftActive) return;
    card._driftActive = false;
    this.log(card.name + ' Drift breaks — targetable again!');
  }

  // MANIFEST (Ethereal) — Play face-down as 0/0 Ward; flip later
  applyManifest(player, card, paidPower) {
    if (!this.hasKeyword(card, 'Manifest')) return false;
    var manifestPower = 1;
    if (paidPower !== undefined && paidPower >= manifestPower) {
      // Played as manifested (face-down)
      card._manifested = true;
      card.currentHp = 1;
      card.currentAtk = 0;
      card.currentDef = 0;
      card._manifestWard = true;
      this.log(card.name + ' Manifested! Face-down Ward token.');
      return true;
    }
    return false;
  }

  flipManifest(player, card) {
    if (!card._manifested) return false;
    var diff = (card.power || 1) - 1; // minus the 1 power already paid
    if (player.power >= diff) {
      player.power -= diff;
      card._manifested = false;
      card.currentAtk = card.attack || 0;
      card.currentDef = card.defense || 0;
      card.currentHp = card.health || 0;
      if (card._manifestWard) {
        card.ability = (card.ability || '') + ' Ward';
        card._manifestWard = false;
      }
      this.log(card.name + ' flips from Manifest!');
      this.emit('abilityTrigger', { player: player, card: card, type: 'manifest' });
      // Trigger on-play effects when flipping
      this.applyOnPlayEffect(player, card, { zone: 'battle', index: player.field.battle.indexOf(card) });
      return true;
    }
    return false;
  }

  // DEPLOY (Organizer) — Create 2 Worker tokens in open adjacent slots
  applyDeploy(player, card, slotIndex) {
    if (!this.hasKeyword(card, 'Deploy')) return false;
    var worker = {
      id: 'worker_' + Date.now(), name: 'Worker Drone', type: 'Creature',
      team: 'Synergy', rarity: 'common', cost: 0,
      attack: 1, defense: 1, power: 0, production: 0,
      speed: 3, health: 1, range: 1, comboId: 'link',
      currentHp: 1, currentAtk: 1, currentDef: 1,
      icon: '🔧', ability: 'Worker token.',
      instanceId: Date.now() + Math.random(),
      justPlayed: true, canAttack: false, attacksLeft: 0, attacksPerTurn: 1, turnsOnField: 0
    };
    var deployed = 0;
    for (var d = 0; d < 2; d++) {
      var slot = this.findEmptySlot(player, 'Creature');
      if (slot) {
        var w = Object.assign({}, worker, { instanceId: Date.now() + Math.random() + d });
        player.field.battle[slot.index] = w;
        deployed++;
        this.emit('playCard', { player: player, card: w, slot: slot });
      }
    }
    this.log(card.name + ' Deploys ' + deployed + ' Worker tokens!');
    return true;
  }

  // NETWORK (Organizer) — +1 Production when playing Organizer or Colorless Structure
  applyNetwork(player, card) {
    if (!this.hasKeyword(card, 'Network')) return false;
    card.production = (card.production || 0) + 1;
    this.log(card.name + ' Network! +1 Production!');
    return true;
  }

  // SNARE (Schemist) — Trap that also Silences + Stuns
  triggerSnare(trap, target) {
    if (!this.hasKeyword(trap, 'Snare')) return false;
    // Apply Silence
    if (target) {
      this.applySilence(target);
      target.frozenTurns = Math.max(target.frozenTurns || 0, 1);
      this.log(trap.name + ' Snare! Silences and stuns ' + target.name + '!');
    }
    // Then apply the trap's base damage
    if (trap.ability.includes('Deal')) {
      var match = trap.ability.match(/Deal (\d+)/);
      var dmg = match ? parseInt(match[1]) : 2;
      if (target) {
        target.currentHp = (target.currentHp !== undefined ? target.currentHp : target.health) - dmg;
        this.log('Snare deals ' + dmg + ' to ' + target.name + '!');
        if (target.currentHp <= 0) {
          var owner = this.player.field.battle.indexOf(target) >= 0 ? this.player : this.enemy;
          this.destroyCard(owner, target);
        }
      }
    }
    return true;
  }

  // GAMBIT (Schemist) — On lethal damage, coin-flip to survive at 1 HP
  checkGambit(card) {
    if (!card || !this.hasKeyword(card, 'Gambit')) return false;
    if (card._gambitUsed) return false;
    var roll = Math.random();
    if (roll < 0.5) {
      card._gambitUsed = true;
      card.currentHp = 1;
      this.log(card.name + ' Gambit! Survives at 1 HP!');
      this.emit('immortalSave', { target: card });
      return true;
    }
    this.log(card.name + ' Gambit fails...');
    return false;
  }

  // Overclock self-damage check — call after attack resolves
  applyOverclockSelfDamage(attackerCard) {
    this._applyOverclockSelfDamage(attackerCard);
  }

  // Adrenaline trigger on base damage
  applyAdrenalineOnBaseDamage(attackerCard, damageDealt) {
    return this.applyAdrenaline(attackerCard, damageDealt);
  }

  // REFINE (Refinist) — Convert unused Mana to permanent Production at end of Bank Phase
  applyRefine(player) {
    var refiner = player.field.base.find(function(s) {
      return s && s.ability && (s.ability.includes('Refine') || s.name === 'Ore Sifter' || s.name === 'The Great Forge');
    });
    if (!refiner) return false;
    // Check if player has any Refinist cards (signature or character)
    var hasRefinist = player.field.battle.some(function(c) {
      return c && (c.character === 'Refinist' || (c.id && c.id.startsWith('ref_')));
    });
    if (!hasRefinist && !refiner) return false;
    var unusedMana = player.mana;
    if (unusedMana > 0) {
      refiner.production = (refiner.production || 0) + 1;
      this.log('Refine! ' + unusedMana + ' unused Mana → +1 Production!');
      return true;
    }
    return false;
  }

  applySilence(target) {
    if (!target) return;
    target.silenced = true;
    target._originalAbility = target.ability;
    target.ability = '(Silenced)';
    this.emit('silenceApplied', { target: target });
  }

  applyPoison(target, stacks) {
    if (!target) return;
    target.poisonStacks = (target.poisonStacks || 0) + (stacks || 1);
    this.emit('poisonApplied', { target: target, stacks: target.poisonStacks });
  }

  addShield(player, amount) {
    if (!player || !amount) return;
    player.shield = Math.min(player.maxShield || 10, (player.shield || 0) + amount);
    this.log(player.name + ' gains ' + amount + ' shield! (' + player.shield + ' total)');
    this.emit('shieldGain', { player: player, amount: amount, total: player.shield });
  }

  addBuffStack(player, type, amount, duration, source) {
    if (!player) return;
    player.buffStacks = player.buffStacks || [];
    player.buffStacks.push({ type: type, amount: amount, duration: duration || 1, source: source || 'unknown' });
    this.emit('buffStack', { player: player, type: type, amount: amount, duration: duration });
  }

  equipGear(player, gearCard, targetCreature) {
    if (!targetCreature || !gearCard) return false;
    var ability = gearCard.ability || '';
    // Parse stat bonuses from ability text
    var atkMatch = ability.match(/\+(\d+) ATK/);
    var defMatch = ability.match(/\+(\d+) DEF/);
    var hpMatch = ability.match(/\+(\d+) HP/);
    if (atkMatch) targetCreature.currentAtk = (targetCreature.currentAtk || targetCreature.attack || 0) + parseInt(atkMatch[1]);
    if (defMatch) targetCreature.currentDef = (targetCreature.currentDef || targetCreature.defense || 0) + parseInt(defMatch[1]);
    if (hpMatch) {
      targetCreature.currentHp = (targetCreature.currentHp || targetCreature.health || 0) + parseInt(hpMatch[1]);
      targetCreature.health = (targetCreature.health || 0) + parseInt(hpMatch[1]);
    }
    // Apply keywords from gear
    if (ability.includes('Pierce')) targetCreature.ability = (targetCreature.ability || '') + ' Pierce';
    if (ability.includes('Ward')) targetCreature.ability = (targetCreature.ability || '') + ' Ward';
    if (ability.includes('Reflect')) targetCreature.ability = (targetCreature.ability || '') + ' Reflect';
    if (ability.includes('Thorns')) targetCreature.ability = (targetCreature.ability || '') + ' Thorns';
    if (ability.includes('Lifesteal')) targetCreature.ability = (targetCreature.ability || '') + ' Lifesteal';
    if (ability.includes('Immortal')) targetCreature.ability = (targetCreature.ability || '') + ' Immortal';
    if (ability.includes('Enrage')) targetCreature.ability = (targetCreature.ability || '') + ' Enrage';
    targetCreature.equipped = (targetCreature.equipped || []);
    targetCreature.equipped.push(gearCard);
    this.log(gearCard.name + ' equipped to ' + targetCreature.name + '!');
    this.emit('gearEquipped', { player: player, gear: gearCard, target: targetCreature });
    return true;
  }

  triggerConspiracy(player, conspiracyCard, triggerType) {
    if (!conspiracyCard || conspiracyCard.revealed) return false;
    var ability = conspiracyCard.ability || '';
    var shouldReveal = false;
    if (triggerType === 'attack' && (ability.includes('enemy attacks'))) shouldReveal = true;
    if (triggerType === 'play' && (ability.includes('enemy plays'))) shouldReveal = true;
    if (triggerType === 'turn_start' && (ability.includes('start of your turn'))) shouldReveal = true;
    if (triggerType === 'attack_base' && (ability.includes('attacks base'))) shouldReveal = true;
    if (!shouldReveal) return false;
    conspiracyCard.revealed = true;
    this.log('CONSPIRACY REVEALED: ' + conspiracyCard.name + '!');
    this.emit('conspiracyReveal', { player: player, card: conspiracyCard });
    // Apply effect based on ability text
    var opponent = player === this.player ? this.enemy : this.player;
    if (ability.includes('Negate the attack')) {
      this.log('Attack negated by ' + conspiracyCard.name + '!');
      this.emit('conspiracyNegate', { player: player });
    }
    if (ability.includes('take control')) {
      var target = opponent.field.battle.find(function(c) { return c; });
      if (target) {
        var slot = this.findEmptySlot(player, 'Creature');
        if (slot) {
          opponent.field.battle[opponent.field.battle.indexOf(target)] = null;
          player.field.battle[slot.index] = target;
          this.log('False Flag! Stole ' + target.name + '!');
        }
      }
    }
    if (ability.includes('redirect')) {
      var strongest = player.field.battle.filter(function(c) { return c; })
        .sort(function(a, b) { return (b.currentDef || b.defense) - (a.currentDef || a.defense); })[0];
      if (strongest) this.log('Smokescreen redirects attack to ' + strongest.name);
    }
    if (ability.includes('Look at enemy hand')) {
      this.emit('reveal', { player: player, revealed: opponent.hand });
    }
    // Move to graveyard after triggering
    var idx = player.field.trap.indexOf(conspiracyCard);
    if (idx >= 0) { player.field.trap[idx] = null; }
    player.field.graveyard.push(conspiracyCard);
    return true;
  }

  // ===== KEYWORD DAMAGE MODIFIERS (called from attack method) =====

  applyKeywordDamageModifiers(attackerCard, targetCard, damage, attackerPlayer, targetPlayer) {
    var result = { damage: damage, prevented: false, reflected: 0, lifesteal: 0, thorns: 0, overkill: 0 };

    // WARD: absorb all damage, consume ward
    if (targetCard && this.hasKeyword(targetCard, 'Ward')) {
      targetCard.ability = targetCard.ability.replace(/Ward/g, '').trim();
      if (targetCard._wardActive) targetCard._wardActive = false;
      result.damage = 0;
      result.prevented = true;
      this.log(targetCard.name + ' Ward absorbs all damage!');
      this.emit('wardAbsorb', { target: targetCard });
      return result;
    }

    // SHIELD: reduce damage by 50%
    if (targetCard && this.hasKeyword(targetCard, 'Shield')) {
      result.damage = Math.max(1, Math.floor(damage / 2));
      targetCard.ability = targetCard.ability.replace(/Shield/g, '').trim();
      this.log(targetCard.name + ' Shield halves damage to ' + result.damage + '!');
    }

    // PIERCE: ignore DEF entirely
    if (this.hasKeyword(attackerCard, 'Pierce')) {
      var atkVal = attackerCard.currentAtk !== undefined ? attackerCard.currentAtk : (attackerCard.attack || 0);
      result.damage = atkVal;
      this.log(attackerCard.name + ' Pierce! Ignores DEF!');
    }

    // REFLECT: return 50% damage to attacker
    if (targetCard && this.hasKeyword(targetCard, 'Reflect') && result.damage > 0) {
      result.reflected = Math.floor(result.damage * 0.5);
      this.log(targetCard.name + ' Reflects ' + result.reflected + ' back!');
    }

    // THORNS: deal 1 counter damage to attacker
    if (targetCard && this.hasKeyword(targetCard, 'Thorns')) {
      result.thorns = 1;
      this.log(targetCard.name + ' Thorns! 1 counter damage!');
    }

    // LIFESTEAL: heal attacker's base for damage dealt
    if (this.hasKeyword(attackerCard, 'Lifesteal') && result.damage > 0) {
      result.lifesteal = result.damage;
      attackerPlayer.hp = Math.min(attackerPlayer.maxHp, attackerPlayer.hp + result.lifesteal);
      this.log(attackerCard.name + ' Lifesteal! Heals ' + attackerPlayer.name + ' for ' + result.lifesteal);
    }

    // IMMORTAL: survive at 1 HP
    if (targetCard && this.hasKeyword(targetCard, 'Immortal') && targetCard.currentHp !== undefined) {
      if (targetCard.currentHp - result.damage <= 0) {
        targetCard.currentHp = 1;
        targetCard.ability = targetCard.ability.replace(/Immortal/g, '').trim();
        result.damage = 0;
        this.log(targetCard.name + ' Immortal! Survives at 1 HP!');
        this.emit('immortalSave', { target: targetCard });
      }
    }

    // OVERKILL: excess damage spills to base
    if (targetCard && targetCard.currentHp !== undefined) {
      var wouldKill = targetCard.currentHp - result.damage;
      if (wouldKill < 0) {
        result.overkill = Math.abs(wouldKill);
        this.log('OVERKILL! ' + result.overkill + ' spills to ' + targetPlayer.name + ' base!');
      }
    }

    // ENRAGE: +2 ATK if below 50% HP
    if (this.hasKeyword(attackerCard, 'Enrage') && attackerCard.currentHp !== undefined) {
      if (attackerCard.currentHp < (attackerCard.health / 2)) {
        result.damage += 2;
        this.log(attackerCard.name + ' Enrage! +2 ATK!');
      }
    }

    return result;
  }

  // First Strike check: faster creature attacks first, no counter
  hasFirstStrike(attackerCard, targetCard) {
    var atkSpeed = attackerCard.speed || 0;
    var defSpeed = (targetCard && targetCard.speed) ? targetCard.speed : 0;
    return atkSpeed > defSpeed;
  }

  // Check 5 unique team combo win
  checkComboWin(player) {
    var teams = {};
    player.field.battle.forEach(function(c) {
      if (c && c.team) teams[c.team] = true;
    });
    player.field.base.forEach(function(s) {
      if (s && s.team) teams[s.team] = true;
    });
    var uniqueCount = Object.keys(teams).length;
    if (uniqueCount >= 5) {
      this.endGame(player, 'combo');
      return true;
    }
    return false;
  }
}

if (typeof module !== 'undefined') {
  module.exports = { GameEngine };
}
