#!/usr/bin/env node
/*
 * tools/qa/engine-soak.js — plays N full games headless (engine only, node vm):
 * the player side uses a simple greedy policy through the same 5 public actions
 * the UI uses; the enemy side is the built-in AI. Reports crashes (with stack),
 * games that never finish, and win/loss counts.
 *   node tools/qa/engine-soak.js [games=50]
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '../..');
const N = parseInt(process.argv[2] || '50', 10);

function makeCtx() {
  const timers = [];
  const ctx = { console: { log() {}, warn() {}, error() {} }, Math, Date, JSON,
    setTimeout: (fn, ms) => { timers.push(fn); return timers.length; }, clearTimeout() {},
    setInterval: () => 0, clearInterval() {}, localStorage: { getItem() { return null; }, setItem() {} } };
  ctx.window = ctx;
  ctx.document = { getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
    addEventListener() {}, createElement() { return { style: {}, classList: { add() {}, remove() {} }, appendChild() {} }; }, body: { appendChild() {} } };
  vm.createContext(ctx);
  ['js/version.js', 'js/factions.js', 'js/roles.js', 'js/cards.js', 'js/characters.js', 'js/game.js'].forEach((f) =>
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
  vm.runInContext('this.__G = GameEngine; this.__C = ALL_CARDS; this.__CH = (typeof CHARACTER_LIST!=="undefined")?CHARACTER_LIST:[];', ctx);
  ctx.__timers = timers;
  return ctx;
}

function flush(ctx, budget) {
  // run queued AI timeouts (the engine schedules AI steps with setTimeout)
  let n = 0;
  while (ctx.__timers.length && n < budget) { const fn = ctx.__timers.shift(); n++; fn(); }
  return n;
}

const out = { games: 0, playerWins: 0, enemyWins: 0, draws: 0, unfinished: 0, crashes: [] , turns: [] };
for (let gi = 0; gi < N; gi++) {
  const ctx = makeCtx();
  const G = ctx.__G, ALL = ctx.__C;
  let g, turnGuard = 0, phase = 'init';
  try {
    g = new G();
    const pick = () => { const d = ALL.filter((c) => !c.character).sort(() => Math.random() - 0.5).slice(0, 40); return d; };
    const styles = ['aggro', 'control', 'tank', 'balanced'];
    phase = 'start';
    if (typeof g.startBattle === 'function') g.startBattle(pick(), pick(), styles[gi % 4]);
    else g.init(pick(), pick());
    flush(ctx, 5000);
    while (g.state === 'battle' && turnGuard < 400) {
      turnGuard++;
      flush(ctx, 5000);
      if (g.state !== 'battle') break;
      if (g.currentPlayer !== g.player) { phase = 'enemy-stall'; flush(ctx, 5000); if (g.currentPlayer !== g.player) break; continue; }
      const p = g.player;
      if (g.phase === 'bank') {
        phase = 'bank';
        for (let k = 0; k < 6; k++) {
          const m = (g.currentMarket || []).filter(Boolean)
            .filter((c) => (c.cost || 0) <= (p.mana !== undefined ? p.mana : 0)).sort((a, b) => b.cost - a.cost)[0];
          if (!m) break;
          const before = p.hand.length; g.buyCard(p, m._metaId || m.id); if (p.hand.length === before) break;
        }
        g.endBankPhase(p); flush(ctx, 5000);
      }
      if (g.state !== 'battle' || g.currentPlayer !== p) continue;
      if (g.phase === 'main') {
        phase = 'main';
        for (let k = 0; k < 10; k++) {
          const c = p.hand.filter((h) => g.getEffectiveCost(p, h) <= p.power).sort((a, b) => b.cost - a.cost)[0];
          if (!c) break;
          const slot = g.findEmptySlot(p, c.type) || ((c.type === 'Spell' || c.type === 'Action') ? { zone: 'battle', index: 0 } : null);
          if (!slot) break;
          if (!g.playCard(p, c, slot)) break;
          if (g.state !== 'battle') break;
        }
        phase = 'attack';
        p.field.battle.filter(Boolean).forEach((a) => {
          if (g.state !== 'battle' || !a.canAttack || a.justPlayed || (a.attacksLeft !== undefined && a.attacksLeft <= 0)) return;
          const taunt = g.enemy.field.battle.find((e) => e && /Taunt/.test(e.ability || ''));
          g.attack(p, a, taunt || g.enemy);
        });
        if (g.state === 'battle') { phase = 'endTurn'; g.endTurn(p); flush(ctx, 5000); }
      }
    }
    out.games++;
    if (g.state === 'battle') out.unfinished++;
    else {
      const ev = (g.matchEvents || g.events || []).filter((e) => e && e.type === 'gameEnd').pop();
      const lastWin = (g.battleLog || []).map((l) => l.message || '').filter((m) => /WINS!|DRAW!/.test(m)).pop() || '';
      const who = ev && ev.data ? ev.data.winner : (/^=== Commander WINS/.test(lastWin) ? 'player' : (/WINS/.test(lastWin) ? 'enemy' : 'draw'));
      if (who === 'player') out.playerWins++; else if (who === 'enemy') out.enemyWins++; else out.draws++;
      const k = (g.winCondition || '?') + ':' + who; out.how = out.how || {}; out.how[k] = (out.how[k] || 0) + 1;
    }
    out.turns.push(g.player.turn);
  } catch (e) {
    out.games++;
    out.crashes.push({ game: gi, phase, turn: g && g.player && g.player.turn, msg: e.message, stack: (e.stack || '').split('\n').slice(0, 8).join(' | ') });
  }
}
const t = out.turns.slice().sort((a, b) => a - b);
console.log(JSON.stringify({ games: out.games, playerWins: out.playerWins, enemyWins: out.enemyWins, draws: out.draws,
  unfinished: out.unfinished, how: out.how, medianTurns: t[Math.floor(t.length / 2)], crashes: out.crashes.length, crashSamples: out.crashes.slice(0, 5) }, null, 1));
process.exit(out.crashes.length ? 1 : 0);
