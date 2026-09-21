/**
 * Synthopwars Achievements & Progression System
 */

class AchievementSystem {
  constructor() {
    this.achievements = this.loadAchievements();
    this.stats = this.loadStats();
  }

  loadAchievements() {
    const defaultAchievements = [
      { id: 'first_win', name: 'First Blood', desc: 'Win your first battle', unlocked: false, reward: 100 },
      { id: 'win_10', name: 'Veteran', desc: 'Win 10 battles', unlocked: false, reward: 500 },
      { id: 'win_100', name: 'Warlord', desc: 'Win 100 battles', unlocked: false, reward: 5000 },
      { id: 'perfect_win', name: 'Flawless', desc: 'Win with full HP remaining', unlocked: false, reward: 200 },
      { id: 'combo_master', name: 'Combo Master', desc: 'Activate a 5-card combo', unlocked: false, reward: 300 },
      { id: 'collector', name: 'Collector', desc: 'Own at least one of every card type', unlocked: false, reward: 1000 },
      { id: 'mythic_finder', name: 'Mythic Hunter', desc: 'Draw a Mythic card in battle', unlocked: false, reward: 2000 },
      { id: 'deck_builder', name: 'Architect', desc: 'Build 10 different decks', unlocked: false, reward: 500 },
      { id: 'trapper', name: 'Trapper', desc: 'Win using only Trap damage', unlocked: false, reward: 400 },
      { id: 'economist', name: 'Economist', desc: 'End a turn with 12 Power', unlocked: false, reward: 250 },
      { id: 'speed_demon', name: 'Speed Demon', desc: 'Win in under 5 turns', unlocked: false, reward: 350 },
      { id: 'fortress', name: 'Unbreakable', desc: 'Have 5 Structures on the field at once', unlocked: false, reward: 300 },
      { id: 'legendary', name: 'Legendary', desc: 'Play a Legendary card', unlocked: false, reward: 500 },
      { id: 'friend_battle', name: 'Social Warrior', desc: 'Battle against a friend', unlocked: false, reward: 200 },
      { id: 'all_battlegrounds', name: 'World Traveler', desc: 'Battle on all 6 Neo-Cities', unlocked: false, reward: 1000 },
      { id: 'fatigue_win', name: 'Endurance', desc: 'Win by exhausting opponent deck', unlocked: false, reward: 400 },
      { id: 'comeback', name: 'Comeback Kid', desc: 'Win with 5 HP or less', unlocked: false, reward: 350 },
      { id: 'spell_caster', name: 'Spell Caster', desc: 'Cast 10 spells in one battle', unlocked: false, reward: 300 },
      { id: 'titan_slayer', name: 'Titan Slayer', desc: 'Destroy a Mythic creature', unlocked: false, reward: 1000 },
      { id: 'pacifist', name: 'Pacifist', desc: 'Win without attacking with creatures', unlocked: false, reward: 500 }
    ];
    
    try {
      const saved = JSON.parse(localStorage.getItem('synthopwars_achievements'));
      if (saved) {
        return defaultAchievements.map(a => {
          const s = saved.find(x => x.id === a.id);
          return s ? { ...a, ...s } : a;
        });
      }
    } catch (e) {}
    return defaultAchievements;
  }

  loadStats() {
    try {
      return JSON.parse(localStorage.getItem('synthopwars_stats')) || {
        wins: 0, losses: 0, draws: 0,
        totalDamage: 0, totalHealing: 0,
        cardsPlayed: 0, combosActivated: 0,
        spellsCast: 0, trapsTriggered: 0,
        creaturesSummoned: 0, structuresBuilt: 0,
        battlesOn: {}, longestBattle: 0, shortestBattle: 999,
        favoriteDeck: '', highestHp: 0, lowestHpWin: 999
      };
    } catch (e) {
      return { wins: 0, losses: 0, draws: 0, totalDamage: 0, totalHealing: 0, cardsPlayed: 0, combosActivated: 0, spellsCast: 0, trapsTriggered: 0, creaturesSummoned: 0, structuresBuilt: 0, battlesOn: {}, longestBattle: 0, shortestBattle: 999, favoriteDeck: '', highestHp: 0, lowestHpWin: 999 };
    }
  }

