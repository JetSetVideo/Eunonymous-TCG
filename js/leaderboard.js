/**
 * Synthopwars Leaderboard System
 * Local leaderboard with player stats and rankings
 */

class LeaderboardSystem {
  constructor() {
    this.players = this.loadLeaderboard();
    this.playerRank = this.calculatePlayerRank();
  }

  loadLeaderboard() {
    const defaultPlayers = [
      { id: 'npc1', name: 'NeonStriker', wins: 42, losses: 15, rank: 'Diamond', rating: 1850, avatar: '🌀', title: 'Speed Demon' },
      { id: 'npc2', name: 'VaultKeeper', wins: 128, losses: 32, rank: 'Master', rating: 2100, avatar: '🗿', title: 'Fortress Lord' },
      { id: 'npc3', name: 'ChaosLord', wins: 67, losses: 89, rank: 'Gold', rating: 1500, avatar: '🎲', title: 'Wild Card' },
      { id: 'npc4', name: 'SynthMuse', wins: 95, losses: 20, rank: 'Diamond', rating: 1900, avatar: '⭐', title: 'Synergy Master' },
      { id: 'npc5', name: 'TitanBorn', wins: 78, losses: 45, rank: 'Platinum', rating: 1750, avatar: '🏔️', title: 'Colossus' },
      { id: 'npc6', name: 'VoidWalker', wins: 156, losses: 12, rank: 'Master', rating: 2200, avatar: '🕳️', title: 'The Nullifier' },
      { id: 'npc7', name: 'EconLord', wins: 34, losses: 8, rank: 'Gold', rating: 1550, avatar: '💰', title: 'Investor' },
      { id: 'npc8', name: 'Overcharge', wins: 89, losses: 56, rank: 'Platinum', rating: 1700, avatar: '⚡', title: 'Voltage' },
      { id: 'npc9', name: 'HealerPrime', wins: 45, losses: 22, rank: 'Gold', rating: 1600, avatar: '💚', title: 'Lifebringer' },
      { id: 'npc10', name: 'Trickster', wins: 112, losses: 67, rank: 'Diamond', rating: 1800, avatar: '🃏', title: 'Joker' }
    ];
    
    try {
      const saved = JSON.parse(localStorage.getItem('synthopwars_leaderboard'));
      if (saved && saved.length > 0) {
        return saved;
      }
    } catch (e) {}
    return defaultPlayers;
  }

  saveLeaderboard() {
    localStorage.setItem('synthopwars_leaderboard', JSON.stringify(this.players));
  }

  calculatePlayerRank() {
    const stats = this.getPlayerStats();
    const winRate = stats.wins / (stats.wins + stats.losses) || 0;
    const totalGames = stats.wins + stats.losses;
    
    let rating = 1000;
    if (totalGames > 0) {
      rating += stats.wins * 25;
      rating -= stats.losses * 15;
      rating += Math.floor(winRate * 500);
    }
    
    let rank = 'Bronze';
    if (rating >= 1500) rank = 'Gold';
    if (rating >= 1700) rank = 'Platinum';
    if (rating >= 1900) rank = 'Diamond';
    if (rating >= 2100) rank = 'Master';
    if (rating >= 2300) rank = 'Grandmaster';
    
    return { rank, rating, winRate, totalGames };
  }

  getPlayerStats() {
    try {
      return JSON.parse(localStorage.getItem('synthopwars_player_stats')) || { wins: 0, losses: 0, draws: 0, highestRating: 1000 };
    } catch (e) {
      return { wins: 0, losses: 0, draws: 0, highestRating: 1000 };
    }
  }

  savePlayerStats(stats) {
    localStorage.setItem('synthopwars_player_stats', JSON.stringify(stats));
    this.updatePlayerInLeaderboard();
  }

  updatePlayerInLeaderboard() {
    const rank = this.calculatePlayerRank();
    const stats = this.getPlayerStats();
    
    const playerEntry = {
      id: 'player',
      name: 'Commander',
      wins: stats.wins,
      losses: stats.losses,
      rank: rank.rank,
      rating: rank.rating,
      avatar: '👾',
      title: 'Rookie'
    };

    // Remove existing player entry
    this.players = this.players.filter(p => p.id !== 'player');
    this.players.push(playerEntry);
    
    // Sort by rating
    this.players.sort((a, b) => b.rating - a.rating);
    
    this.saveLeaderboard();
  }

  onBattleEnd(won) {
    const stats = this.getPlayerStats();
    stats.wins += won ? 1 : 0;
    stats.losses += won ? 0 : 1;
    
    const rank = this.calculatePlayerRank();
    if (rank.rating > stats.highestRating) {
      stats.highestRating = rank.rating;
    }
    
    this.savePlayerStats(stats);
    this.updatePlayerInLeaderboard();
    
    return rank;
  }

  getTopPlayers(limit = 10) {
    return this.players.slice(0, limit);
  }

  getPlayerPosition() {
    return this.players.findIndex(p => p.id === 'player') + 1;
  }
}

const leaderboard = new LeaderboardSystem();

if (typeof module !== 'undefined') {
  module.exports = { LeaderboardSystem, leaderboard };
}
