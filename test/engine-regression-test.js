#!/usr/bin/env node
/*
 * test/engine-regression-test.js — headless engine checks for bugs found by
 * mouse play-testing (no browser). Loads js/*.js into a vm sandbox.
 *
 *  1. Attacking a card in the defender's BASE row resolves the right owner
 *     (overkill used to spill onto the attacker's own base).
 *  2. Combo bonuses do not re-stack every time another card is played.
 *  3. Action cards are one-shot: they go to the graveyard, never sit in a slot,
 *     and never overwrite an occupied slot.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = { console: { log() {}, warn() {}, error() {} }, Math, Date, JSON, setTimeout: () => 0, clearTimeout() {},
  setInterval: () => 0, clearInterval() {}, window: {}, localStorage: { getItem() { return null; }, setItem() {} } };
ctx.window = ctx; ctx.document = { getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; },
  addEventListener() {}, createElement() { return { style: {}, classList: { add() {}, remove() {} }, appendChild() {} }; }, body: { appendChild() {} } };
vm.createContext(ctx);
const load = (f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
['js/version.js', 'js/factions.js', 'js/roles.js', 'js/cards.js', 'js/characters.js', 'js/game.js'].forEach(load);
vm.runInContext('this.__G = GameEngine; this.__C = ALL_CARDS;', ctx);
const GameEngine = ctx.__G, ALL = ctx.__C;

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  — ' + detail : '')); }
}
const card = (id) => Object.assign({}, ALL.find((c) => c.id === id));
function freshGame() {
  const g = new GameEngine();
  const deck = ALL.filter((c) => c.type === 'Creature').slice(0, 40);
  if (typeof g.startBattle === 'function') g.startBattle(deck.slice(), deck.slice());
  else if (typeof g.init === 'function') g.init(deck.slice(), deck.slice());
  g.state = 'battle';
  g.phase = 'main';
  [g.player, g.enemy].forEach((p) => {
    p.field.battle = [null, null, null, null, null];
    p.field.base = [null, null, null, null, null];
    p.hand = []; p.hp = 30; p.maxHp = Math.max(p.maxHp || 30, 30);
    p.power = 50; p.maxPower = 50;
  });
  return g;
}

console.log('engine regression');

// 1. base-row ownership
{
  const g = freshGame();
  g.currentPlayer = g.enemy;
  const gear = Object.assign(card(ALL.find((c) => c.type === 'Gear').id), { instanceId: 'gear1', currentHp: 1, currentAtk: 0, currentDef: 0, health: 1 });
  g.player.field.base[0] = gear;
  const big = Object.assign(card(ALL.find((c) => c.type === 'Creature' && c.attack >= 6).id),
    { instanceId: 'big1', currentAtk: 12, currentDef: 1, currentHp: 5, canAttack: true, justPlayed: false, attacksLeft: 1, ability: '' });
  g.enemy.field.battle[0] = big;
  const enemyHp = g.enemy.hp;
  g.attack(g.enemy, big, gear);
  check('attack on a base-row card never damages the attacker\'s own base', g.enemy.hp === enemyHp, 'enemy hp ' + enemyHp + ' -> ' + g.enemy.hp);
  check('the attacked base-row card is removed from its owner\'s base', g.player.field.base[0] !== gear);
}

// 2. combos do not re-stack
{
  const g = freshGame();
  g.currentPlayer = g.player;
  const rush = ALL.filter((c) => c.comboId === 'rush' && c.type === 'Creature').slice(0, 2);
  const filler = ALL.filter((c) => c.type === 'Creature' && c.comboId !== 'rush' && !c.character).slice(0, 2);
  if (rush.length < 2) { check('two rush cards exist', false); }
  else {
    rush.forEach((c, i) => { const inst = Object.assign(card(c.id), { instanceId: 'r' + i }); g.player.hand.push(inst); g.playCard(g.player, inst, { zone: 'battle', index: i }); });
    const atkAfterCombo = g.player.field.battle[0].currentAtk;
    filler.forEach((c, i) => { const inst = Object.assign(card(c.id), { instanceId: 'f' + i }); g.player.hand.push(inst); g.playCard(g.player, inst, { zone: 'battle', index: 2 + i }); });
    const atkLater = g.player.field.battle[0].currentAtk;
    check('Twin Strike bonus applies once (no +2 per later card)', atkLater === atkAfterCombo, atkAfterCombo + ' -> ' + atkLater);
  }
}

// 3. actions are one-shot and never overwrite
{
  const g = freshGame();
  g.currentPlayer = g.player;
  const act = ALL.find((c) => c.type === 'Action');
  const cr = Object.assign(card(ALL.find((c) => c.type === 'Creature').id), { instanceId: 'cr' });
  g.player.hand.push(cr); g.playCard(g.player, cr, { zone: 'battle', index: 0 });
  const a1 = Object.assign(card(act.id), { instanceId: 'a1' });
  g.player.hand.push(a1); g.playCard(g.player, a1, { zone: 'battle', index: 1 });
  check('Action card does not remain in a battle slot', g.player.field.battle[1] === null || g.player.field.battle[1] === undefined);
  check('Action card goes to the graveyard', g.player.field.graveyard.some((c) => c.instanceId === 'a1'));
  const a2 = Object.assign(card(act.id), { instanceId: 'a2' });
  g.player.hand.push(a2); g.playCard(g.player, a2, { zone: 'battle', index: 0 });
  check('Action dropped on an occupied slot does not overwrite the creature', g.player.field.battle[0] && g.player.field.battle[0].instanceId === 'cr');
}

// 4. stale target: a card that already left play cannot be attacked, and never
//    spills "overkill" onto anyone's base
{
  const g = freshGame();
  g.currentPlayer = g.enemy;
  const ghost = Object.assign(card(ALL.find((c) => c.type === 'Creature').id), { instanceId: 'ghost', currentHp: -9, currentAtk: 1, currentDef: 3 });
  const att = Object.assign(card(ALL.find((c) => c.type === 'Creature').id),
    { instanceId: 'att', currentAtk: 1, currentDef: 1, currentHp: 3, canAttack: true, justPlayed: false, attacksLeft: 1, ability: '' });
  g.enemy.field.battle[0] = att;
  const hp = [g.player.hp, g.enemy.hp];
  g.attack(g.enemy, att, ghost);   // ghost is on nobody's field
  check('attacking a stale (destroyed) card changes no base HP', g.player.hp === hp[0] && g.enemy.hp === hp[1],
    'player ' + hp[0] + '->' + g.player.hp + ', enemy ' + hp[1] + '->' + g.enemy.hp);
  check('the cancelled attack is refunded', att.attacksLeft === 1);
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