  save() {
    localStorage.setItem('synthopwars_achievements', JSON.stringify(this.achievements));
    localStorage.setItem('synthopwars_stats', JSON.stringify(this.stats));
  }

  check(id, condition) {
    const achievement = this.achievements.find(a => a.id === id);
    if (achievement && !achievement.unlocked && condition) {
      achievement.unlocked = true;
      this.save();
      return achievement;
    }
    return null;
  }

  onBattleEnd(won, battleData) {
    this.stats.wins += won ? 1 : 0;
    this.stats.losses += won ? 0 : 1;
    this.stats.cardsPlayed += battleData.cardsPlayed || 0;
    this.stats.totalDamage += battleData.damage || 0;
    this.stats.totalHealing += battleData.healing || 0;
    this.stats.combosActivated += battleData.combos || 0;
    this.stats.spellsCast += battleData.spells || 0;
    this.stats.trapsTriggered += battleData.traps || 0;
    this.stats.creaturesSummoned += battleData.creatures || 0;
    this.stats.structuresBuilt += battleData.structures || 0;
    
    if (battleData.battleground) {
      this.stats.battlesOn[battleData.battleground] = (this.stats.battlesOn[battleData.battleground] || 0) + 1;
    }
    
    this.stats.longestBattle = Math.max(this.stats.longestBattle, battleData.turns || 0);
    this.stats.shortestBattle = won ? Math.min(this.stats.shortestBattle, battleData.turns || 999) : this.stats.shortestBattle;
    
    if (won) {
      this.stats.lowestHpWin = Math.min(this.stats.lowestHpWin, battleData.playerHp || 999);
    }
    this.stats.highestHp = Math.max(this.stats.highestHp, battleData.playerHp || 0);
    
    this.save();
    
    // Check achievements
    const unlocked = [];
    if (this.check('first_win', this.stats.wins >= 1)) unlocked.push(this.achievements.find(a => a.id === 'first_win'));
    if (this.check('win_10', this.stats.wins >= 10)) unlocked.push(this.achievements.find(a => a.id === 'win_10'));
    if (this.check('win_100', this.stats.wins >= 100)) unlocked.push(this.achievements.find(a => a.id === 'win_100'));
    if (this.check('perfect_win', won && battleData.playerHp === battleData.maxHp)) unlocked.push(this.achievements.find(a => a.id === 'perfect_win'));
    if (this.check('speed_demon', won && battleData.turns <= 5)) unlocked.push(this.achievements.find(a => a.id === 'speed_demon'));
    if (this.check('comeback', won && battleData.playerHp <= 5)) unlocked.push(this.achievements.find(a => a.id === 'comeback'));
    if (this.check('fatigue_win', won && battleData.fatigue)) unlocked.push(this.achievements.find(a => a.id === 'fatigue_win'));
    if (this.check('spell_caster', battleData.spells >= 10)) unlocked.push(this.achievements.find(a => a.id === 'spell_caster'));
    if (this.check('all_battlegrounds', Object.keys(this.stats.battlesOn).length >= 6)) unlocked.push(this.achievements.find(a => a.id === 'all_battlegrounds'));
    
    return unlocked;
  }

  getProgress() {
    const unlocked = this.achievements.filter(a => a.unlocked).length;
    const total = this.achievements.length;
    return {
      unlocked,
      total,
      percent: Math.round((unlocked / total) * 100),
      next: this.achievements.find(a => !a.unlocked)
    };
  }
}

const achievements = new AchievementSystem();

if (typeof module !== 'undefined') {
  module.exports = { AchievementSystem, achievements };
}
