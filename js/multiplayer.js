/**
 * Synthopwars Social & Multiplayer System
 * Friends, Chat, Matchmaking
 */

class SocialSystem {
  constructor() {
    this.friends = this.loadFriends();
    this.chatHistory = this.loadChatHistory();
    this.messages = [];
    this.currentChat = 'global';
    this.playerName = 'Commander';
    this.playerId = 'cmd_' + Math.random().toString(36).substr(2, 8);
    this.callbacks = {};
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

  loadFriends() {
    try {
      return JSON.parse(localStorage.getItem('synthopwars_friends')) || [
        { id: 'p1', name: 'NeonStriker', status: 'online', avatar: '🌀', wins: 42, rank: 'Gold' },
        { id: 'p2', name: 'VaultKeeper', status: 'ingame', avatar: '🗿', wins: 128, rank: 'Diamond' },
        { id: 'p3', name: 'ChaosLord', status: 'offline', avatar: '🎲', wins: 15, rank: 'Silver' },
        { id: 'p4', name: 'SynthMuse', status: 'online', avatar: '⭐', wins: 67, rank: 'Platinum' },
        { id: 'p5', name: 'TitanBorn', status: 'ingame', avatar: '🏔️', wins: 89, rank: 'Platinum' }
      ];
    } catch (e) {
      return [];
    }
  }

  saveFriends() {
    localStorage.setItem('synthopwars_friends', JSON.stringify(this.friends));
  }

  loadChatHistory() {
    try {
      return JSON.parse(localStorage.getItem('synthopwars_chat')) || {
        global: [
          { sender: 'System', message: 'Welcome to Synthopwars! Battle for the Great Vault begins.', time: Date.now() - 3600000 },
          { sender: 'NeonStriker', message: 'Anyone up for a 1v1? Testing my new Overcharge deck.', time: Date.now() - 3000000 },
          { sender: 'VaultKeeper', message: 'Good luck with that rush. My Fortress walls are ready.', time: Date.now() - 2400000 },
          { sender: 'SynthMuse', message: 'Just pulled a Mythic card! The Architect!', time: Date.now() - 1800000 }
        ],
        private: {}
      };
    } catch (e) {
      return { global: [], private: {} };
    }
  }

  saveChatHistory() {
    localStorage.setItem('synthopwars_chat', JSON.stringify(this.chatHistory));
  }

  addFriend(name, id) {
    const friend = {
      id: id || 'p_' + Math.random().toString(36).substr(2, 8),
      name,
      status: 'online',
      avatar: this.randomAvatar(),
      wins: 0,
      rank: 'Bronze'
    };
    this.friends.push(friend);
    this.saveFriends();
    this.emit('friendAdded', friend);
    return friend;
  }

  removeFriend(id) {
    this.friends = this.friends.filter(f => f.id !== id);
    this.saveFriends();
    this.emit('friendRemoved', { id });
  }

  updateFriendStatus(id, status) {
    const friend = this.friends.find(f => f.id === id);
    if (friend) {
      friend.status = status;
      this.saveFriends();
      this.emit('friendStatusChanged', { id, status });
    }
  }

  randomAvatar() {
    const avatars = ['🌀', '🗿', '🎲', '⭐', '🏔️', '⚡', '👾', '👑', '🃏', '🎰'];
    return avatars[Math.floor(Math.random() * avatars.length)];
  }

  sendMessage(channel, sender, message) {
    const msg = {
      sender,
      message,
      time: Date.now()
    };
    
    if (channel === 'global') {
      this.chatHistory.global.push(msg);
      if (this.chatHistory.global.length > 100) {
        this.chatHistory.global.shift();
      }
    } else {
      if (!this.chatHistory.private[channel]) {
        this.chatHistory.private[channel] = [];
      }
      this.chatHistory.private[channel].push(msg);
      if (this.chatHistory.private[channel].length > 100) {
        this.chatHistory.private[channel].shift();
      }
    }
    
    this.saveChatHistory();
    this.emit('message', { channel, message: msg });
  }

  getMessages(channel) {
    if (channel === 'global') {
      return this.chatHistory.global;
    }
    return this.chatHistory.private[channel] || [];
  }

  // Simulate receiving messages from other players
  simulateIncomingMessage() {
    const senders = this.friends.filter(f => f.status === 'online');
    if (senders.length === 0) return;
    
    const sender = senders[Math.floor(Math.random() * senders.length)];
    const messages = [
      'Nice deck!',
      'Good game!',
      'Anyone want to team up?',
      'Just got a Legendary card!',
      'My Fortress build is unstoppable.',
      'Overcharge rush is too strong lol',
      'Need help with the Chaos archetype',
      'What battleground are you playing on?',
      'The Dalian Block rain effect is annoying',
      'Join my lobby!'
    ];
    
    const message = messages[Math.floor(Math.random() * messages.length)];
    this.sendMessage('global', sender.name, message);
  }

  // Start simulating incoming messages
  startSimulation() {
    this.simInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        this.simulateIncomingMessage();
      }
    }, 15000);
  }

  stopSimulation() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
    }
  }
}

// Export
const social = new SocialSystem();

if (typeof module !== 'undefined') {
  module.exports = { SocialSystem, social };
}
