/**
 * Synthopwars Daily Quest System
 * Rotating daily missions with rewards
 */

class QuestSystem {
  constructor() {
    this.quests = this.loadQuests();
    this.lastReset = this.loadLastReset();
    this.checkReset();
  }

  loadQuests() {
    const defaultQuests = [
      { id: 'win_1', name: 'First Victory', desc: 'Win 1 battle', target: 1, current: 0, reward: 50, type: 'win', completed: false, claimed: false },
      { id: 'win_3', name: 'Triple Threat', desc: 'Win 3 battles', target: 3, current: 0, reward: 150, type: 'win', completed: false, claimed: false },
      { id: 'play_10', name: 'Card Master', desc: 'Play 10 cards', target: 10, current: 0, reward: 100, type: 'play', completed: false, claimed: false },
      { id: 'combo_3', name: 'Combo King', desc: 'Activate 3 combos', target: 3, current: 0, reward: 200, type: 'combo', completed: false, claimed: false },
      { id: 'spell_5', name: 'Spell Slinger', desc: 'Cast 5 spells', target: 5, current: 0, reward: 100, type: 'spell', completed: false, claimed: false },
      { id: 'heal_10', name: 'Healer', desc: 'Heal 10 HP total', target: 10, current: 0, reward: 100, type: 'heal', completed: false, claimed: false },
      { id: 'trap_2', name: 'Trap Master', desc: 'Trigger 2 traps', target: 2, current: 0, reward: 150, type: 'trap', completed: false, claimed: false },
      { id: 'damage_30', name: 'Damage Dealer', desc: 'Deal 30 damage', target: 30, current: 0, reward: 100, type: 'damage', completed: false, claimed: false },
      { id: 'fast_win', name: 'Speed Run', desc: 'Win in 5 turns or less', target: 1, current: 0, reward: 250, type: 'fast_win', completed: false, claimed: false },
      { id: 'survive', name: 'Survivor', desc: 'Win with 5 HP or less', target: 1, current: 0, reward: 200, type: 'survive', completed: false, claimed: false }
    ];
    
    try {
      const saved = JSON.parse(localStorage.getItem('synthopwars_quests'));
      if (saved && saved.length > 0) {
        return saved;
      }
    } catch (e) {}
    return defaultQuests;
  }

  loadLastReset() {
    try {
      return parseInt(localStorage.getItem('synthopwars_quests_reset')) || 0;
    } catch (e) {
      return 0;
    }
  }

  saveQuests() {
    localStorage.setItem('synthopwars_quests', JSON.stringify(this.quests));
    localStorage.setItem('synthopwars_quests_reset', this.lastReset.toString());
  }

  checkReset() {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (now - this.lastReset > oneDay) {
      // Reset quests
      this.quests = this.loadQuests().map(q => ({
        ...q,
        current: 0,
        completed: false,
        claimed: false
      }));
      this.lastReset = now;
      this.saveQuests();
    }
  }

  updateProgress(type, amount = 1) {
    this.checkReset();
    let updated = false;
    
    this.quests.forEach(q => {
      if (q.type === type && !q.completed) {
        q.current += amount;
        if (q.current >= q.target) {
          q.current = q.target;
          q.completed = true;
          updated = true;
        }
      }
    });
    
    if (updated) {
      this.saveQuests();
    }
    return updated;
  }

  claimReward(questId) {
    const quest = this.quests.find(q => q.id === questId);
    if (quest && quest.completed && !quest.claimed) {
      quest.claimed = true;
      this.saveQuests();
      return quest.reward;
    }
    return 0;
  }

  getActiveQuests() {
    this.checkReset();
    return this.quests.filter(q => !q.claimed);
  }

  getCompletedQuests() {
    this.checkReset();
    return this.quests.filter(q => q.completed && !q.claimed);
  }

  getProgress() {
    const completed = this.quests.filter(q => q.completed).length;
    const total = this.quests.length;
    return { completed, total, percent: Math.round((completed / total) * 100) };
  }
}

const quests = new QuestSystem();

if (typeof module !== 'undefined') {
  module.exports = { QuestSystem, quests };
}
