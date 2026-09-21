// Synthopwars headless battle test harness
// Usage: node test/battle-test.js [scenario]
const puppeteer = require('puppeteer-core');

const CHROME = '/home/jetsetvideo/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome';
const URL = 'http://127.0.0.1:8931/index.html';

async function launch() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--window-size=1600,900', '--mute-audio']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900 });
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      errors.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => errors.push('[pageerror] ' + err.message));
  return { browser, page, errors };
}

async function startBattle(page) {
  // Boot into a battle programmatically, bypassing menus
  await page.evaluate(() => {
    if (ui.deck.length < 40) ui.loadPresetByArchetype(Object.keys(ui.PRESET_ARCHETYPES)[0]);
    ui.selectedOpponent = 'balanced';
    ui.selectedBattleground = null;
    ui.launchBattle();
  });
  await new Promise(r => setTimeout(r, 800));
}

async function getState(page) {
  return page.evaluate(() => {
    const g = ui.game;
    if (!g) return null;
    return {
      state: g.state, phase: g.phase, turn: g.turnCount,
      currentPlayer: g.currentPlayer === g.player ? 'player' : 'enemy',
      player: { hp: g.player.hp, mana: g.player.mana, power: g.player.power,
        hand: g.player.hand.map(c => ({ name: c.name, type: c.type, power: c.power, cost: c.cost })),
        battle: g.player.field.battle.filter(Boolean).map(c => ({ name: c.name, hp: c.currentHp, atk: c.currentAtk, canAttack: c.canAttack, justPlayed: c.justPlayed })),
        base: g.player.field.base.filter(Boolean).map(c => c.name) },
      enemy: { hp: g.enemy.hp, mana: g.enemy.mana, power: g.enemy.power,
        handCount: g.enemy.hand.length,
        battle: g.enemy.field.battle.filter(Boolean).map(c => ({ name: c.name, hp: c.currentHp, atk: c.currentAtk })),
        base: g.enemy.field.base.filter(Boolean).map(c => c.name) },
      market: (g.currentMarket || []).map(c => ({ name: c.name, cost: c.cost !== undefined ? c.cost : c.power })),
      bankVisible: document.getElementById('bank-zone') && getComputedStyle(document.getElementById('bank-zone')).display !== 'none',
      log: g.battleLog.slice(-6).map(l => l.message)
    };
  });
}

async function waitPlayerMain(page, timeoutMs = 30000) {
  // Wait until it's the player's main phase
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const s = await getState(page);
    if (!s || s.state !== 'battle') return s;
    if (s.currentPlayer === 'player' && s.phase === 'main') return s;
    await new Promise(r => setTimeout(r, 300));
  }
  return await getState(page);
}

(async () => {
  const scenario = process.argv[2] || 'smoke';
  const { browser, page, errors } = await launch();
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  console.log('=== SCENARIO:', scenario, '===');
  await startBattle(page);
  let s = await getState(page);
  console.log('After launch:', JSON.stringify(s, null, 1));

  if (scenario === 'full') {
    // Player bank: buy first affordable card, end bank, play first creature, end turn, loop 6 player turns
    for (let t = 0; t < 6; t++) {
      s = await getState(page);
      if (!s || s.state !== 'battle') { console.log('Game ended. state=', s && s.state); break; }
      if (s.currentPlayer === 'player') {
        if (s.phase === 'bank') {
          // buy first affordable
          const bought = await page.evaluate(() => {
            const g = ui.game; const m = g.currentMarket || [];
            const c = m.find(c => (c.cost !== undefined ? c.cost : c.power) <= g.player.mana);
            if (c) return g.buyCard(g.player, c.id);
            return false;
          });
          console.log(`T${t} bank: bought=${bought} hand=${s.player.hand.length}`);
          await page.evaluate(() => ui.endBankPhase());
          await new Promise(r => setTimeout(r, 700));
        }
        if (s.phase === 'main') {
          // play first affordable creature
          const played = await page.evaluate(() => {
            const g = ui.game;
            const c = g.player.hand.find(c => c.type === 'Creature' && g.getEffectiveCost(g.player, c) <= g.player.power);
            if (!c) return null;
            const slot = g.findEmptySlot(g.player, c.type);
            return g.playCard(g.player, c, slot) ? c.name : false;
          });
          console.log(`T${t} main: played=${played}`);
          // attack with first ready creature
          const atk = await page.evaluate(() => {
            const g = ui.game;
            const a = g.player.field.battle.find(c => c && (!c.justPlayed || c.canAttack));
            if (!a) return null;
            g.attack(g.player, a, g.enemy);
            return a.name;
          });
          console.log(`T${t} attack: ${atk}`);
          await page.evaluate(() => ui.endTurn());
          await new Promise(r => setTimeout(r, 2500)); // AI runs
        }
      } else {
        await new Promise(r => setTimeout(r, 1500));
      }
      s = await getState(page);
      console.log(`T${t} end:`, JSON.stringify({ phase: s.phase, who: s.currentPlayer, pHp: s.player.hp, eHp: s.enemy.hp, pBattle: s.player.battle, eBattle: s.enemy.battle, eBase: s.enemy.base, log: s.log }));
    }
  }

  console.log('\n=== CONSOLE ERRORS (' + errors.length + ') ===');
  errors.slice(0, 20).forEach(e => console.log(e));
  await browser.close();
})().catch(e => { console.error('HARNESS FAIL:', e); process.exit(1); });
