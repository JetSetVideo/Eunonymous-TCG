/**
 * Synthopwars Card Database
 * All cards with 7 values: Attack, Defense, Power, Production, Cost, Type, Team
 */

const CARD_TYPES = {
  CREATURE: 'Creature',
  SPELL: 'Spell',
  TRAP: 'Trap',
  STRUCTURE: 'Structure',
  ROLE: 'Role',
  ACTION: 'Action',
  GEAR: 'Gear',
  CONSPIRACY: 'Conspiracy'
};

const TEAMS = {
  OVERCHARGERS: 'Overchargers',
  FORTRESS: 'Fortress',
  CONTROL: 'Control',
  SYNERGY: 'Synergy',
  ECONOMY: 'Economy',
  CHAOS: 'Chaos',
  SYNTH_LEGENDS: 'Synth Legends',
  TITANBORN: 'Titanborn'
};

const RARITIES = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
  MYTHIC: 'mythic'
};

const RARITY_TO_PRIORITY = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythic: 5
};

const KEYWORDS = {
  SURGE: 'Surge',
  INVOKE: 'Invoke',
  RESONANCE: 'Resonance',
  DETONATE: 'Detonate',
  RECALL: 'Recall',
  FORGE: 'Forge',
  SYNTH: 'Synth',
  OVERLOAD: 'Overload',
  NEXUS: 'Nexus',
  ECHO: 'Echo',
  HARVEST: 'Harvest',
  NULLIFY: 'Nullify',
  PHASE: 'Phase',
  CONDUIT: 'Conduit',
  ASCEND: 'Ascend',
  WARD: 'Ward',
  PIERCE: 'Pierce',
  LIFESTEAL: 'Lifesteal',
  BARRAGE: 'Barrage',
  FORTIFY: 'Fortify',
  SHIELD: 'Shield',
  REFLECT: 'Reflect',
  STEALTH: 'Stealth',
  SILENCE: 'Silence',
  ENRAGE: 'Enrage',
  POISON: 'Poison',
  REGENERATE: 'Regenerate',
  THORNS: 'Thorns',
  IMMORTAL: 'Immortal',
  CATALYST: 'Catalyst',
  // === Character-locked keywords (docs/CARDS.md §7) — never appear on Colorless cards ===
  PRECISION: 'Precision',
  REPLICATE: 'Replicate',
  INFECT: 'Infect',
  TRANSMUTE: 'Transmute',
  REFINE: 'Refine',
  SACRAMENT: 'Sacrament',
  DEVOTION: 'Devotion',
  OVERCLOCK: 'Overclock',
  ADRENALINE: 'Adrenaline',
  BLOOM: 'Bloom',
  SYMBIOSIS: 'Symbiosis',
  DRIFT: 'Drift',
  MANIFEST: 'Manifest',
  DEPLOY: 'Deploy',
  NETWORK: 'Network',
  SNARE: 'Snare',
  GAMBIT: 'Gambit',
};

const KEYWORD_DESCRIPTIONS = {
  Surge: 'Doubles ATK for one attack, then reduces to 1 until end of turn.',
  Invoke: 'Summons an additional token creature when played.',
  Resonance: 'Gains bonus stats if another card of the same team is on the field.',
  Detonate: 'Deals splash damage to all creatures when destroyed.',
  Recall: 'Returns to hand instead of graveyard when destroyed.',
  Forge: 'Gains +1/+1 for each turn it remains on the field (max +4/+4).',
  Synth: 'Can be combined with another Synth card to upgrade both.',
  Overload: 'Can spend additional power to boost stats before attacking.',
  Nexus: 'Connects to all other Nexus cards, sharing buffs.',
  Echo: 'Copies the last spell cast each time it triggers.',
  Harvest: 'Generates extra power equal to its current DEF at end of turn.',
  Nullify: 'Cancels the next opposing ability when played.',
  Phase: 'Cannot be targeted by spells for one turn after being played.',
  Conduit: 'Routes power to adjacent structures, doubling their production.',
  Ascend: 'Gains +1 to all stats permanently when another allied creature dies.',
  Ward: 'Cannot be targeted by enemy spells or abilities.',
  Pierce: 'Deals damage ignoring all defense and damage reduction.',
  Lifesteal: 'Heals the equipped creature or base for damage dealt equal to ATK.',
  Barrage: 'Attacks all enemy creatures simultaneously instead of just one.',
  Fortify: 'Gains +2 DEF if a Structure is on your field.',
  Shield: 'Absorbs the next instance of damage completely.',
  Reflect: 'Returns incoming damage back to the attacker.',
  Stealth: 'Cannot be attacked or targeted until it attacks.',
  Silence: 'Disables all abilities of target creature.',
  Enrage: 'Gains +2 ATK each time it takes damage.',
  Poison: 'Deals 1 damage per turn to afflicted creature until it dies.',
  Regenerate: 'Heals 2 HP at the start of your turn.',
  Thorns: 'Deals damage equal to DEF back to any attacker.',
  Immortal: 'Returns to the field once with half HP when destroyed.',
  Catalyst: 'Boosts the effect of the next spell or action played.',
  // === Character-locked keywords (docs/CARDS.md §7) ===
  Precision: 'Ignores Stealth and Cover when choosing a target. (Synthetic)',
  Replicate: 'On play, create a token copy of the cheapest Colorless creature you control (a 1/1 Meme Fragment if none). (Memetic)',
  Infect: 'Attached creature loses 1 ATK per turn; on its death, Infect jumps to a random adjacent enemy creature. (Memetic)',
  Transmute: "Sacrifice a friendly Colorless creature: gain its printed stats permanently, and reduce this card's Power cost by the sacrifice's Cost. (Refinist)",
  Refine: 'At end of turn, convert 1 unused Mana into +1 permanent Production. (Refinist)',
  Sacrament: 'On play, you may sacrifice a friendly creature: this gains +2/+2 and its ability triggers immediately. (Technopriest)',
  Devotion: '+1/+1 permanently for each Technopriest card in your graveyard. (Technopriest)',
  Overclock: 'May attack a second time this turn; takes 1 self-damage after each extra attack. (Cyborg)',
  Adrenaline: '+1 ATK permanently whenever this deals damage directly to the enemy base. (Cyborg)',
  Bloom: 'At the start of your turn, heal your base 1 HP for each Biopure creature you control. (Biopure)',
  Symbiosis: "Gains ATK/DEF equal to half an adjacent ally's DEF, rounded down. (Biopure)",
  Drift: 'Untargetable by enemy creature abilities until it attacks; free position-swap with another Ethereal creature, once per turn. (Ethereal)',
  Manifest: 'May be played face-down as a 0/0 Ward token for 1 Power; flip it later by paying the cost difference to reveal full stats. (Ethereal)',
  Deploy: 'On play, create 2 extra 0-cost 1/1 Worker tokens in open adjacent slots. (Organizer)',
  Network: '+1 Production permanently whenever you play another Organizer card or a Colorless Structure. (Organizer)',
  Snare: 'A Trap that also Silences and Stuns its target, in addition to its stated effect. (Schemist)',
  Gambit: 'On lethal damage, flip a coin: on a win, survives at 1 HP instead. Once per card. (Schemist)',
};

const TEAM_COLORS = {
  [TEAMS.OVERCHARGERS]: '#ff2a6d',
  [TEAMS.FORTRESS]: '#05ffa1',
  [TEAMS.CONTROL]: '#00d9ff',
  [TEAMS.SYNERGY]: '#bc13fe',
  [TEAMS.ECONOMY]: '#ffd700',
  [TEAMS.CHAOS]: '#ff6b35',
  [TEAMS.SYNTH_LEGENDS]: '#00f5ff',
  [TEAMS.TITANBORN]: '#ff8c00'
};

const TEAM_ICONS = {
  [TEAMS.OVERCHARGERS]: '⚔️',
  [TEAMS.FORTRESS]: '🛡️',
  [TEAMS.CONTROL]: '🔮',
  [TEAMS.SYNERGY]: '🔗',
  [TEAMS.ECONOMY]: '👑',
  [TEAMS.CHAOS]: '🎲',
  [TEAMS.SYNTH_LEGENDS]: '⭐',
  [TEAMS.TITANBORN]: '🏔️'
};

// Card database with 60 cards (10 per team, mixed rarities)
const ALL_CARDS = [
  // === OVERCHARGERS (Red/Fast) ===
  {
    id: 'oc_001', name: 'Spark Rusher', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.COMMON, cost: 1, attack: 3, defense: 1, power: 1, production: 0,
    speed: 8, health: 1, range: 1, comboId: 'rush',
    ability: 'Charge: Can attack immediately when played.',
    icon: '⚡', desc: 'A fast-moving shock trooper that strikes before enemies can react.'
  },
  {
    id: 'oc_002', name: 'Blade Dancer', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.COMMON, cost: 2, attack: 4, defense: 2, power: 2, production: 0,
    speed: 7, health: 2, range: 1, comboId: 'rush',
    ability: 'Twin Strike: If another Rush card is on field, both gain +2 ATK.',
    icon: '🗡️', desc: 'Dual-wielding assassin trained in the Dalian Block slums.'
  },
  {
    id: 'oc_003', name: 'Flame Sprinter', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 5, defense: 2, power: 3, production: 0,
    speed: 9, health: 2, range: 1, comboId: 'rush',
    ability: 'Ignition: Deals 1 damage to all adjacent enemy creatures on play.',
    icon: '🔥', desc: 'Burns through the battlefield leaving scorched earth.'
  },
  {
    id: 'oc_004', name: 'Volt Striker', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.RARE, cost: 4, attack: 6, defense: 3, power: 4, production: 0,
    speed: 8, health: 3, range: 1, comboId: 'rush',
    ability: 'Overclock: Pay +2 Power to deal double damage this turn.',
    icon: '⚡', desc: 'Channels raw voltage from the Star Beijing grid.'
  },
  {
    id: 'oc_005', name: 'Raid Leader', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.EPIC, cost: 5, attack: 5, defense: 4, power: 5, production: 0,
    speed: 6, health: 4, range: 1, comboId: 'rush',
    ability: 'War Cry: All Rush creatures gain +1 ATK and Charge.',
    icon: '📢', desc: 'Commands the Overcharge horde with terrifying zeal.'
  },
  {
    id: 'oc_006', name: 'Crimson Vanguard', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.LEGENDARY, cost: 6, attack: 8, defense: 5, power: 6, production: 0,
    speed: 7, health: 5, range: 1, comboId: 'rush',
    ability: 'Unstoppable: Ignores Cover. On attack, deal 2 damage to adjacent enemies.',
    icon: '👹', desc: 'The elite guard of the Overcharge rebellion. Nothing stops them.'
  },
  {
    id: 'oc_007', name: 'Overclock Surge', type: CARD_TYPES.SPELL, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.COMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'All creatures gain +2 ATK and Charge this turn.',
    icon: '💥', desc: 'A surge of adrenaline that pushes troops beyond their limits.'
  },
  {
    id: 'oc_008', name: 'Blitz Protocol', type: CARD_TYPES.SPELL, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.RARE, cost: 4, attack: 0, defense: 0, power: 4, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Draw 3 cards. All drawn creatures gain Charge.',
    icon: '📡', desc: 'Emergency deployment orders from Command.'
  },
  {
    id: 'oc_009', name: 'Ambush Mine', type: CARD_TYPES.TRAP, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'When enemy creature enters this slot: Deal 5 damage to it.',
    icon: '💣', desc: 'Concealed explosives rigged by Dalian Block saboteurs.'
  },
  {
    id: 'oc_010', name: 'Forward Camp', type: CARD_TYPES.STRUCTURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.COMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 3, range: 0,
    ability: 'Creatures played this turn cost -1 Power (min 1).',
    icon: '⛺', desc: 'A temporary staging ground for rapid deployment.'
  },

  // === FORTRESS (Green/Tank) ===
  {
    id: 'fr_001', name: 'Shield Bearer', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.COMMON, cost: 2, attack: 2, defense: 4, power: 2, production: 0,
    speed: 3, health: 4, range: 1, comboId: 'wall',
    ability: 'Cover: Redirects attacks from adjacent creatures to itself.',
    icon: '🛡️', desc: 'Trained to protect allies at any cost.'
  },
  {
    id: 'fr_002', name: 'Iron Golem', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 3, defense: 6, power: 3, production: 0,
    speed: 2, health: 6, range: 1, comboId: 'wall',
    ability: 'Fortify: Gains +2 DEF if a Structure is on your field.',
    icon: '🤖', desc: 'Ancient automaton from the Titanborn forges.'
  },
  {
    id: 'fr_003', name: 'Bastion Guard', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.RARE, cost: 4, attack: 4, defense: 7, power: 4, production: 0,
    speed: 3, health: 7, range: 1, comboId: 'wall',
    ability: 'Taunt: Enemies must attack this creature if able.',
    icon: '🏰', desc: 'The immovable defenders of the Fortress Guild.'
  },
  {
    id: 'fr_004', name: 'Living Wall', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.EPIC, cost: 5, attack: 2, defense: 10, power: 5, production: 0,
    speed: 1, health: 10, range: 1, comboId: 'wall',
    ability: 'Regeneration: Heals 2 HP at the start of your turn.',
    icon: '🌿', desc: 'Bio-engineered barrier that literally grows back.'
  },
  {
    id: 'fr_005', name: 'Colossus Warden', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.LEGENDARY, cost: 7, attack: 5, defense: 12, power: 7, production: 0,
    speed: 2, health: 12, range: 1, comboId: 'wall',
    ability: 'Absolute Defense: Reduces all incoming damage by 3 (min 1).',
    icon: '🗿', desc: 'A walking fortress. Cities have surrendered to its shadow.'
  },
  {
    id: 'fr_006', name: 'Healing Pulse', type: CARD_TYPES.SPELL, team: TEAMS.FORTRESS,
    rarity: RARITIES.COMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Restore 4 HP to all allied creatures.',
    icon: '💚', desc: 'Nanobot swarm that repairs tissue and armor alike.'
  },
  {
    id: 'fr_007', name: 'Fortress Wall', type: CARD_TYPES.STRUCTURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.COMMON, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 8, range: 0,
    ability: 'Absorbs 3 damage directed at your Base per turn.',
    icon: '🧱', desc: 'Reinforced plasteel barrier with auto-repair capabilities.'
  },
  {
    id: 'fr_008', name: 'Sanctuary', type: CARD_TYPES.STRUCTURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.RARE, cost: 4, attack: 0, defense: 0, power: 4, production: 1,
    speed: 0, health: 5, range: 0,
    ability: 'Allied creatures gain +2 DEF. Generates +1 Power/turn.',
    icon: '⛪', desc: 'A sacred ground where warriors find renewed strength.'
  },
  {
    id: 'fr_009', name: 'Counter Wall', type: CARD_TYPES.TRAP, team: TEAMS.FORTRESS,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'When enemy attacks your Base: Deal attacker ATK back to them.',
    icon: '↩️', desc: 'Kinetic reflectors that turn aggression against itself.'
  },
  {
    id: 'fr_010', name: 'Revitalize', type: CARD_TYPES.SPELL, team: TEAMS.FORTRESS,
    rarity: RARITIES.EPIC, cost: 5, attack: 0, defense: 0, power: 5, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Restore your Base to full HP. Destroy all your Structures.',
    icon: '✨', desc: 'Emergency protocol: Sacrifice infrastructure to survive.'
  },

  // === CONTROL (Blue/Disruption) ===
  {
    id: 'ct_001', name: 'Mana Leech', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL,
    rarity: RARITIES.COMMON, cost: 1, attack: 1, defense: 2, power: 1, production: 0,
    speed: 4, health: 2, range: 2, comboId: 'drain',
    ability: 'Drain: Enemy loses 1 Power generation per turn.',
    icon: '🧛', desc: 'Parasitic entity that feeds on enemy energy reserves.'
  },
  {
    id: 'ct_002', name: 'Silencer', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 2, defense: 3, power: 3, production: 0,
    speed: 5, health: 3, range: 2, comboId: 'drain',
    ability: 'Mute: Enemy cannot play Spells while this is on field.',
    icon: '🤐', desc: 'Psionic operative who blocks enemy command frequencies.'
  },
  {
    id: 'ct_003', name: 'Void Weaver', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL,
    rarity: RARITIES.RARE, cost: 4, attack: 3, defense: 4, power: 4, production: 0,
    speed: 4, health: 4, range: 2, comboId: 'drain',
    ability: 'Banish: Return 1 enemy creature to opponent\'s hand.',
    icon: '🌀', desc: 'Opens micro-rifts to teleport enemies back to origin.'
  },
  {
    id: 'ct_004', name: 'Dominus', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL,
    rarity: RARITIES.EPIC, cost: 5, attack: 4, defense: 5, power: 5, production: 0,
    speed: 3, health: 5, range: 2, comboId: 'drain',
    ability: 'Mind Control: Take control of 1 enemy creature with ATK < 4.',
    icon: '🧠', desc: 'The ultimate control agent. Resistance is futile.'
  },
  {
    id: 'ct_005', name: 'Counter Spell', type: CARD_TYPES.SPELL, team: TEAMS.CONTROL,
    rarity: RARITIES.COMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Negate the next enemy Spell. Draw 1 card.',
    icon: '❌', desc: 'Emergency magical shield that nullifies enemy castings.'
  },
  {
    id: 'ct_006', name: 'Power Drain', type: CARD_TYPES.SPELL, team: TEAMS.CONTROL,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Enemy loses 3 Power. You gain 3 Power.',
    icon: '🔌', desc: 'Siphons power directly from enemy generators.'
  },
  {
    id: 'ct_007', name: 'Stasis Field', type: CARD_TYPES.TRAP, team: TEAMS.CONTROL,
    rarity: RARITIES.RARE, cost: 4, attack: 0, defense: 0, power: 4, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'When enemy plays a creature: It cannot attack for 2 turns.',
    icon: '⏸️', desc: 'Temporal distortion field that locks units in time.'
  },
  {
    id: 'ct_008', name: 'Confusion Grid', type: CARD_TYPES.TRAP, team: TEAMS.CONTROL,
    rarity: RARITIES.EPIC, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'When enemy attacks: 50% chance they attack their own Base instead.',
    icon: '🌐', desc: 'Holographic decoys that scramble enemy targeting systems.'
  },
  {
    id: 'ct_009', name: 'Null Tower', type: CARD_TYPES.STRUCTURE, team: TEAMS.CONTROL,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 4, range: 0,
    ability: 'Enemy cards cost +1 Power to play.',
    icon: '🗼', desc: 'Jamming tower that interferes with enemy logistics.'
  },
  {
    id: 'ct_010', name: 'Oblivion', type: CARD_TYPES.SPELL, team: TEAMS.CONTROL,
    rarity: RARITIES.LEGENDARY, cost: 8, attack: 0, defense: 0, power: 8, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Destroy all creatures on the field. Both players draw 2 cards.',
    icon: '☠️', desc: 'The reset button. When things go wrong, start over.'
  },

  // === SYNERGY (Purple/Buff) ===
  {
    id: 'sy_001', name: 'Link Initiator', type: CARD_TYPES.CREATURE, team: TEAMS.SYNERGY,
    rarity: RARITIES.COMMON, cost: 1, attack: 2, defense: 1, power: 1, production: 0,
    speed: 5, health: 1, range: 1, comboId: 'link',
    ability: 'Link: If another Link card is on field, both gain +1 ATK/+1 DEF.',
    icon: '🔗', desc: 'The first thread in a web of interconnected power.'
  },
  {
    id: 'sy_002', name: 'Amplifier', type: CARD_TYPES.CREATURE, team: TEAMS.SYNERGY,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 2, defense: 2, power: 2, production: 0,
    speed: 4, health: 2, range: 1, comboId: 'link',
    ability: 'Boost: All Link creatures gain +1 ATK.',
    icon: '📢', desc: 'Broadcasts power signals that enhance allied units.'
  },
  {
    id: 'sy_003', name: 'Resonator', type: CARD_TYPES.CREATURE, team: TEAMS.SYNERGY,
    rarity: RARITIES.RARE, cost: 3, attack: 3, defense: 3, power: 3, production: 0,
    speed: 5, health: 3, range: 1, comboId: 'link',
    ability: 'Resonance: When a Link creature attacks, all others attack the same target.',
    icon: '📳', desc: 'Synchronizes attacks across the entire network.'
  },
  {
    id: 'sy_004', name: 'Hive Queen', type: CARD_TYPES.CREATURE, team: TEAMS.SYNERGY,
    rarity: RARITIES.EPIC, cost: 5, attack: 4, defense: 4, power: 5, production: 0,
    speed: 4, health: 4, range: 1, comboId: 'link',
    ability: 'Swarm: Summon a 2/2 Link token at the end of each turn.',
    icon: '👑', desc: 'The center of the collective. Without her, the network collapses.'
  },
  {
    id: 'sy_005', name: 'Unity', type: CARD_TYPES.SPELL, team: TEAMS.SYNERGY,
    rarity: RARITIES.COMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'All creatures gain +2 ATK and +2 DEF until end of turn.',
    icon: '🤝', desc: 'A moment of perfect coordination.'
  },
  {
    id: 'sy_006', name: 'Chain Reaction', type: CARD_TYPES.SPELL, team: TEAMS.SYNERGY,
    rarity: RARITIES.RARE, cost: 4, attack: 0, defense: 0, power: 4, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'For each Link creature on field, deal 3 damage to enemy Base.',
    icon: '⛓️', desc: 'Each link in the chain amplifies the destructive output.'
  },
  {
    id: 'sy_007', name: 'Bond Shield', type: CARD_TYPES.TRAP, team: TEAMS.SYNERGY,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'When allied creature would be destroyed: Transfer damage to another Link creature.',
    icon: '🛡️', desc: 'The network protects its own. Always.'
  },
  {
    id: 'sy_008', name: 'Nexus Spire', type: CARD_TYPES.STRUCTURE, team: TEAMS.SYNERGY,
    rarity: RARITIES.EPIC, cost: 4, attack: 0, defense: 0, power: 4, production: 1,
    speed: 0, health: 5, range: 0,
    ability: 'Link creatures gain +2 ATK. Generate +1 Power.',
    icon: '🏗️', desc: 'The physical anchor of the Synergy Collective.'
  },
  {
    id: 'sy_009', name: 'Echo Mimic', type: CARD_TYPES.CREATURE, team: TEAMS.SYNERGY,
    rarity: RARITIES.LEGENDARY, cost: 6, attack: 0, defense: 0, power: 6, production: 0,
    speed: 5, health: 6, range: 1, comboId: 'link',
    ability: 'Mimic: Copies the ATK and abilities of the strongest allied creature.',
    icon: '🎭', desc: 'There is no original. Only the network.'
  },
  {
    id: 'sy_010', name: 'Harmonic Blast', type: CARD_TYPES.SPELL, team: TEAMS.SYNERGY,
    rarity: RARITIES.EPIC, cost: 5, attack: 0, defense: 0, power: 5, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Deal 2 damage for each Link creature. Heal 2 for each Link creature.',
    icon: '💫', desc: 'Perfect balance of destruction and restoration.'
  },

  // === ECONOMY (Gold/Late) ===
  {
    id: 'ec_001', name: 'Prospector', type: CARD_TYPES.CREATURE, team: TEAMS.ECONOMY,
    rarity: RARITIES.COMMON, cost: 1, attack: 1, defense: 1, power: 1, production: 1,
    speed: 3, health: 1, range: 1, comboId: 'gold',
    ability: 'Miner: Generates +1 Power per turn while on field.',
    icon: '⛏️', desc: 'Digs for Synth deposits in the battlefield rubble.'
  },
  {
    id: 'ec_002', name: 'Power Node', type: CARD_TYPES.STRUCTURE, team: TEAMS.ECONOMY,
    rarity: RARITIES.COMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 1,
    speed: 0, health: 3, range: 0,
    ability: 'Generate +1 Power per turn.',
    icon: '⚡', desc: 'Portable generator that keeps the war machine running.'
  },
  {
    id: 'ec_003', name: 'Banker', type: CARD_TYPES.CREATURE, team: TEAMS.ECONOMY,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 1, defense: 2, power: 2, production: 1,
    speed: 3, health: 2, range: 1, comboId: 'gold',
    ability: 'Invest: Stores 2 Power. When destroyed, release stored Power.',
    icon: '💰', desc: 'Financial genius of the battlefield. Nothing is wasted.'
  },
  {
    id: 'ec_004', name: 'Crystal Reactor', type: CARD_TYPES.STRUCTURE, team: TEAMS.ECONOMY,
    rarity: RARITIES.RARE, cost: 3, attack: 0, defense: 0, power: 3, production: 2,
    speed: 0, health: 4, range: 0,
    ability: 'Generate +2 Power per turn. If destroyed, enemy gains 3 Power.',
    icon: '💎', desc: 'Volatile power source from the Great Vault.'
  },
  {
    id: 'ec_005', name: 'Tycoon', type: CARD_TYPES.CREATURE, team: TEAMS.ECONOMY,
    rarity: RARITIES.EPIC, cost: 4, attack: 2, defense: 3, power: 4, production: 1,
    speed: 3, health: 3, range: 1, comboId: 'gold',
    ability: 'Profits: When you generate Power, gain +1 extra.',
    icon: '💼', desc: 'The Economy Lords always find an edge.'
  },
  {
    id: 'ec_006', name: 'Investment', type: CARD_TYPES.SPELL, team: TEAMS.ECONOMY,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Lose 2 Power now. Gain 6 Power next turn.',
    icon: '📈', desc: 'Short-term sacrifice for long-term dominance.'
  },
  {
    id: 'ec_007', name: 'Golden Avatar', type: CARD_TYPES.CREATURE, team: TEAMS.ECONOMY,
    rarity: RARITIES.LEGENDARY, cost: 8, attack: 10, defense: 8, power: 8, production: 0,
    speed: 2, health: 8, range: 1, comboId: 'gold',
    ability: 'Titan: Cannot be played before turn 5. On play, destroy all enemy Structures.',
    icon: '👑', desc: 'The physical manifestation of wealth and power.'
  },
  {
    id: 'ec_008', name: 'Trade Route', type: CARD_TYPES.STRUCTURE, team: TEAMS.ECONOMY,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 0, power: 3, production: 1,
    speed: 0, health: 2, range: 0,
    ability: 'Draw +1 card during Draw Phase. Generate +1 Power.',
    icon: '🚛', desc: 'Supply lines that keep the war effort funded.'
  },
  {
    id: 'ec_009', name: 'Tax Collector', type: CARD_TYPES.CREATURE, team: TEAMS.ECONOMY,
    rarity: RARITIES.RARE, cost: 3, attack: 2, defense: 2, power: 3, production: 1,
    speed: 4, health: 2, range: 1, comboId: 'gold',
    ability: 'Levy: Enemy loses 1 Power generation. You gain +1 Power generation.',
    icon: '📋', desc: 'The Economy Lords take what is theirs.'
  },
  {
    id: 'ec_010', name: 'Emergency Fund', type: CARD_TYPES.SPELL, team: TEAMS.ECONOMY,
    rarity: RARITIES.EPIC, cost: 1, attack: 0, defense: 0, power: 1, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Gain 5 Power. Skip your next Draw Phase.',
    icon: '🚨', desc: 'Desperate times call for desperate financing.'
  },

  // === CHAOS (Black/RNG) ===
  {
    id: 'ch_001', name: 'Wildling', type: CARD_TYPES.CREATURE, team: TEAMS.CHAOS,
    rarity: RARITIES.COMMON, cost: 1, attack: 0, defense: 0, power: 1, production: 0,
    speed: 5, health: 1, range: 1, comboId: 'chaos',
    ability: 'Random: ATK and DEF are set to 1-6 when played.',
    icon: '🎲', desc: 'Completely unpredictable. Even they don\'t know their own strength.'
  },
  {
    id: 'ch_002', name: 'Gambler', type: CARD_TYPES.CREATURE, team: TEAMS.CHAOS,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 3, defense: 3, power: 2, production: 0,
    speed: 4, health: 3, range: 1, comboId: 'chaos',
    ability: 'Roll: 50% chance to double ATK, 50% chance to set ATK to 1.',
    icon: '🎰', desc: 'Every attack is a spin of the wheel.'
  },
  {
    id: 'ch_003', name: 'Shifter', type: CARD_TYPES.CREATURE, team: TEAMS.CHAOS,
    rarity: RARITIES.RARE, cost: 3, attack: 4, defense: 4, power: 3, production: 0,
    speed: 5, health: 4, range: 1, comboId: 'chaos',
    ability: 'Swap: At end of turn, swap ATK and DEF with a random enemy creature.',
    icon: '🔄', desc: 'Reality is fluid. So are stats.'
  },
  {
    id: 'ch_004', name: 'Joker', type: CARD_TYPES.CREATURE, team: TEAMS.CHAOS,
    rarity: RARITIES.EPIC, cost: 4, attack: 0, defense: 0, power: 4, production: 0,
    speed: 6, health: 1, range: 1, comboId: 'chaos',
    ability: 'Wild Card: Copies a random ability from any card in either deck.',
    icon: '🃏', desc: 'The ultimate wildcard. Expect nothing. Fear everything.'
  },
  {
    id: 'ch_005', name: 'Chaos Bolt', type: CARD_TYPES.SPELL, team: TEAMS.CHAOS,
    rarity: RARITIES.COMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Deal 1-8 damage to a random enemy creature or Base.',
    icon: '🌩️', desc: 'Uncontrolled energy. Aim is optional.'
  },
  {
    id: 'ch_006', name: 'Shuffle', type: CARD_TYPES.SPELL, team: TEAMS.CHAOS,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Both players shuffle their hands into their decks and draw 5 new cards.',
    icon: '🔀', desc: 'When the board is bad, reset the game.'
  },
  {
    id: 'ch_007', name: 'Unstable Mine', type: CARD_TYPES.TRAP, team: TEAMS.CHAOS,
    rarity: RARITIES.RARE, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'When triggered: 50% chance to destroy target, 50% chance to destroy a random ally.',
    icon: '💥', desc: 'High explosive. High risk. High reward.'
  },
  {
    id: 'ch_008', name: 'Mirror Realm', type: CARD_TYPES.SPELL, team: TEAMS.CHAOS,
    rarity: RARITIES.EPIC, cost: 5, attack: 0, defense: 0, power: 5, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Swap all your creatures with the enemy\'s creatures.',
    icon: '🪞', desc: 'In the mirror realm, nothing is as it seems.'
  },
  {
    id: 'ch_009', name: 'Chaos Engine', type: CARD_TYPES.STRUCTURE, team: TEAMS.CHAOS,
    rarity: RARITIES.LEGENDARY, cost: 4, attack: 0, defense: 0, power: 4, production: 0,
    speed: 0, health: 6, range: 0,
    ability: 'At start of turn: Random effect. (Deal 3 damage, heal 3, draw 2, discard 2, etc.)',
    icon: '⚙️', desc: 'The heart of chaos. Completely unpredictable energy output.'
  },
  {
    id: 'ch_010', name: 'Total Anarchy', type: CARD_TYPES.SPELL, team: TEAMS.CHAOS,
    rarity: RARITIES.LEGENDARY, cost: 6, attack: 0, defense: 0, power: 6, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Randomize all creature ATK/DEF on the field. Swap all Traps between players.',
    icon: '🔥', desc: 'The ultimate chaos. Nobody survives unchanged.'
  },

  // === SYNTH LEGENDS (Cyan/Ancient) ===
  {
    id: 'sl_001', name: 'Ancient Guardian', type: CARD_TYPES.CREATURE, team: TEAMS.SYNTH_LEGENDS,
    rarity: RARITIES.RARE, cost: 4, attack: 5, defense: 5, power: 4, production: 0,
    speed: 4, health: 5, range: 1, comboId: 'legend',
    ability: 'Ancient: Ignores all negative effects from enemy cards.',
    icon: '🗿', desc: 'From the first era of Synthtopia. Untouched by modern magic.'
  },
  {
    id: 'sl_002', name: 'Vault Keeper', type: CARD_TYPES.CREATURE, team: TEAMS.SYNTH_LEGENDS,
    rarity: RARITIES.EPIC, cost: 5, attack: 6, defense: 6, power: 5, production: 0,
    speed: 3, health: 6, range: 1, comboId: 'legend',
    ability: 'Seal: When destroyed, return to hand instead of Graveyard.',
    icon: '📜', desc: 'Guardian of the Great Vault. Cannot be truly killed.'
  },
  {
    id: 'sl_003', name: 'Synth Titan', type: CARD_TYPES.CREATURE, team: TEAMS.SYNTH_LEGENDS,
    rarity: RARITIES.LEGENDARY, cost: 7, attack: 8, defense: 8, power: 7, production: 0,
    speed: 2, health: 8, range: 1, comboId: 'legend',
    ability: 'Colossal: Reduces all damage taken by 2. Cannot be targeted by Spells.',
    icon: '👾', desc: 'The old gods of the digital realm. Fear their approach.'
  },
  {
    id: 'sl_004', name: 'Muse Inspiration', type: CARD_TYPES.SPELL, team: TEAMS.SYNTH_LEGENDS,
    rarity: RARITIES.EPIC, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Transform your weakest creature into a Legendary version.',
    icon: '💫', desc: 'The Muses grant power to the worthy.'
  },
  {
    id: 'sl_005', name: 'Codex of Power', type: CARD_TYPES.STRUCTURE, team: TEAMS.SYNTH_LEGENDS,
    rarity: RARITIES.LEGENDARY, cost: 5, attack: 0, defense: 0, power: 5, production: 1,
    speed: 0, health: 5, range: 0,
    ability: 'All Legend cards cost -1 Power. Generate +1 Power.',
    icon: '📖', desc: 'The written wisdom of the first Synthtopians.'
  },

  // === TITANBORN (Orange/Colossal) ===
  {
    id: 'tb_001', name: 'Stone Giant', type: CARD_TYPES.CREATURE, team: TEAMS.TITANBORN,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 4, defense: 5, power: 3, production: 0,
    speed: 2, health: 5, range: 1, comboId: 'titan',
    ability: 'Slow but powerful. Cannot attack on the turn it is played.',
    icon: '🗿', desc: 'Ancient stone given life by the Titanborn rituals.'
  },
  {
    id: 'tb_002', name: 'Earth Shaker', type: CARD_TYPES.CREATURE, team: TEAMS.TITANBORN,
    rarity: RARITIES.RARE, cost: 5, attack: 6, defense: 7, power: 5, production: 0,
    speed: 2, health: 7, range: 2, comboId: 'titan',
    ability: 'Quake: When played, all enemy creatures lose 1 DEF.',
    icon: '🌋', desc: 'Each step is a small earthquake.'
  },
  {
    id: 'tb_003', name: 'World Breaker', type: CARD_TYPES.CREATURE, team: TEAMS.TITANBORN,
    rarity: RARITIES.LEGENDARY, cost: 8, attack: 10, defense: 10, power: 8, production: 0,
    speed: 1, health: 10, range: 1, comboId: 'titan',
    ability: 'Cataclysm: When destroyed, deal 5 damage to all creatures on the field.',
    icon: '☄️', desc: 'The end of the world walks among us.'
  },
  {
    id: 'tb_004', name: 'Titan Forge', type: CARD_TYPES.STRUCTURE, team: TEAMS.TITANBORN,
    rarity: RARITIES.RARE, cost: 4, attack: 0, defense: 0, power: 4, production: 0,
    speed: 0, health: 6, range: 0,
    ability: 'All Titan creatures gain +2 ATK and +2 DEF.',
    icon: '🔨', desc: 'The furnace where the Titanborn are made.'
  },
  {
    id: 'tb_005', name: 'Mountain Call', type: CARD_TYPES.SPELL, team: TEAMS.TITANBORN,
    rarity: RARITIES.EPIC, cost: 5, attack: 0, defense: 0, power: 5, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Summon a 5/5 Titan token with Taunt.',
    icon: '⛰️', desc: 'The mountains themselves answer the Titanborn call.'
  },

  // === NEUTRAL CARDS (No Team Bonus) ===
  {
    id: 'nt_001', name: 'Wandering Mercenary', type: CARD_TYPES.CREATURE, team: null,
    rarity: RARITIES.COMMON, cost: 2, attack: 3, defense: 2, power: 2, production: 0,
    speed: 5, health: 3, range: 1, comboId: null,
    ability: 'Forge: Gains +1/+1 for each turn it remains on the field (max +4/+4).',
    icon: '⚔️', desc: 'A veteran of countless battles, loyal to none but themselves.'
  },
  {
    id: 'nt_002', name: 'Void Nomad', type: CARD_TYPES.CREATURE, team: null,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 3, defense: 3, power: 3, production: 0,
    speed: 6, health: 4, range: 1, comboId: null,
    ability: 'Phase: Cannot be targeted by spells for one turn after being played.',
    icon: '🌀', desc: 'It exists between realities, untouchable by conventional means.'
  },
  {
    id: 'nt_003', name: 'Scrap Golem', type: CARD_TYPES.CREATURE, team: null,
    rarity: RARITIES.COMMON, cost: 3, attack: 2, defense: 4, power: 3, production: 0,
    speed: 2, health: 6, range: 1, comboId: null,
    ability: 'Harvest: Generates 1 power at end of your turn for each 2 DEF it has.',
    icon: '🤖', desc: 'Assembled from the wreckage of past wars, it endures indefinitely.'
  },
  {
    id: 'nt_004', name: 'Echo Chamber', type: CARD_TYPES.STRUCTURE, team: null,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 3, power: 3, production: 1,
    speed: 0, health: 4, range: 0, comboId: null,
    ability: 'Echo: The next spell you cast is copied and resolved twice.',
    icon: '🔊', desc: 'Sound becomes signal, signal becomes power in the synthverse.'
  },
  {
    id: 'nt_005', name: 'Null Shard', type: CARD_TYPES.SPELL, team: null,
    rarity: RARITIES.COMMON, cost: 1, attack: 0, defense: 0, power: 1, production: 0,
    speed: 0, health: 0, range: 0, comboId: null,
    ability: 'Nullify: Cancel target ability or spell. Draw 1 card.',
    icon: '🚫', desc: 'In the synthverse, even reality can be rejected.'
  },
  {
    id: 'nt_006', name: 'Conduit Node', type: CARD_TYPES.STRUCTURE, team: null,
    rarity: RARITIES.RARE, cost: 4, attack: 0, defense: 4, power: 4, production: 2,
    speed: 0, health: 5, range: 0, comboId: null,
    ability: 'Conduit: Adjacent structures produce +1 extra power each turn.',
    icon: '⚡', desc: 'A power relay spanning the entire Neo-City grid.'
  },
  {
    id: 'nt_007', name: 'Surge Catalyst', type: CARD_TYPES.SPELL, team: null,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0, comboId: null,
    ability: 'Surge: Target ally gains +3 ATK until end of turn. If it destroys a creature, draw 1.',
    icon: '💥', desc: 'A burst of raw synthwave energy that overwhelms the target.'
  },
  {
    id: 'nt_008', name: 'Ascendant Prototype', type: CARD_TYPES.CREATURE, team: null,
    rarity: RARITIES.RARE, cost: 4, attack: 3, defense: 3, power: 4, production: 0,
    speed: 4, health: 5, range: 1, comboId: null,
    ability: 'Ascend: Gains +1 to all stats permanently when another allied creature dies.',
    icon: '🔺', desc: 'Each death in the synthverse makes it stronger.'
  },
  {
    id: 'nt_009', name: 'Overload Core', type: CARD_TYPES.CREATURE, team: null,
    rarity: RARITIES.EPIC, cost: 6, attack: 5, defense: 3, power: 6, production: 0,
    speed: 4, health: 6, range: 2, comboId: null,
    ability: 'Overload: Spend 3 extra power when attacking to deal double damage this turn.',
    icon: '🔋', desc: 'It contains more energy than it was designed to hold. It loves it.'
  },
  {
    id: 'nt_010', name: 'Nexus Anchor', type: CARD_TYPES.STRUCTURE, team: null,
    rarity: RARITIES.LEGENDARY, cost: 7, attack: 0, defense: 6, power: 7, production: 3,
    speed: 0, health: 8, range: 0, comboId: null,
    ability: 'Nexus: All your creatures gain +1/+1. Structures produce +1 power. Opponent spells cost +1.',
    icon: '🌐', desc: 'The foundation of the synthverse itself — control it, control everything.'
  },

  // === MYTHIC CARDS (Ultra Rare) ===
  {
    id: 'my_001', name: 'The Architect', type: CARD_TYPES.CREATURE, team: TEAMS.SYNTH_LEGENDS,
    rarity: RARITIES.MYTHIC, cost: 10, attack: 12, defense: 12, power: 10, production: 2,
    speed: 3, health: 12, range: 2, comboId: 'mythic',
    ability: 'Creator: All your Structures have +3 HP and generate +1 Power. Your Base HP is 40.',
    icon: '🏗️', desc: 'The one who built the 6 Neo-Cities. Their power is absolute.'
  },

  // === SCOUT / REVEAL CARDS (Tactical information warfare) ===
  {
    id: 'sc_001', name: 'Scout Drone', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL,
    rarity: RARITIES.COMMON, cost: 1, attack: 1, defense: 1, power: 1, production: 0,
    speed: 6, health: 1, range: 2, comboId: 'scout',
    ability: 'Scout: When played, reveal 1 random card in enemy hand.',
    icon: '🛸', desc: 'Silent observer feeding intel back to Command.'
  },
  {
    id: 'sc_002', name: 'Infiltrator', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 2, defense: 2, power: 2, production: 0,
    speed: 7, health: 2, range: 1, comboId: 'scout',
    ability: 'Deep Scan: When played, reveal 2 random enemy cards. If both are Creatures, gain +1 ATK.',
    icon: '🕵️', desc: 'Behind enemy lines before the battle begins.'
  },
  {
    id: 'sc_003', name: 'Oracle Eye', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL,
    rarity: RARITIES.RARE, cost: 3, attack: 1, defense: 3, power: 3, production: 0,
    speed: 5, health: 3, range: 2, comboId: 'scout',
    ability: 'Oracle: Reveal ALL cards in enemy hand. Enemy discards 1 revealed Spell.',
    icon: '👁️', desc: 'Nothing escapes the Oracle\'s gaze.'
  },
  {
    id: 'sc_004', name: 'Signal Intercept', type: CARD_TYPES.SPELL, team: TEAMS.CONTROL,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Peek: Look at the top 3 cards of either deck. You may discard any of them.',
    icon: '📡', desc: 'Their transmissions are not as secure as they think.'
  },
  {
    id: 'sc_005', name: 'Mind Probe', type: CARD_TYPES.SPELL, team: TEAMS.CONTROL,
    rarity: RARITIES.EPIC, cost: 4, attack: 0, defense: 0, power: 4, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Full Probe: Reveal enemy\'s entire hand. Steal 1 card of your choice and add it to your hand.',
    icon: '🧠', desc: 'Their thoughts are now your weapons.'
  },
  {
    id: 'sc_006', name: 'Spy Network', type: CARD_TYPES.STRUCTURE, team: TEAMS.CONTROL,
    rarity: RARITIES.RARE, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 3, range: 0,
    ability: 'Network: At start of your turn, reveal top card of enemy deck. You may move it to bottom.',
    icon: '🕸️', desc: 'A web of informants spanning all six Neo-Cities.'
  },
  {
    id: 'sc_007', name: 'Deck Scryer', type: CARD_TYPES.CREATURE, team: TEAMS.ECONOMY,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 1, defense: 1, power: 2, production: 1,
    speed: 4, health: 1, range: 1, comboId: 'gold',
    ability: 'Foresight: When played, look at top 2 cards of your deck. Keep or bottom each.',
    icon: '🔮', desc: 'Sees the threads of probability and pulls the right one.'
  },
  {
    id: 'sc_008', name: 'Grave Robber', type: CARD_TYPES.CREATURE, team: TEAMS.CHAOS,
    rarity: RARITIES.RARE, cost: 3, attack: 2, defense: 2, power: 3, production: 0,
    speed: 4, health: 2, range: 1, comboId: 'chaos',
    ability: 'Gravedig: When played, put top card of any graveyard into your hand.',
    icon: '⚰️', desc: 'The dead are not safe from the Chaos Cult.'
  },

  // === AGGRESSIVE AGGRO CARDS (Overcharge expansion for speed) ===
  {
    id: 'ag_001', name: 'Spark Scout', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.COMMON, cost: 0, attack: 2, defense: 0, power: 0, production: 0,
    speed: 9, health: 1, range: 1, comboId: 'rush',
    ability: 'Ephemeral: Dies at end of turn. Charge.',
    icon: '💨', desc: 'A flash of lightning - here and gone in an instant.'
  },
  {
    id: 'ag_002', name: 'Speed Demon', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.UNCOMMON, cost: 1, attack: 3, defense: 0, power: 1, production: 0,
    speed: 10, health: 1, range: 1, comboId: 'rush',
    ability: 'Glass Cannon: Double ATK when attacking. Always attacks first.',
    icon: '🏎️', desc: 'Speed is the best defense - and the only one needed.'
  },
  {
    id: 'ag_003', name: 'Berserker', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.RARE, cost: 3, attack: 6, defense: 1, power: 3, production: 0,
    speed: 8, health: 2, range: 1, comboId: 'rush',
    ability: 'Reckless: +3 ATK, -2 DEF. Must attack each turn if able.',
    icon: '🤪', desc: 'No fear. No hesitation. No survival instinct.'
  },
  {
    id: 'ag_004', name: 'Chain Lightning', type: CARD_TYPES.SPELL, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Deal 2 damage to target enemy creature, then 1 damage to adjacent creatures.',
    icon: '⚡', desc: 'The bolt never stops until it finds ground.'
  },

  // === CONTROL EXPANSION (More disruption) ===
  {
    id: 'ct_011', name: 'Thoughtseize', type: CARD_TYPES.SPELL, team: TEAMS.CONTROL,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Reveal enemy hand. Choose and discard 1 non-Creature card.',
    icon: '🫳', desc: 'Your opponent\'s strategy, laid bare and dismantled.'
  },
  {
    id: 'ct_012', name: 'Freeze Ray', type: CARD_TYPES.SPELL, team: TEAMS.CONTROL,
    rarity: RARITIES.COMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Target creature cannot attack for 2 turns. Draw 1 card.',
    icon: '❄️', desc: 'Time stops for the frozen. Their allies must wait.'
  },

  // === FORTRESS EXPANSION (More sustain) ===
  {
    id: 'fr_011', name: 'Shield Wall', type: CARD_TYPES.STRUCTURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 6, range: 0,
    ability: 'All adjacent creatures gain Cover and +2 DEF.',
    icon: '🛡️', desc: 'Behind this wall, no ally fights alone.'
  },
  {
    id: 'fr_012', name: 'Regeneration Tank', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.RARE, cost: 3, attack: 1, defense: 5, power: 3, production: 0,
    speed: 2, health: 5, range: 1, comboId: 'wall',
    ability: 'Heal all allies for 2 HP at the start of your turn.',
    icon: '🏥', desc: 'Mobile medical unit. Wounds close before they bleed.'
  },

  // === SYNERGY EXPANSION (More combos) ===
  {
    id: 'sy_011', name: 'Harmonic Linker', type: CARD_TYPES.CREATURE, team: TEAMS.SYNERGY,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 1, defense: 1, power: 2, production: 0,
    speed: 5, health: 2, range: 1, comboId: 'link',
    ability: 'Cascade: When a Link creature attacks, this also attacks.',
    icon: '🔄', desc: 'When one strikes, the network answers.'
  },
  {
    id: 'sy_012', name: 'Overmind', type: CARD_TYPES.STRUCTURE, team: TEAMS.SYNERGY,
    rarity: RARITIES.RARE, cost: 4, attack: 0, defense: 0, power: 4, production: 1,
    speed: 0, health: 4, range: 0,
    ability: 'Hive Mind: All Link creatures share their highest ATK value.',
    icon: '🌐', desc: 'Individuality is weakness. The collective is power.'
  },

  // === ECONOMY EXPANSION (More ramp) ===
  {
    id: 'ec_011', name: 'Loan Shark', type: CARD_TYPES.CREATURE, team: TEAMS.ECONOMY,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 2, defense: 2, power: 2, production: 1,
    speed: 4, health: 2, range: 1, comboId: 'gold',
    ability: 'Credit: Gain 3 Power now. Lose 1 Power/turn for 3 turns.',
    icon: '🦈', desc: 'Fast power comes with strings attached.'
  },
  {
    id: 'ec_012', name: 'Market Crash', type: CARD_TYPES.SPELL, team: TEAMS.ECONOMY,
    rarity: RARITIES.RARE, cost: 5, attack: 0, defense: 0, power: 5, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Enemy loses all stored Power. You gain half of it (rounded up).',
    icon: '📉', desc: 'The market giveth what the market taketh away.'
  },

  // === CHAOS EXPANSION (More RNG) ===
  {
    id: 'ch_011', name: 'Wild Mutation', type: CARD_TYPES.SPELL, team: TEAMS.CHAOS,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Target creature\'s ATK and DEF become random values (1-8 each).',
    icon: '🧬', desc: 'Evolution is unpredictable. So is mutation.'
  },
  {
    id: 'ch_012', name: 'Pandemonium', type: CARD_TYPES.SPELL, team: TEAMS.CHAOS,
    rarity: RARITIES.EPIC, cost: 6, attack: 0, defense: 0, power: 6, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'All creatures on field attack random targets (including allies).',
    icon: '🌪️', desc: 'Total chaos. Friend and foe indistinguishable.'
  },
  {
    id: 'my_002', name: 'The Nullifier', type: CARD_TYPES.CREATURE, team: TEAMS.CHAOS,
    rarity: RARITIES.MYTHIC, cost: 9, attack: 0, defense: 15, power: 9, production: 0,
    speed: 1, health: 15, range: 1, comboId: 'mythic',
    ability: 'Void: All enemy abilities are disabled while this is on field.',
    icon: '🕳️', desc: 'The absence of everything. The end of all abilities.'
  },
  {
    id: 'my_003', name: 'The Great Vault', type: CARD_TYPES.STRUCTURE, team: TEAMS.ECONOMY,
    rarity: RARITIES.MYTHIC, cost: 8, attack: 0, defense: 0, power: 8, production: 3,
    speed: 0, health: 10, range: 0,
    ability: 'Infinite: Generate +3 Power. At end of turn, draw 1 card.',
    icon: '🏛️', desc: 'The source of all power. The prize all Neo-Cities fight for.'
  },
  {
    id: 'my_004', name: 'The Eunonymous', type: CARD_TYPES.ROLE, team: TEAMS.SYNTH_LEGENDS,
    rarity: RARITIES.MYTHIC, cost: 0, attack: 0, defense: 0, power: 0, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Ascended: Start with +5 Base HP. All cards cost -1 Power (min 1). Draw +1 card each turn.',
    icon: '👁️', desc: 'The ultimate Commander. The one who sees all paths.'
  },

  // === GEAR CARDS (Equipment) ===
  {
    id: 'gr_001', name: 'Plasma Rifle', type: CARD_TYPES.GEAR, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 2, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 1,
    ability: 'Equip: +2 ATK. Grants Range 1.',
    icon: '🔫', desc: 'A high-energy plasma weapon that turns any creature into a marksman.'
  },
  {
    id: 'gr_002', name: 'Force Field Generator', type: CARD_TYPES.GEAR, team: TEAMS.FORTRESS,
    rarity: RARITIES.RARE, cost: 3, attack: 0, defense: 3, power: 3, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Equip: +3 DEF. Shield: Absorbs the next instance of damage completely.',
    icon: '🔰', desc: 'A portable barrier projector that can stop a railgun round cold.'
  },
  {
    id: 'gr_003', name: 'Overclock Module', type: CARD_TYPES.GEAR, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.EPIC, cost: 2, attack: 1, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Equip: +1 ATK. Pierce: Attacks ignore all defense and damage reduction.',
    icon: '🔋', desc: 'Pushes weapons past their safety limits. Damage has no ceiling.'
  },
  {
    id: 'gr_004', name: 'Magnetic Shield', type: CARD_TYPES.GEAR, team: TEAMS.FORTRESS,
    rarity: RARITIES.EPIC, cost: 3, attack: 0, defense: 2, power: 3, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Equip: +2 DEF. Ward: Cannot be targeted by enemy spells or abilities.',
    icon: '🧲', desc: 'A magnetic deflector that repels both projectiles and spells.'
  },
  {
    id: 'gr_005', name: 'Riot Shield', type: CARD_TYPES.GEAR, team: TEAMS.FORTRESS,
    rarity: RARITIES.UNCOMMON, cost: 1, attack: 0, defense: 1, power: 1, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Equip: +1 DEF. Thorns: Deals damage equal to DEF back to any attacker.',
    icon: '🛡️', desc: 'Standard issue for riot control. Hits back as hard as it holds.'
  },
  {
    id: 'gr_006', name: 'Nano Injector', type: CARD_TYPES.GEAR, team: TEAMS.CHAOS,
    rarity: RARITIES.RARE, cost: 3, attack: 3, defense: -1, power: 3, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Equip: +3 ATK, -1 DEF. Enrage: Gains +2 ATK each time it takes damage.',
    icon: '💉', desc: 'A serum that trades sanity for strength. The rage is a feature.'
  },
  {
    id: 'gr_007', name: 'Reinforced Plating', type: CARD_TYPES.GEAR, team: TEAMS.FORTRESS,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 3, range: 0,
    ability: 'Equip: +3 HP. Absorbs the first 3 damage each turn.',
    icon: '⚙️', desc: 'Layered composite armor that can shrug off small arms fire.'
  },
  {
    id: 'gr_008', name: 'Weapon Cache', type: CARD_TYPES.GEAR, team: TEAMS.ECONOMY,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 1, defense: 1, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Equip: +1 ATK /+1 DEF. Draw 1 card when equipped creature attacks.',
    icon: '📦', desc: 'A supply crate that keeps giving as long as the fight continues.'
  },
  {
    id: 'gr_009', name: 'Vampiric Blade', type: CARD_TYPES.GEAR, team: TEAMS.CHAOS,
    rarity: RARITIES.RARE, cost: 3, attack: 2, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Equip: +2 ATK. Lifesteal: Heals the equipped creature for damage equal to ATK.',
    icon: '🗡️', desc: 'A cursed blade that drinks the life force of those it cuts.'
  },
  {
    id: 'gr_010', name: 'Berserker Axe', type: CARD_TYPES.GEAR, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.LEGENDARY, cost: 4, attack: 4, defense: -2, power: 4, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Equip: +4 ATK, -2 DEF. Enrage: Gains +2 ATK each time it takes damage.',
    icon: '🪓', desc: 'The wielder stops caring about survival. Only the kill matters.'
  },
  {
    id: 'gr_011', name: 'Aegis Shield', type: CARD_TYPES.GEAR, team: TEAMS.FORTRESS,
    rarity: RARITIES.LEGENDARY, cost: 4, attack: 0, defense: 3, power: 4, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Equip: +3 DEF. Ward and Reflect: Cannot be targeted by spells. Returns incoming damage to attacker.',
    icon: '✨', desc: 'The legendary shield of the first Fortress Commander. It has never been broken.'
  },
  {
    id: 'gr_012', name: 'Titan Mail', type: CARD_TYPES.GEAR, team: TEAMS.TITANBORN,
    rarity: RARITIES.LEGENDARY, cost: 4, attack: 0, defense: 2, power: 4, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Equip: +2 DEF. Immortal: Returns to the field once with half HP when destroyed.',
    icon: '🪖', desc: 'Forged in the heart of a dead volcano. It refuses to let its wearer fall.'
  },
  {
    id: 'gr_013', name: 'Echo Orb', type: CARD_TYPES.GEAR, team: TEAMS.SYNERGY,
    rarity: RARITIES.EPIC, cost: 3, attack: 1, defense: 1, power: 3, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Equip: +1 ATK /+1 DEF. Echo: Copies the last spell cast when it attacks.',
    icon: '🔮', desc: 'A resonant crystal that repeats the echoes of past magic.'
  },

  // === ACTION CARDS (Tactical abilities) ===
  {
    id: 'ac_001', name: 'Data Spike', type: CARD_TYPES.ACTION, team: TEAMS.CONTROL,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Silence: Disable all abilities of target enemy creature. Draw 1 card.',
    icon: '📌', desc: 'A malicious data package that crashes enemy combat routines.'
  },
  {
    id: 'ac_002', name: 'EMP Blast', type: CARD_TYPES.ACTION, team: TEAMS.CONTROL,
    rarity: RARITIES.RARE, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Silence all enemy creatures and deal 1 damage to each.',
    icon: '🌩️', desc: 'A localized electromagnetic pulse that fries every circuit on the field.'
  },
  {
    id: 'ac_003', name: 'Adrenaline Shot', type: CARD_TYPES.ACTION, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.COMMON, cost: 1, attack: 3, defense: 0, power: 1, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Target creature gains +3 ATK and Charge this turn.',
    icon: '💉', desc: 'A combat stimulant that turns any unit into a blur of violence.'
  },
  {
    id: 'ac_004', name: 'Sacrificial Pact', type: CARD_TYPES.ACTION, team: TEAMS.SYNTH_LEGENDS,
    rarity: RARITIES.UNCOMMON, cost: 1, attack: 0, defense: 0, power: 1, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Destroy one of your creatures. Draw 2 cards and gain 3 Power.',
    icon: '🕯️', desc: 'The old gods demand sacrifice. The worthy receive its reward.'
  },
  {
    id: 'ac_005', name: 'Dark Ritual', type: CARD_TYPES.ACTION, team: TEAMS.CHAOS,
    rarity: RARITIES.UNCOMMON, cost: 0, attack: 0, defense: 0, power: 0, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Lose 3 Base HP. Gain 5 Power.',
    icon: '🩸', desc: 'Pain for power. The oldest bargain in the synthverse.'
  },
  {
    id: 'ac_006', name: 'Mind Link', type: CARD_TYPES.ACTION, team: TEAMS.SYNERGY,
    rarity: RARITIES.RARE, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'All Link creatures gain Ward: cannot be targeted by enemy spells or abilities.',
    icon: '🧠', desc: 'The collective mind shields its every node simultaneously.'
  },
  {
    id: 'ac_007', name: 'Gold Rush', type: CARD_TYPES.ACTION, team: TEAMS.ECONOMY,
    rarity: RARITIES.COMMON, cost: 1, attack: 0, defense: 0, power: 1, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Gain 2 Power for each Structure you control.',
    icon: '💰', desc: 'The Economy Lords strip-mine their own infrastructure for quick cash.'
  },
  {
    id: 'ac_008', name: 'Tremor', type: CARD_TYPES.ACTION, team: TEAMS.TITANBORN,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Destroy all enemy Structures with HP less than 4.',
    icon: '🌋', desc: 'A seismic event that shakes fragile fortifications to dust.'
  },
  {
    id: 'ac_009', name: 'Flash Bang', type: CARD_TYPES.ACTION, team: TEAMS.CONTROL,
    rarity: RARITIES.COMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'All enemy creatures lose Charge and cannot attack this turn.',
    icon: '💥', desc: 'A blinding flash that disorients every enemy on the field.'
  },
  {
    id: 'ac_010', name: 'Blood Offering', type: CARD_TYPES.ACTION, team: TEAMS.CHAOS,
    rarity: RARITIES.RARE, cost: 0, attack: 0, defense: 0, power: 0, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Destroy your weakest creature. Deal its ATK to enemy Base.',
    icon: '🩸', desc: 'The Chaos Cult turns weakness into a weapon of last resort.'
  },
  {
    id: 'ac_011', name: 'Gravity Well', type: CARD_TYPES.ACTION, team: TEAMS.CONTROL,
    rarity: RARITIES.EPIC, cost: 4, attack: 0, defense: 0, power: 4, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Return all enemy creatures with cost less than 3 to their owner\'s hand.',
    icon: '🌀', desc: 'A localized singularity that drags light units back to where they came from.'
  },
  {
    id: 'ac_012', name: 'Time Dilation', type: CARD_TYPES.ACTION, team: TEAMS.CONTROL,
    rarity: RARITIES.LEGENDARY, cost: 5, attack: 0, defense: 0, power: 5, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Enemy skips their next Bank Phase. They cannot generate power next turn.',
    icon: '⏳', desc: 'For everyone else, time crawls. For you, it is business as usual.'
  },

  // === CONSPIRACY CARDS (Hidden plots) ===
  {
    id: 'cp_001', name: 'Smokescreen', type: CARD_TYPES.CONSPIRACY, team: TEAMS.SYNERGY,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Stealth: Your creatures cannot be targeted until they attack. Lasts 1 turn.',
    icon: '💨', desc: 'A thick fog of synthetic smoke that hides the network\'s intentions.'
  },
  {
    id: 'cp_002', name: 'False Flag', type: CARD_TYPES.CONSPIRACY, team: TEAMS.CONTROL,
    rarity: RARITIES.RARE, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Target enemy creature attacks its own Base on its next turn.',
    icon: '🚩', desc: 'A perfectly staged provocation. The enemy fights itself.'
  },
  {
    id: 'cp_003', name: 'Holo Decoy', type: CARD_TYPES.CONSPIRACY, team: TEAMS.ECONOMY,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Redirect the next enemy attack to a decoy. Decoy takes 0 damage.',
    icon: '🎭', desc: 'A holographic clone so convincing even sensors believe it.'
  },
  {
    id: 'cp_004', name: 'Shadow Network', type: CARD_TYPES.CONSPIRACY, team: TEAMS.CONTROL,
    rarity: RARITIES.EPIC, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Reveal enemy hand. Copy 1 enemy card and add it to your hand.',
    icon: '🕸️', desc: 'An underground intelligence ring that steals from the shadows.'
  },
  {
    id: 'cp_005', name: 'Misdirection', type: CARD_TYPES.CONSPIRACY, team: TEAMS.CHAOS,
    rarity: RARITIES.RARE, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Swap target enemy creature with a random other enemy creature on the field.',
    icon: '🔀', desc: 'Nobody is where they thought they were. Perfect chaos.'
  },

  // === NEW CARDS (40) ===

  // 1. Marauder
  {
    id: 'oc_011', name: 'Marauder', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.RARE, cost: 4, attack: 5, defense: 2, power: 4, production: 0,
    speed: 5, health: 2, range: 1, comboId: 'rush',
    ability: 'Pierce: Ignores DEF. Charge.',
    icon: '🗡️', desc: 'A ruthless raider that cuts through defenses without pause.'
  },
  // 2. Blade Master
  {
    id: 'oc_012', name: 'Blade Master', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.EPIC, cost: 5, attack: 6, defense: 3, power: 5, production: 0,
    speed: 5, health: 3, range: 1, comboId: 'rush',
    ability: 'Barrage: Attacks all enemy creatures. Surge: Doubles ATK first attack',
    icon: '⚔️', desc: 'A whirlwind of steel that strikes every foe at once.'
  },
  // 3. Storm Caller
  {
    id: 'oc_013', name: 'Storm Caller', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 3, defense: 2, power: 3, production: 0,
    speed: 5, health: 2, range: 1, comboId: 'rush',
    ability: 'When played: Deal 2 damage to enemy base if you have 3+ Overcharger creatures',
    icon: '🌩️', desc: 'Calls down the storm when enough allies surge beside it.'
  },
  // 4. Aegis Bearer
  {
    id: 'fr_013', name: 'Aegis Bearer', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.RARE, cost: 4, attack: 2, defense: 6, power: 4, production: 0,
    speed: 5, health: 6, range: 1, comboId: 'wall',
    ability: 'Ward: Absorbs next damage. Shield: Halves next attack. Taunt',
    icon: '🛡️', desc: 'Bearer of the aegis, standing between allies and oblivion.'
  },
  // 5. Stone Warden
  {
    id: 'fr_014', name: 'Stone Warden', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.EPIC, cost: 6, attack: 4, defense: 8, power: 6, production: 0,
    speed: 5, health: 8, range: 1, comboId: 'wall',
    ability: 'Thorns: 1 counter damage. Regenerate: Heal 2 HP/turn. Immortal: Survives at 1 HP once',
    icon: '🗿', desc: 'An unyielding guardian carved from living rock.'
  },
  // 6. Sanctuary Guardian
  {
    id: 'fr_015', name: 'Sanctuary Guardian', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.LEGENDARY, cost: 7, attack: 5, defense: 10, power: 7, production: 0,
    speed: 5, health: 10, range: 1, comboId: 'wall',
    ability: 'All allied structures gain Ward. Adjacent creatures gain Shield. Taunt',
    icon: '🏰', desc: 'The living shield of the Sanctuary, protector of all within.'
  },
  // 7. Mind Flayer
  {
    id: 'ct_013', name: 'Mind Flayer', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL,
    rarity: RARITIES.EPIC, cost: 5, attack: 4, defense: 4, power: 5, production: 0,
    speed: 5, health: 4, range: 1, comboId: 'drain',
    ability: 'Silence: Removes abilities from target creature. Lifesteal',
    icon: '🧠', desc: 'It devoured the will of its foes, stealing their strength.'
  },
  // 8. Temporal Mage
  {
    id: 'ct_014', name: 'Temporal Mage', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL,
    rarity: RARITIES.LEGENDARY, cost: 6, attack: 5, defense: 5, power: 6, production: 0,
    speed: 5, health: 5, range: 1, comboId: 'drain',
    ability: 'When played: Enemy skips next main phase. Reflect: Returns 50% damage',
    icon: '⏳', desc: 'A master of time that steals moments from enemies.'
  },
  // 9. Siren
  {
    id: 'ct_015', name: 'Siren', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 2, defense: 3, power: 3, production: 0,
    speed: 5, health: 3, range: 1, comboId: 'drain',
    ability: 'When played: Silence all enemy creatures with cost < 4',
    icon: '🎤', desc: 'Her song silences lesser minds and strips them of power.'
  },
  // 10. Synth Hacker
  {
    id: 'ct_016', name: 'Synth Hacker', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL,
    rarity: RARITIES.COMMON, cost: 2, attack: 1, defense: 2, power: 2, production: 0,
    speed: 5, health: 2, range: 1, comboId: 'drain',
    ability: 'When played: Look at top 3 cards of enemy deck, discard 1',
    icon: '💻', desc: 'A digital thief that plucks secrets from enemy datastreams.'
  },
  // 11. Resonance Chamber
  {
    id: 'sy_013', name: 'Resonance Chamber', type: CARD_TYPES.STRUCTURE, team: TEAMS.SYNERGY,
    rarity: RARITIES.RARE, cost: 4, attack: 0, defense: 0, power: 4, production: 0,
    speed: 0, health: 5, range: 0, comboId: 'link',
    ability: 'All Link creatures gain Reflect and Thorns',
    icon: '📡', desc: 'A harmonic lattice that turns synergy into a weapon.'
  },
  // 12. Mutation Lab
  {
    id: 'ch_013', name: 'Mutation Lab', type: CARD_TYPES.STRUCTURE, team: TEAMS.CHAOS,
    rarity: RARITIES.EPIC, cost: 4, attack: 0, defense: 0, power: 4, production: 0,
    speed: 0, health: 5, range: 0, comboId: 'chaos',
    ability: 'At start of turn: Random allied creature gains a random keyword',
    icon: '🧬', desc: 'Where chaos breeds evolution, one mutation at a time.'
  },
  // 13. Plasma Cannon
  {
    id: 'oc_014', name: 'Plasma Cannon', type: CARD_TYPES.STRUCTURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.RARE, cost: 5, attack: 3, defense: 0, power: 5, production: 0,
    speed: 0, health: 4, range: 0, comboId: 'rush',
    ability: 'Can attack: Deals 3 damage to enemy base or creature. Demolish: Double damage to structures',
    icon: '💥', desc: 'A directed-energy emplacement that melts anything it hits.'
  },
  // 14. Mega Reactor
  {
    id: 'ec_013', name: 'Mega Reactor', type: CARD_TYPES.STRUCTURE, team: TEAMS.ECONOMY,
    rarity: RARITIES.EPIC, cost: 6, attack: 0, defense: 0, power: 6, production: 3,
    speed: 0, health: 8, range: 0, comboId: 'gold',
    ability: 'Generates +3 Power/turn. When destroyed: Deal 3 damage to all creatures',
    icon: '🏭', desc: 'A colossal power plant that explodes catastrophically when breached.'
  },
  // 15. Shield Generator
  {
    id: 'fr_016', name: 'Shield Generator', type: CARD_TYPES.STRUCTURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.EPIC, cost: 5, attack: 0, defense: 5, power: 5, production: 0,
    speed: 0, health: 8, range: 0, comboId: 'wall',
    ability: 'All allied creatures gain Ward. When destroyed: All allies gain Shield',
    icon: '🔋', desc: 'A field projector that blankets allies in protective energy.'
  },
  // 16. Siege Engine
  {
    id: 'tb_006', name: 'Siege Engine', type: CARD_TYPES.CREATURE, team: TEAMS.TITANBORN,
    rarity: RARITIES.EPIC, cost: 6, attack: 7, defense: 6, power: 6, production: 0,
    speed: 5, health: 6, range: 1, comboId: 'titan',
    ability: 'Demolish: Double damage to structures. Pierce: Ignores DEF',
    icon: '🏰', desc: 'A titan war machine built to topple any fortification.'
  },
  // 17. Gravity Manipulator
  {
    id: 'ct_017', name: 'Gravity Manipulator', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL,
    rarity: RARITIES.LEGENDARY, cost: 7, attack: 6, defense: 6, power: 7, production: 0,
    speed: 5, health: 6, range: 1, comboId: 'drain',
    ability: 'When played: Return all enemy creatures to their owner hand. They cost +2 next turn',
    icon: '🌀', desc: 'It bends the fabric of space, sending foes back whence they came.'
  },
  // 18. Ancient Construct
  {
    id: 'sl_006', name: 'Ancient Construct', type: CARD_TYPES.CREATURE, team: TEAMS.SYNTH_LEGENDS,
    rarity: RARITIES.LEGENDARY, cost: 8, attack: 8, defense: 8, power: 8, production: 0,
    speed: 5, health: 8, range: 1, comboId: 'legend',
    ability: 'Ward. Reflect. Immortal. Cannot be targeted by enemy spells',
    icon: '🗿', desc: 'A relic of a forgotten age, impervious to mortal magic.'
  },
  // 19. Apocalypse Engine
  {
    id: 'ch_014', name: 'Apocalypse Engine', type: CARD_TYPES.CREATURE, team: TEAMS.CHAOS,
    rarity: RARITIES.LEGENDARY, cost: 9, attack: 10, defense: 5, power: 9, production: 0,
    speed: 5, health: 5, range: 1, comboId: 'chaos',
    ability: 'Barrage. Pierce. When played: Deal 5 damage to ALL other creatures. Lifesteal',
    icon: '☢️', desc: 'An engine of pure annihilation that ends everything it touches.'
  },
  // 20. The Collector
  {
    id: 'ec_014', name: 'The Collector', type: CARD_TYPES.CREATURE, team: TEAMS.ECONOMY,
    rarity: RARITIES.LEGENDARY, cost: 8, attack: 7, defense: 7, power: 8, production: 0,
    speed: 5, health: 7, range: 1, comboId: 'gold',
    ability: 'When played: Steal the strongest enemy creature. Steal 2 Power',
    icon: '💰', desc: 'It acquires everything — creatures, power, and pride.'
  },
  // 21. Energy Vampire
  {
    id: 'ct_018', name: 'Energy Vampire', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 2, defense: 3, power: 3, production: 0,
    speed: 5, health: 3, range: 1, comboId: 'drain',
    ability: 'Lifesteal. When played: Enemy loses 2 Power, you gain 2 Power',
    icon: '🦇', desc: 'It drains energy from foes, growing stronger as they weaken.'
  },
  // 22. Nanite Swarm
  {
    id: 'ch_015', name: 'Nanite Swarm', type: CARD_TYPES.CREATURE, team: TEAMS.CHAOS,
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 1, defense: 1, power: 2, production: 0,
    speed: 5, health: 1, range: 1, comboId: 'chaos',
    ability: 'Poison: Deals 1 damage per turn. When destroyed: Spread poison to adjacent enemy',
    icon: '🐜', desc: 'A relentless cloud of microscopic machines that consumes all.'
  },
  // 23. Gladiator
  {
    id: 'oc_015', name: 'Gladiator', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 4, defense: 2, power: 3, production: 0,
    speed: 5, health: 2, range: 1, comboId: 'rush',
    ability: 'Enrage: +3 ATK when below 50% HP. Fortify: +1/+1 if survives combat',
    icon: '⚔️', desc: 'The arena forged it; pain only makes it deadlier.'
  },
  // 24. Duelist
  {
    id: 'sy_014', name: 'Duelist', type: CARD_TYPES.CREATURE, team: TEAMS.SYNERGY,
    rarity: RARITIES.COMMON, cost: 2, attack: 3, defense: 1, power: 2, production: 0,
    speed: 5, health: 1, range: 1, comboId: 'link',
    ability: 'Pierce. When another Link creature enters: Gain +1 ATK',
    icon: '🗡️', desc: 'A swift blade that grows sharper with every ally at its side.'
  },
  // 25. Iron Sentinel
  {
    id: 'fr_017', name: 'Iron Sentinel', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.RARE, cost: 4, attack: 1, defense: 7, power: 4, production: 0,
    speed: 5, health: 7, range: 1, comboId: 'wall',
    ability: 'Taunt. Thorns: 2 counter damage. Cannot attack',
    icon: '🤖', desc: 'An immovable sentinel that punishes any who dare strike it.'
  },
  // 26. Wraith
  {
    id: 'ct_019', name: 'Wraith', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL,
    rarity: RARITIES.RARE, cost: 4, attack: 5, defense: 2, power: 4, production: 0,
    speed: 5, health: 2, range: 1, comboId: 'drain',
    ability: 'Stealth: Cannot be targeted until it attacks. Pierce',
    icon: '👻', desc: 'A ghost that strikes from nowhere, then vanishes again.'
  },
  // 27. Catalyst Mage
  {
    id: 'sy_015', name: 'Catalyst Mage', type: CARD_TYPES.CREATURE, team: TEAMS.SYNERGY,
    rarity: RARITIES.EPIC, cost: 5, attack: 3, defense: 4, power: 5, production: 0,
    speed: 5, health: 4, range: 1, comboId: 'link',
    ability: 'Catalyst: Gains +2/+2 if another Synergy creature is on field. Lifesteal',
    icon: '✨', desc: 'A spark that ignites when the bonds of synergy surround it.'
  },
  // 28. Golden Golem
  {
    id: 'ec_015', name: 'Golden Golem', type: CARD_TYPES.CREATURE, team: TEAMS.ECONOMY,
    rarity: RARITIES.EPIC, cost: 6, attack: 5, defense: 7, power: 6, production: 2,
    speed: 5, health: 7, range: 1, comboId: 'gold',
    ability: 'Immortal. When destroyed: Opponent gains 4 Power',
    icon: '🪙', desc: 'A construct of pure wealth that enriches whoever fells it.'
  },
  // 29. Berserk Engine
  {
    id: 'ch_016', name: 'Berserk Engine', type: CARD_TYPES.CREATURE, team: TEAMS.CHAOS,
    rarity: RARITIES.RARE, cost: 4, attack: 5, defense: 1, power: 4, production: 0,
    speed: 5, health: 1, range: 1, comboId: 'chaos',
    ability: 'Enrage: +4 ATK below 50% HP. Reckless: Must attack each turn',
    icon: '😤', desc: 'A machine that knows only rage and the thrill of destruction.'
  },
  // 30. Colossus of Deep
  {
    id: 'tb_007', name: 'Colossus of Deep', type: CARD_TYPES.CREATURE, team: TEAMS.TITANBORN,
    rarity: RARITIES.LEGENDARY, cost: 8, attack: 9, defense: 9, power: 8, production: 0,
    speed: 5, health: 9, range: 1, comboId: 'titan',
    ability: 'Immortal. Fortify. Demolish. Taunt. Cannot be targeted by spells',
    icon: '🌊', desc: 'A titan risen from the abyss, immune to mortal meddling.'
  },
  // 31. Phantom Assassin
  {
    id: 'ct_020', name: 'Phantom Assassin', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 4, defense: 1, power: 3, production: 0,
    speed: 5, health: 1, range: 1, comboId: 'drain',
    ability: 'Stealth. Pierce. When it attacks the base: Deal double damage',
    icon: '🥷', desc: 'A shadow that strikes the heart of the enemy unbidden.'
  },
  // 32. War Drummer
  {
    id: 'oc_016', name: 'War Drummer', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.COMMON, cost: 2, attack: 1, defense: 2, power: 2, production: 0,
    speed: 5, health: 2, range: 1, comboId: 'rush',
    ability: 'When played: All Overcharger creatures gain Charge',
    icon: '🥁', desc: 'Its beat drives every Overcharger into a furious charge.'
  },
  // 33. Living Fortress
  {
    id: 'fr_018', name: 'Living Fortress', type: CARD_TYPES.STRUCTURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.RARE, cost: 5, attack: 0, defense: 8, power: 5, production: 0,
    speed: 0, health: 10, range: 0, comboId: 'wall',
    ability: 'Absorbs all base damage. Regenerate: Heal 2 HP/turn. Taunt',
    icon: '🏯', desc: 'A structure that becomes the wall itself, healing as it stands.'
  },
  // 34. Dark Portal
  {
    id: 'ch_017', name: 'Dark Portal', type: CARD_TYPES.STRUCTURE, team: TEAMS.CHAOS,
    rarity: RARITIES.EPIC, cost: 4, attack: 0, defense: 0, power: 4, production: 0,
    speed: 0, health: 6, range: 0, comboId: 'chaos',
    ability: 'At start of turn: 30% chance to destroy a random enemy creature. 30% chance to destroy a random ally',
    icon: '🌑', desc: 'A rift to nowhere, indiscriminately consuming the unworthy.'
  },
  // 35. Time Vault
  {
    id: 'sl_007', name: 'Time Vault', type: CARD_TYPES.STRUCTURE, team: TEAMS.SYNTH_LEGENDS,
    rarity: RARITIES.LEGENDARY, cost: 6, attack: 0, defense: 0, power: 6, production: 1,
    speed: 0, health: 8, range: 0, comboId: 'legend',
    ability: 'Ward. At start of turn: You gain 1 extra mana. Cannot be destroyed by spells',
    icon: '🕰️', desc: 'A vault outside time that grants an extra moment each dawn.'
  },
  // 36. Shield Maiden
  {
    id: 'fr_019', name: 'Shield Maiden', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.COMMON, cost: 2, attack: 2, defense: 3, power: 2, production: 0,
    speed: 5, health: 3, range: 1, comboId: 'wall',
    ability: 'Shield. Cover: Protects adjacent allies',
    icon: '🛡️', desc: 'A steadfast warrior whose shield guards those beside her.'
  },
  // 37. Blood Mage
  {
    id: 'ch_018', name: 'Blood Mage', type: CARD_TYPES.CREATURE, team: TEAMS.CHAOS,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 3, defense: 2, power: 3, production: 0,
    speed: 5, health: 2, range: 1, comboId: 'chaos',
    ability: 'Lifesteal. When played: Lose 2 HP, draw 1 card',
    icon: '🩸', desc: 'Power born of pain — its own and others.'
  },
  // 38. Iron Maiden
  {
    id: 'fr_020', name: 'Iron Maiden', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.RARE, cost: 4, attack: 2, defense: 5, power: 4, production: 0,
    speed: 5, health: 5, range: 1, comboId: 'wall',
    ability: 'Thorns: 3 counter damage. Reflect: Returns 50% damage',
    icon: '⛓️', desc: 'A spiked prison that turns every blow back upon the attacker.'
  },
  // 39. Lightning Rod
  {
    id: 'ct_021', name: 'Lightning Rod', type: CARD_TYPES.STRUCTURE, team: TEAMS.CONTROL,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 3, power: 3, production: 0,
    speed: 0, health: 4, range: 0, comboId: 'drain',
    ability: 'When you cast a spell: Deal 2 damage to a random enemy creature',
    icon: '⚡', desc: 'A conductor that channels spell energy into enemy ranks.'
  },
  // 40. Enrage Totem
  {
    id: 'oc_017', name: 'Enrage Totem', type: CARD_TYPES.STRUCTURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 2, power: 3, production: 0,
    speed: 0, health: 4, range: 0, comboId: 'rush',
    ability: 'All Overcharger creatures gain Enrage: +2 ATK below 50% HP',
    icon: '🔥', desc: 'A totem burning with fury that ignites the rage of all allies.'
  },

  // === NEW SYNTH LEGENDS EXPANSION ===
  // sl_008: Rare creature with Lifesteal
  {
    id: 'sl_008', name: 'Synth Reaver', type: CARD_TYPES.CREATURE, team: TEAMS.SYNTH_LEGENDS,
    rarity: RARITIES.RARE, cost: 4, attack: 5, defense: 3, power: 4, production: 0,
    speed: 5, health: 4, range: 1, comboId: 'legend',
    ability: 'Lifesteal: Heals its controller for damage equal to ATK. Pierce: Ignores all defense.',
    icon: '🌑', desc: 'A corrupted echo of the first Synths, it feeds on the essence of the living.'
  },
  // sl_009: Epic creature with Ward
  {
    id: 'sl_009', name: 'Aether Warden', type: CARD_TYPES.CREATURE, team: TEAMS.SYNTH_LEGENDS,
    rarity: RARITIES.EPIC, cost: 5, attack: 5, defense: 6, power: 5, production: 0,
    speed: 3, health: 6, range: 1, comboId: 'legend',
    ability: 'Ward: Cannot be targeted by enemy spells or abilities. Reduces all incoming damage by 1.',
    icon: '🔵', desc: 'Shielded by the pure code of the original Synthwave, no spell can touch it.'
  },
  // sl_010: Legendary structure that generates power and heals
  {
    id: 'sl_010', name: 'Genesis Spire', type: CARD_TYPES.STRUCTURE, team: TEAMS.SYNTH_LEGENDS,
    rarity: RARITIES.LEGENDARY, cost: 6, attack: 0, defense: 0, power: 6, production: 2,
    speed: 0, health: 6, range: 0, comboId: 'legend',
    ability: 'At the start of your turn: Generate +2 Power and restore 3 HP to all allied creatures.',
    icon: '🏛️', desc: 'The first structure ever built in Synthtopia. It still hums with creation energy.'
  },

  // === NEW TITANBORN EXPANSION ===
  // tb_008: Uncommon creature with Demolish
  {
    id: 'tb_008', name: 'Crag Smasher', type: CARD_TYPES.CREATURE, team: TEAMS.TITANBORN,
    rarity: RARITIES.UNCOMMON, cost: 4, attack: 5, defense: 4, power: 4, production: 0,
    speed: 2, health: 5, range: 1, comboId: 'titan',
    ability: 'Demolish: Deals double damage to Structures. Structures cannot block this creature.',
    icon: '🪨', desc: 'Born to shatter walls. No fortification has ever slowed it down.'
  },
  // tb_009: Rare creature with Taunt + Regenerate
  {
    id: 'tb_009', name: 'Bastion Titan', type: CARD_TYPES.CREATURE, team: TEAMS.TITANBORN,
    rarity: RARITIES.RARE, cost: 5, attack: 3, defense: 8, power: 5, production: 0,
    speed: 1, health: 8, range: 1, comboId: 'titan',
    ability: 'Taunt: Enemies must attack this creature if able. Regenerate: Restores 2 HP at the start of each turn.',
    icon: '⛰️', desc: 'A living mountain that stands between its allies and annihilation.'
  },
  // tb_010: Epic spell that summons a Titan token
  {
    id: 'tb_010', name: 'Colossus Rise', type: CARD_TYPES.SPELL, team: TEAMS.TITANBORN,
    rarity: RARITIES.EPIC, cost: 5, attack: 0, defense: 0, power: 5, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Summon a 6/6 Titan token with Taunt and Demolish.',
    icon: '🌋', desc: 'The deep earth splits open and something ancient climbs out.'
  },

  // === NEW NEUTRAL EXPANSION ===
  // nt_011: Common creature
  {
    id: 'nt_011', name: 'Scrap Scavenger', type: CARD_TYPES.CREATURE, team: null,
    rarity: RARITIES.COMMON, cost: 2, attack: 2, defense: 2, power: 2, production: 0,
    speed: 4, health: 3, range: 1, comboId: null,
    ability: 'Harvest: When played, gain 1 Power if you have less than 3 Power.',
    icon: '🔧', desc: 'Picking through the wreckage of the Neo-Cities for anything useful.'
  },
  // nt_012: Uncommon spell that draws 2 cards
  {
    id: 'nt_012', name: 'Data Cache', type: CARD_TYPES.SPELL, team: null,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Draw 2 cards.',
    icon: '💾', desc: 'A forgotten data vault packed with tactical intel from the first Synthwar.'
  },
  // nt_013: Rare structure with production
  {
    id: 'nt_013', name: 'Energy Pylon', type: CARD_TYPES.STRUCTURE, team: null,
    rarity: RARITIES.RARE, cost: 4, attack: 0, defense: 3, power: 4, production: 2,
    speed: 0, health: 5, range: 0, comboId: null,
    ability: 'Generate +2 Power each turn. Adjacent creatures gain +1 DEF.',
    icon: '🗼', desc: 'A beacon of stored energy that lights up the synthverse.'
  },
  // nt_014: Epic gear card
  {
    id: 'nt_014', name: 'Phase Modulator', type: CARD_TYPES.GEAR, team: null,
    rarity: RARITIES.EPIC, cost: 3, attack: 1, defense: 1, power: 3, production: 0,
    speed: 0, health: 0, range: 0,
    ability: 'Equip: +1 ATK /+1 DEF. Phase: Equipped creature cannot be targeted by enemy spells for one turn after being played.',
    icon: '🌀', desc: 'A device that shifts its wearer slightly out of phase with reality.'
  },

  // === SHIELD / BUFF MECHANICS CARDS ===
  // sh_001: Overchargers shield card
  {
    id: 'sh_001', name: 'Storm Shielder', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 3, defense: 3, power: 3, production: 0,
    speed: 5, health: 3, range: 1, comboId: 'rush',
    ability: 'When played: Gain shield equal to its DEF. Adjacent allies gain +1 ATK while shield holds.',
    icon: '⚡', desc: 'A living lightning rod that turns defensive energy into offensive power.'
  },
  // sh_002: Fortress shield card
  {
    id: 'sh_002', name: 'Aegis Construct', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.RARE, cost: 4, attack: 1, defense: 6, power: 4, production: 0,
    speed: 2, health: 6, range: 1, comboId: 'wall',
    ability: 'Shield: Absorbs the next 4 damage. When shield breaks, buff all allies with +2 DEF.',
    icon: '🛡️', desc: 'A walking bulwark that shares its protection when it finally falls.'
  },
  // sh_003: Control shield card
  {
    id: 'sh_003', name: 'Grid Sentinel', type: CARD_TYPES.STRUCTURE, team: TEAMS.CONTROL,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 2, power: 3, production: 0,
    speed: 0, health: 4, range: 0, comboId: 'drain',
    ability: 'Shield: Gains shield 3. While shielded, Silence all enemy abilities targeting adjacent allies.',
    icon: '🔒', desc: 'A defensive subroutine that locks down incoming threats before they land.'
  },
  // sh_004: Synergy shield card
  {
    id: 'sh_004', name: 'Resonant Bastion', type: CARD_TYPES.CREATURE, team: TEAMS.SYNERGY,
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 2, defense: 3, power: 3, production: 0,
    speed: 4, health: 4, range: 1, comboId: 'link',
    ability: 'Shield: Gains shield equal to the number of Link allies on field. Buffs all Link allies with +1 ATK.',
    icon: '🔗', desc: 'Its shield resonates stronger for every ally linked to the network.'
  },
  // sh_005: Economy shield card
  {
    id: 'sh_005', name: 'Gilded Bastion', type: CARD_TYPES.CREATURE, team: TEAMS.ECONOMY,
    rarity: RARITIES.RARE, cost: 4, attack: 2, defense: 5, power: 4, production: 1,
    speed: 2, health: 5, range: 1, comboId: 'gold',
    ability: 'Shield: Gains shield 3. Each turn, buff all allies with +1 DEF while this has shield.',
    icon: '💰', desc: 'Wealth made manifest as an impenetrable golden barrier.'
  },

  // === NEW MYTHIC CARDS (One per major team) ===
  // my_005: Overchargers mythic
  {
    id: 'my_005', name: 'The Stormbringer', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS,
    rarity: RARITIES.MYTHIC, cost: 9, attack: 9, defense: 5, power: 9, production: 0,
    speed: 8, health: 6, range: 2, comboId: 'mythic',
    ability: 'Charge. Overload: When it enters play, deal 3 damage to all enemy creatures and Structures. Pierce: Ignores all defense.',
    icon: '🌩️', desc: 'The avatar of the storm itself. Where it walks, the grid goes dark.'
  },
  // my_006: Fortress mythic
  {
    id: 'my_006', name: 'The Indomitable', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS,
    rarity: RARITIES.MYTHIC, cost: 10, attack: 4, defense: 14, power: 10, production: 0,
    speed: 1, health: 14, range: 1, comboId: 'mythic',
    ability: 'Taunt. Regenerate: Restores 3 HP each turn. Shield 5: Absorbs the next 5 damage. All adjacent allies gain +3 DEF and shield 2.',
    icon: '🗿', desc: 'The unbreakable spine of the Fortress Guild. It has never fallen.'
  },
  // my_007: Control mythic
  {
    id: 'my_007', name: 'The Overseer', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL,
    rarity: RARITIES.MYTHIC, cost: 8, attack: 4, defense: 6, power: 8, production: 0,
    speed: 3, health: 6, range: 2, comboId: 'mythic',
    ability: 'Silence: All enemy abilities are disabled. At the start of your turn, reveal the enemy hand and Silence one enemy creature permanently.',
    icon: '👁️', desc: 'The all-seeing intelligence that watches every Neo-City. Resistance is futile.'
  },
  // my_008: Synergy mythic
  {
    id: 'my_008', name: 'The Confluence', type: CARD_TYPES.CREATURE, team: TEAMS.SYNERGY,
    rarity: RARITIES.MYTHIC, cost: 8, attack: 5, defense: 5, power: 8, production: 1,
    speed: 4, health: 6, range: 2, comboId: 'mythic',
    ability: 'Resonance: Copies the abilities of all allied creatures. Cascade: Whenever an ally attacks, this attacks too. Buff all allies with +2/+2.',
    icon: '🌐', desc: 'Where all signals meet. It is every ally and none of them.'
  },
  // my_009: Economy mythic
  {
    id: 'my_009', name: 'The Monopoly', type: CARD_TYPES.STRUCTURE, team: TEAMS.ECONOMY,
    rarity: RARITIES.MYTHIC, cost: 9, attack: 0, defense: 6, power: 9, production: 4,
    speed: 0, health: 8, range: 0, comboId: 'mythic',
    ability: 'Generate +4 Power each turn. At the end of your turn, steal 2 Power from the enemy. All your cards cost -2 Power (min 1).',
    icon: '🏦', desc: 'The central bank of Synthtopia. All wealth flows through it, one way or another.'
  },

  // ============================================================
  // CHARACTER SIGNATURE CARDS (docs/CARDS.md §5) — 8 per Character, 72 total.
  // These carry a `character` lock in addition to their flavor `team` (Tribe) tag.
  // ============================================================

  // === SYNTHETIC (Chrome Silver #9fb4c7 🤖) — vanilla stat efficiency ===
  {
    id: 'syt_001', name: 'Drone Sentinel', type: CARD_TYPES.CREATURE, team: TEAMS.TITANBORN, character: 'Synthetic',
    rarity: RARITIES.COMMON, cost: 1, attack: 2, defense: 2, power: 1, production: 0,
    speed: 5, health: 2, range: 1, comboId: 'synthetic',
    ability: '',
    icon: '🤖', desc: 'Mass-produced infantry unit off the Star Beijing assembly line. No upgrades. None needed.'
  },
  {
    id: 'syt_002', name: 'Line Trooper', type: CARD_TYPES.CREATURE, team: TEAMS.TITANBORN, character: 'Synthetic',
    rarity: RARITIES.COMMON, cost: 2, attack: 4, defense: 3, power: 2, production: 0,
    speed: 5, health: 3, range: 1, comboId: 'synthetic',
    ability: '',
    icon: '🪖', desc: 'Standard-issue. The spec sheet is the whole pitch.'
  },
  {
    id: 'syt_003', name: 'Calibrated Marksman', type: CARD_TYPES.CREATURE, team: TEAMS.TITANBORN, character: 'Synthetic',
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 5, defense: 3, power: 3, production: 0,
    speed: 6, health: 3, range: 2, comboId: 'synthetic',
    ability: 'Precision: Ignores Stealth and Cover when choosing a target.',
    icon: '🎯', desc: 'Never misses. It isn’t skill, it’s tolerances.'
  },
  {
    id: 'syt_004', name: 'Efficiency Directive', type: CARD_TYPES.ACTION, team: TEAMS.TITANBORN, character: 'Synthetic',
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0, comboId: 'synthetic',
    ability: 'Reduce the Power cost of your next creature played this turn by 2 (min 1).',
    icon: '📋', desc: 'Paperwork that makes the war cheaper.'
  },
  {
    id: 'syt_005', name: 'Bulwark Unit', type: CARD_TYPES.CREATURE, team: TEAMS.TITANBORN, character: 'Synthetic',
    rarity: RARITIES.RARE, cost: 4, attack: 5, defense: 7, power: 4, production: 0,
    speed: 4, health: 7, range: 1, comboId: 'synthetic',
    ability: '',
    icon: '🛡️', desc: 'Reinforced chassis. Built to take the hit so the line behind it doesn’t have to.'
  },
  {
    id: 'syt_006', name: 'Assembly Line', type: CARD_TYPES.STRUCTURE, team: TEAMS.TITANBORN, character: 'Synthetic',
    rarity: RARITIES.RARE, cost: 5, attack: 0, defense: 0, power: 5, production: 1,
    speed: 0, health: 5, range: 0, comboId: 'synthetic',
    ability: 'Whenever you play a Synthetic creature, gain 1 Power this turn only.',
    icon: '🏭', desc: 'Another unit finishes every forty seconds, whether you’re ready or not.'
  },
  {
    id: 'syt_007', name: 'Apex Chassis', type: CARD_TYPES.CREATURE, team: TEAMS.TITANBORN, character: 'Synthetic',
    rarity: RARITIES.EPIC, cost: 6, attack: 9, defense: 8, power: 6, production: 0,
    speed: 5, health: 8, range: 1, comboId: 'synthetic',
    ability: 'Precision.',
    icon: '🦿', desc: 'The best body Star Beijing has ever stamped out.'
  },
  {
    id: 'syt_008', name: 'Prime Directive Warden', type: CARD_TYPES.CREATURE, team: TEAMS.TITANBORN, character: 'Synthetic',
    rarity: RARITIES.LEGENDARY, cost: 7, attack: 10, defense: 10, power: 7, production: 0,
    speed: 7, health: 10, range: 1, comboId: 'synthetic',
    ability: 'Precision. Immortal: Survives lethal damage at 1 HP once, then consumed.',
    icon: '👁️‍🗨️', desc: 'It has never once needed a second directive.'
  },

  // === MEMETIC (Glitch Fuchsia #f92aff 🦠) — replication & infection engine ===
  {
    id: 'mem_001', name: 'Meme Fragment', type: CARD_TYPES.CREATURE, team: TEAMS.CHAOS, character: 'Memetic',
    rarity: RARITIES.COMMON, cost: 1, attack: 1, defense: 1, power: 1, production: 0,
    speed: 6, health: 1, range: 1, comboId: 'memetic',
    ability: 'When this dies, create a copy of it if you control 2+ other Memetic cards.',
    icon: '🧩', desc: 'A single idea. Barely worth killing. That’s the point.'
  },
  {
    id: 'mem_002', name: 'Glitch Whisperer', type: CARD_TYPES.CREATURE, team: TEAMS.CHAOS, character: 'Memetic',
    rarity: RARITIES.COMMON, cost: 2, attack: 1, defense: 1, power: 2, production: 0,
    speed: 5, health: 2, range: 1, comboId: 'memetic',
    ability: 'Infect: deals 0 combat damage; Infects the defender instead of dealing damage.',
    icon: '📢', desc: 'Doesn’t hurt you. Convinces you to hurt yourself.'
  },
  {
    id: 'mem_003', name: 'Copycat Splicer', type: CARD_TYPES.CREATURE, team: TEAMS.CHAOS, character: 'Memetic',
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 2, defense: 1, power: 2, production: 0,
    speed: 5, health: 2, range: 1, comboId: 'memetic',
    ability: 'Replicate: on play, create a token copy of the cheapest Colorless creature you control (1/1 Meme Fragment if none).',
    icon: '🪞', desc: 'Looked at a Line Trooper once. Now there are two.'
  },
  {
    id: 'mem_004', name: 'Viral Payload', type: CARD_TYPES.SPELL, team: TEAMS.CHAOS, character: 'Memetic',
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0, comboId: 'memetic',
    ability: 'Infect all enemy creatures. Draw a card for each creature Infected this way (max 3).',
    icon: '🦠', desc: 'One packet. Every inbox.'
  },
  {
    id: 'mem_005', name: 'Idea Parasite', type: CARD_TYPES.CREATURE, team: TEAMS.CHAOS, character: 'Memetic',
    rarity: RARITIES.RARE, cost: 3, attack: 2, defense: 2, power: 3, production: 0,
    speed: 5, health: 3, range: 1, comboId: 'memetic',
    ability: 'Whenever an enemy creature dies while Infected, this gains +1/+1 permanently.',
    icon: '🪱', desc: 'Feeds on the argument it started.'
  },
  {
    id: 'mem_006', name: 'Echo Chamber', type: CARD_TYPES.STRUCTURE, team: TEAMS.CHAOS, character: 'Memetic',
    rarity: RARITIES.RARE, cost: 4, attack: 0, defense: 0, power: 4, production: 1,
    speed: 0, health: 4, range: 0, comboId: 'memetic',
    ability: 'Your Replicate triggers twice. Replicated Colorless creatures keep their printed abilities.',
    icon: '📡', desc: 'Say it once. Hear it forever.'
  },
  {
    id: 'mem_007', name: 'Signal Broadcaster', type: CARD_TYPES.CREATURE, team: TEAMS.CHAOS, character: 'Memetic',
    rarity: RARITIES.EPIC, cost: 5, attack: 3, defense: 3, power: 5, production: 0,
    speed: 6, health: 4, range: 2, comboId: 'memetic',
    ability: 'Replicate. Whenever you Replicate a creature, deal 1 damage to the enemy base.',
    icon: '📻', desc: 'Every copy chips the wall a little more.'
  },
  {
    id: 'mem_008', name: 'Patient Zero', type: CARD_TYPES.CREATURE, team: TEAMS.CHAOS, character: 'Memetic',
    rarity: RARITIES.LEGENDARY, cost: 6, attack: 4, defense: 3, power: 6, production: 0,
    speed: 6, health: 5, range: 1, comboId: 'memetic',
    ability: 'Infect spreads to ALL enemy creatures on the host’s death, not just one. Replicate copies the last creature that died this turn (either side) at 50% stats.',
    icon: '☣️', desc: 'Everything after this was inevitable.'
  },

  // === REFINIST (Refined Bronze #c9822e ⚗️) — sacrifice-to-grow, highest cost & stats ===
  {
    id: 'ref_001', name: 'Ore Sifter', type: CARD_TYPES.STRUCTURE, team: TEAMS.ECONOMY, character: 'Refinist',
    rarity: RARITIES.COMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 1,
    speed: 0, health: 3, range: 0, comboId: 'refinist',
    ability: 'Refine: at end of turn, convert 1 unused Mana into +1 permanent Production.',
    icon: '⛏️', desc: 'The first stage of the crucible. Nothing glamorous. Nothing wasted.'
  },
  {
    id: 'ref_002', name: 'Apprentice Alchemist', type: CARD_TYPES.CREATURE, team: TEAMS.ECONOMY, character: 'Refinist',
    rarity: RARITIES.COMMON, cost: 2, attack: 2, defense: 2, power: 2, production: 0,
    speed: 3, health: 2, range: 1, comboId: 'refinist',
    ability: 'Transmute: sacrifice a friendly Colorless creature to permanently gain its stats and reduce this card’s Power cost by its Cost.',
    icon: '🧪', desc: 'Learning the trade the hard way: on the field, with fodder.'
  },
  {
    id: 'ref_003', name: 'Crucible Adept', type: CARD_TYPES.CREATURE, team: TEAMS.ECONOMY, character: 'Refinist',
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 3, defense: 3, power: 3, production: 0,
    speed: 3, health: 3, range: 1, comboId: 'refinist',
    ability: 'Transmute.',
    icon: '🔥', desc: 'Knows exactly what a body is worth in raw material.'
  },
  {
    id: 'ref_004', name: 'Distillation Rite', type: CARD_TYPES.SPELL, team: TEAMS.ECONOMY, character: 'Refinist',
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0, comboId: 'refinist',
    ability: 'Sacrifice a friendly Colorless creature: gain Power equal to twice its Cost, this turn only.',
    icon: '⚗️', desc: 'Reduce, reduce, reduce, until only the useful part remains.'
  },
  {
    id: 'ref_005', name: 'Master Refiner', type: CARD_TYPES.CREATURE, team: TEAMS.ECONOMY, character: 'Refinist',
    rarity: RARITIES.RARE, cost: 4, attack: 4, defense: 5, power: 4, production: 0,
    speed: 3, health: 5, range: 1, comboId: 'refinist',
    ability: 'Transmute. Whenever this Transmutes, it also gains +1 Production permanently if you control a Structure.',
    icon: '🏺', desc: 'Turns bodies into better bodies, and better bodies into engines.'
  },
  {
    id: 'ref_006', name: 'The Great Forge', type: CARD_TYPES.STRUCTURE, team: TEAMS.ECONOMY, character: 'Refinist',
    rarity: RARITIES.RARE, cost: 5, attack: 0, defense: 0, power: 5, production: 2,
    speed: 0, health: 6, range: 0, comboId: 'refinist',
    ability: 'Refine. Your Transmute effects also heal your base 2 HP.',
    icon: '🏛️', desc: 'Odessa’s furnace never goes cold.'
  },
  {
    id: 'ref_007', name: 'Grand Transmuter', type: CARD_TYPES.CREATURE, team: TEAMS.ECONOMY, character: 'Refinist',
    rarity: RARITIES.EPIC, cost: 6, attack: 6, defense: 8, power: 6, production: 0,
    speed: 3, health: 8, range: 1, comboId: 'refinist',
    ability: 'Transmute — may sacrifice creatures that died this turn (yours or the opponent’s), not just ones you control.',
    icon: '🌋', desc: 'Doesn’t care whose corpse it is. Only what it’s worth.'
  },
  {
    id: 'ref_008', name: 'Philosopher’s Core', type: CARD_TYPES.CREATURE, team: TEAMS.ECONOMY, character: 'Refinist',
    rarity: RARITIES.LEGENDARY, cost: 8, attack: 10, defense: 12, power: 8, production: 0,
    speed: 2, health: 12, range: 1, comboId: 'refinist',
    ability: 'Transmute (no cost-reduction cap). Refine. On play, if you have 2+ creatures in your graveyard, auto-Transmutes with one of them for free.',
    icon: '💠', desc: 'The end state of the process. Everything before it was practice.'
  },

  // === TECHNOPRIEST (Ritual Crimson #b0203c 🕯️) — sacrifice-as-liturgy, graveyard payoff ===
  {
    id: 'tec_001', name: 'Acolyte of the Core', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL, character: 'Technopriest',
    rarity: RARITIES.COMMON, cost: 2, attack: 1, defense: 2, power: 2, production: 0,
    speed: 3, health: 2, range: 1, comboId: 'technopriest',
    ability: 'Devotion: +1/+1 permanently for each Technopriest card in your graveyard.',
    icon: '🕯️', desc: 'Recites the litany before every deployment. Means it, too.'
  },
  {
    id: 'tec_002', name: 'Censer Bearer', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL, character: 'Technopriest',
    rarity: RARITIES.COMMON, cost: 2, attack: 2, defense: 1, power: 2, production: 0,
    speed: 4, health: 2, range: 1, comboId: 'technopriest',
    ability: 'Sacrament: on play, may sacrifice a friendly creature for +2/+2 and an immediate ability trigger.',
    icon: '🪔', desc: 'Carries the fire that starts every rite.'
  },
  {
    id: 'tec_003', name: 'Rite of Ash', type: CARD_TYPES.SPELL, team: TEAMS.CONTROL, character: 'Technopriest',
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0, comboId: 'technopriest',
    ability: 'Sacrifice a friendly creature: deal damage equal to its HP to an enemy creature or the enemy base.',
    icon: '⚱️', desc: 'The last thing a body is good for is a very good last thing.'
  },
  {
    id: 'tec_004', name: 'Doctrine Enforcer', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL, character: 'Technopriest',
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 3, defense: 3, power: 3, production: 0,
    speed: 4, health: 3, range: 1, comboId: 'technopriest',
    ability: 'Sacrament. Devotion.',
    icon: '⛓️', desc: 'Doctrine isn’t optional. It has never once needed to explain why.'
  },
  {
    id: 'tec_005', name: 'Reliquary', type: CARD_TYPES.STRUCTURE, team: TEAMS.CONTROL, character: 'Technopriest',
    rarity: RARITIES.RARE, cost: 4, attack: 0, defense: 0, power: 4, production: 1,
    speed: 0, health: 5, range: 0, comboId: 'technopriest',
    ability: 'Whenever a Technopriest creature you control dies, gain 1 Power immediately.',
    icon: '⛪', desc: 'Every relic housed here used to be someone.'
  },
  {
    id: 'tec_006', name: 'High Inquisitor', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL, character: 'Technopriest',
    rarity: RARITIES.RARE, cost: 5, attack: 5, defense: 4, power: 5, production: 0,
    speed: 4, health: 5, range: 1, comboId: 'technopriest',
    ability: 'Sacrament. Devotion. If a sacrifice was made on play, Silence the strongest enemy creature.',
    icon: '🔺', desc: 'Asks one question. Doesn’t wait for the answer.'
  },
  {
    id: 'tec_007', name: 'The Cardinal Engine', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL, character: 'Technopriest',
    rarity: RARITIES.EPIC, cost: 6, attack: 6, defense: 6, power: 6, production: 0,
    speed: 4, health: 7, range: 1, comboId: 'technopriest',
    ability: 'Sacrament (may sacrifice up to 2 creatures). Devotion.',
    icon: '⚙️', desc: 'Part machine, part cathedral, entirely certain.'
  },
  {
    id: 'tec_008', name: 'Voice of the Machine God', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL, character: 'Technopriest',
    rarity: RARITIES.LEGENDARY, cost: 7, attack: 7, defense: 7, power: 7, production: 0,
    speed: 4, health: 8, range: 1, comboId: 'technopriest',
    ability: 'Devotion. Sacrament — sacrifice also deals its ATK to the enemy base. On play, if 3+ Technopriest cards are in your graveyard, resurrect one as a 1/1 token.',
    icon: '🗣️', desc: 'Every voice that came before it is still speaking, through it.'
  },

  // === CYBORG (Acid Lime #7cff2a 🦾) — cheapest curve, highest tempo ===
  {
    id: 'cyb_001', name: 'Scrap Runner', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS, character: 'Cyborg',
    rarity: RARITIES.COMMON, cost: 1, attack: 2, defense: 1, power: 1, production: 0,
    speed: 9, health: 1, range: 1, comboId: 'cyborg',
    ability: 'Charge: Can attack immediately when played.',
    icon: '🏃', desc: 'Built from three different vehicles and one very bad idea.'
  },
  {
    id: 'cyb_002', name: 'Piston Fist', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS, character: 'Cyborg',
    rarity: RARITIES.COMMON, cost: 1, attack: 3, defense: 1, power: 1, production: 0,
    speed: 8, health: 2, range: 1, comboId: 'cyborg',
    ability: 'Adrenaline: +1 ATK permanently whenever this deals damage directly to the enemy base.',
    icon: '👊', desc: 'Hits harder every time it connects with the wall behind you.'
  },
  {
    id: 'cyb_003', name: 'Redline Ganger', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS, character: 'Cyborg',
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 4, defense: 1, power: 2, production: 0,
    speed: 9, health: 2, range: 1, comboId: 'cyborg',
    ability: 'Charge. Overclock: may attack a 2nd time this turn; takes 1 self-damage after the extra attack.',
    icon: '🏍️', desc: 'Redlines on principle.'
  },
  {
    id: 'cyb_004', name: 'Nitro Injection', type: CARD_TYPES.SPELL, team: TEAMS.OVERCHARGERS, character: 'Cyborg',
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0, comboId: 'cyborg',
    ability: 'Give a creature Charge and +2 ATK this turn.',
    icon: '💉', desc: 'Illegal in five Neo-Cities. Standard issue in the other one.'
  },
  {
    id: 'cyb_005', name: 'Streetfight Champion', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS, character: 'Cyborg',
    rarity: RARITIES.RARE, cost: 3, attack: 5, defense: 2, power: 3, production: 0,
    speed: 8, health: 3, range: 1, comboId: 'cyborg',
    ability: 'Overclock. Adrenaline.',
    icon: '🥊', desc: 'Undefeated because nobody’s lasted long enough to score a win.'
  },
  {
    id: 'cyb_006', name: 'Junction Overload', type: CARD_TYPES.TRAP, team: TEAMS.OVERCHARGERS, character: 'Cyborg',
    rarity: RARITIES.RARE, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0, comboId: 'cyborg',
    ability: 'When an enemy creature attacks: it takes 3 damage and that player’s Power is reduced by 2 next turn.',
    icon: '⚡', desc: 'Wired straight into the grid, and straight into you.'
  },
  {
    id: 'cyb_007', name: 'Berserk Chassis', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS, character: 'Cyborg',
    rarity: RARITIES.EPIC, cost: 4, attack: 7, defense: 2, power: 4, production: 0,
    speed: 9, health: 4, range: 1, comboId: 'cyborg',
    ability: 'Charge. Overclock. Adrenaline.',
    icon: '🔩', desc: 'Every safety was stripped for parts. On purpose.'
  },
  {
    id: 'cyb_008', name: 'The Redline', type: CARD_TYPES.CREATURE, team: TEAMS.OVERCHARGERS, character: 'Cyborg',
    rarity: RARITIES.LEGENDARY, cost: 5, attack: 8, defense: 3, power: 5, production: 0,
    speed: 10, health: 5, range: 1, comboId: 'cyborg',
    ability: 'Charge. Overclock (up to a 3rd attack, 1 self-damage per extra attack). Adrenaline.',
    icon: '🚗', desc: 'You don’t out-think the Redline. You get run over by it.'
  },

  // === BIOPURE (Deep Jade #1f9e6e 🌱) — grindy healing/regen tank ===
  {
    id: 'bio_001', name: 'Seedling Warden', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS, character: 'Biopure',
    rarity: RARITIES.COMMON, cost: 2, attack: 1, defense: 4, power: 2, production: 0,
    speed: 2, health: 4, range: 1, comboId: 'biopure',
    ability: 'Regenerate: Heals 2 HP at the start of your turn.',
    icon: '🌾', desc: 'Roots deeper every season the war lasts.'
  },
  {
    id: 'bio_002', name: 'Rootbound Healer', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS, character: 'Biopure',
    rarity: RARITIES.COMMON, cost: 2, attack: 1, defense: 3, power: 2, production: 0,
    speed: 2, health: 3, range: 1, comboId: 'biopure',
    ability: 'Bloom: at the start of your turn, heal your base 1 HP for each Biopure creature you control.',
    icon: '🌿', desc: 'Heals the ground first. The soldiers benefit second.'
  },
  {
    id: 'bio_003', name: 'Mycelial Network', type: CARD_TYPES.STRUCTURE, team: TEAMS.FORTRESS, character: 'Biopure',
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 0, power: 3, production: 1,
    speed: 0, health: 5, range: 0, comboId: 'biopure',
    ability: 'Bloom. All Biopure creatures you control gain Regenerate.',
    icon: '🍄', desc: 'Underground, everything is already connected.'
  },
  {
    id: 'bio_004', name: 'Photosynthesis', type: CARD_TYPES.SPELL, team: TEAMS.FORTRESS, character: 'Biopure',
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0, comboId: 'biopure',
    ability: 'Heal all friendly creatures 3 HP and your base 3 HP.',
    icon: '☀️', desc: 'Lahore’s golden hour, called down early.'
  },
  {
    id: 'bio_005', name: 'Thornback Guardian', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS, character: 'Biopure',
    rarity: RARITIES.RARE, cost: 4, attack: 3, defense: 6, power: 4, production: 0,
    speed: 2, health: 6, range: 1, comboId: 'biopure',
    ability: 'Symbiosis: gains ATK/DEF equal to half an adjacent ally’s DEF, rounded down. Thorns.',
    icon: '🌵', desc: 'Leans on its neighbor. Bites anyone who leans on it.'
  },
  {
    id: 'bio_006', name: 'Elder Bloomtree', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS, character: 'Biopure',
    rarity: RARITIES.RARE, cost: 5, attack: 4, defense: 8, power: 5, production: 0,
    speed: 1, health: 8, range: 1, comboId: 'biopure',
    ability: 'Bloom. Regenerate.',
    icon: '🌳', desc: 'Older than the Neo-Cities. In no hurry to prove it.'
  },
  {
    id: 'bio_007', name: 'Verdant Colossus', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS, character: 'Biopure',
    rarity: RARITIES.EPIC, cost: 6, attack: 6, defense: 10, power: 6, production: 0,
    speed: 2, health: 10, range: 1, comboId: 'biopure',
    ability: 'Symbiosis. Regenerate. Bloom.',
    icon: '🦕', desc: 'What the last green ground grows when it’s finally angry.'
  },
  {
    id: 'bio_008', name: 'The World Root', type: CARD_TYPES.CREATURE, team: TEAMS.FORTRESS, character: 'Biopure',
    rarity: RARITIES.LEGENDARY, cost: 7, attack: 7, defense: 12, power: 7, production: 0,
    speed: 1, health: 12, range: 1, comboId: 'biopure',
    ability: 'Bloom (double healing). Regenerate. Symbiosis. Immortal.',
    icon: '🌲', desc: 'Every Biopure garden on the continent shares one root system. This is where it surfaces.'
  },

  // === ETHEREAL (Periwinkle #a48cff 👻) — fragile, reactive toolbox ===
  {
    id: 'eth_001', name: 'Flicker Wisp', type: CARD_TYPES.CREATURE, team: TEAMS.SYNTH_LEGENDS, character: 'Ethereal',
    rarity: RARITIES.COMMON, cost: 1, attack: 1, defense: 1, power: 1, production: 0,
    speed: 8, health: 1, range: 1, comboId: 'ethereal',
    ability: 'Drift: untargetable by enemy creature abilities until it attacks; free position-swap with another Ethereal, once/turn.',
    icon: '✨', desc: 'Barely committed to being here at all.'
  },
  {
    id: 'eth_002', name: 'Static Echo', type: CARD_TYPES.CREATURE, team: TEAMS.SYNTH_LEGENDS, character: 'Ethereal',
    rarity: RARITIES.COMMON, cost: 2, attack: 1, defense: 1, power: 2, production: 0,
    speed: 6, health: 2, range: 1, comboId: 'ethereal',
    ability: 'Manifest: may be played face-down as a 0/0 Ward token for 1 Power; flip later by paying the cost difference.',
    icon: '📺', desc: 'Was something else, once. Might be again.'
  },
  {
    id: 'eth_003', name: 'Phase Walker', type: CARD_TYPES.CREATURE, team: TEAMS.SYNTH_LEGENDS, character: 'Ethereal',
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 2, defense: 1, power: 2, production: 0,
    speed: 7, health: 2, range: 1, comboId: 'ethereal',
    ability: 'Drift. Phase: cannot be targeted by spells for one turn after being played.',
    icon: '🌫️', desc: 'Walks through the fog because it’s half made of it.'
  },
  {
    id: 'eth_004', name: 'Veil of Static', type: CARD_TYPES.SPELL, team: TEAMS.SYNTH_LEGENDS, character: 'Ethereal',
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0, comboId: 'ethereal',
    ability: 'Target friendly creature gains Drift and Ward until your next turn.',
    icon: '📼', desc: 'Interference, weaponized.'
  },
  {
    id: 'eth_005', name: 'Signal Ghost', type: CARD_TYPES.CREATURE, team: TEAMS.SYNTH_LEGENDS, character: 'Ethereal',
    rarity: RARITIES.RARE, cost: 3, attack: 2, defense: 2, power: 3, production: 0,
    speed: 7, health: 2, range: 2, comboId: 'ethereal',
    ability: 'Manifest. Drift.',
    icon: '👤', desc: 'You’ll see it after it’s already moved.'
  },
  {
    id: 'eth_006', name: 'Resonant Rift', type: CARD_TYPES.TRAP, team: TEAMS.SYNTH_LEGENDS, character: 'Ethereal',
    rarity: RARITIES.RARE, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0, comboId: 'ethereal',
    ability: 'When targeted by an enemy spell or ability: negate it, then Manifest a random Ethereal card from your hand for free.',
    icon: '🕳️', desc: 'London Reality’s fog has teeth, sometimes.'
  },
  {
    id: 'eth_007', name: 'Half-Light Sentinel', type: CARD_TYPES.CREATURE, team: TEAMS.SYNTH_LEGENDS, character: 'Ethereal',
    rarity: RARITIES.EPIC, cost: 4, attack: 3, defense: 3, power: 4, production: 0,
    speed: 7, health: 3, range: 1, comboId: 'ethereal',
    ability: 'Drift. Manifest. Ward.',
    icon: '🌘', desc: 'Guards the border between here and almost-here.'
  },
  {
    id: 'eth_008', name: 'The Unseen', type: CARD_TYPES.CREATURE, team: TEAMS.SYNTH_LEGENDS, character: 'Ethereal',
    rarity: RARITIES.LEGENDARY, cost: 5, attack: 4, defense: 3, power: 5, production: 0,
    speed: 8, health: 4, range: 1, comboId: 'ethereal',
    ability: 'Drift. Manifest. Stealth until it attacks. Ward.',
    icon: '👻', desc: 'By the time you’re sure it’s real, it already won.'
  },

  // === ORGANIZER (Indigo #2f6fed 🐝) — widest token/network decision tree ===
  {
    id: 'org_001', name: 'Worker Drone', type: CARD_TYPES.CREATURE, team: TEAMS.SYNERGY, character: 'Organizer',
    rarity: RARITIES.COMMON, cost: 1, attack: 1, defense: 1, power: 1, production: 0,
    speed: 4, health: 1, range: 1, comboId: 'organizer',
    ability: '',
    icon: '🐝', desc: 'The unit the whole strategy is built out of.'
  },
  {
    id: 'org_002', name: 'Cell Coordinator', type: CARD_TYPES.CREATURE, team: TEAMS.SYNERGY, character: 'Organizer',
    rarity: RARITIES.COMMON, cost: 2, attack: 1, defense: 2, power: 2, production: 0,
    speed: 4, health: 2, range: 1, comboId: 'organizer',
    ability: 'Deploy: on play, create 2 extra 0-cost 1/1 Worker tokens in open adjacent slots.',
    icon: '📎', desc: 'One coordinator, two more hands, immediately.'
  },
  {
    id: 'org_003', name: 'Logistics Node', type: CARD_TYPES.STRUCTURE, team: TEAMS.SYNERGY, character: 'Organizer',
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 1,
    speed: 0, health: 3, range: 0, comboId: 'organizer',
    ability: 'Network: +1 Production permanently whenever you play another Organizer card or a Colorless Structure.',
    icon: '📦', desc: 'Every shipment routes through here, eventually.'
  },
  {
    id: 'org_004', name: 'Mobilization Order', type: CARD_TYPES.SPELL, team: TEAMS.SYNERGY, character: 'Organizer',
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0, comboId: 'organizer',
    ability: 'Deploy twice (4 Worker tokens total, split across open slots).',
    icon: '📣', desc: 'The order goes out once. It executes everywhere.'
  },
  {
    id: 'org_005', name: 'Hive Overseer', type: CARD_TYPES.CREATURE, team: TEAMS.SYNERGY, character: 'Organizer',
    rarity: RARITIES.RARE, cost: 3, attack: 2, defense: 3, power: 3, production: 0,
    speed: 4, health: 3, range: 1, comboId: 'organizer',
    ability: 'Deploy. Whenever a Worker token you control dies, gain 1 Power.',
    icon: '🐝', desc: 'Counts every loss as a resource, not a tragedy.'
  },
  {
    id: 'org_006', name: 'Distribution Hub', type: CARD_TYPES.STRUCTURE, team: TEAMS.SYNERGY, character: 'Organizer',
    rarity: RARITIES.RARE, cost: 4, attack: 0, defense: 0, power: 4, production: 2,
    speed: 0, health: 4, range: 0, comboId: 'organizer',
    ability: 'Network. All Worker tokens you control gain +1/+1.',
    icon: '🏬', desc: 'Nothing here is idle for more than a shift.'
  },
  {
    id: 'org_007', name: 'The Swarm Mind', type: CARD_TYPES.CREATURE, team: TEAMS.SYNERGY, character: 'Organizer',
    rarity: RARITIES.EPIC, cost: 5, attack: 3, defense: 4, power: 5, production: 0,
    speed: 4, health: 4, range: 1, comboId: 'organizer',
    ability: 'Deploy (3 tokens). Network. While you control 5+ creatures, gains Taunt and +2/+2.',
    icon: '🧠', desc: 'No single node is in charge. That’s exactly the point.'
  },
  {
    id: 'org_008', name: 'Central Directive', type: CARD_TYPES.CREATURE, team: TEAMS.SYNERGY, character: 'Organizer',
    rarity: RARITIES.LEGENDARY, cost: 6, attack: 4, defense: 5, power: 6, production: 0,
    speed: 4, health: 5, range: 1, comboId: 'organizer',
    ability: 'Deploy (4 tokens; overflow fills the Base row as 0/1 if Battle Row is full). Network.',
    icon: '🗼', desc: 'One directive. A thousand hands to carry it out.'
  },

  // === SCHEMIST (Shadow Violet #4a1f5c ♟️) — ambush, theft, deception engine ===
  {
    id: 'sch_001', name: 'Cutpurse', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL, character: 'Schemist',
    rarity: RARITIES.COMMON, cost: 1, attack: 2, defense: 1, power: 1, production: 0,
    speed: 7, health: 1, range: 1, comboId: 'schemist',
    ability: 'Stealth.',
    icon: '🗡️', desc: 'You’ll notice the loss before you notice them.'
  },
  {
    id: 'sch_002', name: 'False Ledger', type: CARD_TYPES.TRAP, team: TEAMS.CONTROL, character: 'Schemist',
    rarity: RARITIES.COMMON, cost: 2, attack: 0, defense: 0, power: 2, production: 0,
    speed: 0, health: 0, range: 0, comboId: 'schemist',
    ability: 'Snare: deals 2 damage to the triggering creature.',
    icon: '📒', desc: 'The numbers were never real. The damage is.'
  },
  {
    id: 'sch_003', name: 'Double Agent', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL, character: 'Schemist',
    rarity: RARITIES.UNCOMMON, cost: 2, attack: 2, defense: 2, power: 2, production: 0,
    speed: 5, health: 2, range: 1, comboId: 'schemist',
    ability: 'Gambit: on lethal damage, flip a coin to survive at 1 HP instead. Once per card.',
    icon: '🎭', desc: 'Working for whoever’s winning. Currently that’s you.'
  },
  {
    id: 'sch_004', name: 'Forged Contract', type: CARD_TYPES.SPELL, team: TEAMS.CONTROL, character: 'Schemist',
    rarity: RARITIES.UNCOMMON, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0, comboId: 'schemist',
    ability: 'Look at the enemy hand; force them to discard the card of your choice.',
    icon: '📜', desc: 'Signed in advance. Under a name that isn’t theirs.'
  },
  {
    id: 'sch_005', name: 'Ambush Warren', type: CARD_TYPES.TRAP, team: TEAMS.CONTROL, character: 'Schemist',
    rarity: RARITIES.RARE, cost: 3, attack: 0, defense: 0, power: 3, production: 0,
    speed: 0, health: 0, range: 0, comboId: 'schemist',
    ability: 'Snare — also summons a 2/2 Cutthroat token onto the triggering creature’s now-empty slot.',
    icon: '🕳️', desc: 'The warren was always full. You just couldn’t see it.'
  },
  {
    id: 'sch_006', name: 'Puppet Master', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL, character: 'Schemist',
    rarity: RARITIES.RARE, cost: 4, attack: 3, defense: 3, power: 4, production: 0,
    speed: 5, health: 3, range: 1, comboId: 'schemist',
    ability: 'Gambit. When an enemy Trap triggers, this may trigger a copy of it in your favor.',
    icon: '🎪', desc: 'Every string in this fight leads back to one hand.'
  },
  {
    id: 'sch_007', name: 'The Long Con', type: CARD_TYPES.CONSPIRACY, team: TEAMS.CONTROL, character: 'Schemist',
    rarity: RARITIES.EPIC, cost: 5, attack: 0, defense: 0, power: 5, production: 0,
    speed: 0, health: 0, range: 0, comboId: 'schemist',
    ability: 'Set face-down. Trigger: once you’ve bought/drawn 2+ more cards than your opponent this game, deal 6 damage to the enemy base.',
    icon: '♟️', desc: 'The setup was the whole game. The payoff is just paperwork.'
  },
  {
    id: 'sch_008', name: 'The Kingmaker', type: CARD_TYPES.CREATURE, team: TEAMS.CONTROL, character: 'Schemist',
    rarity: RARITIES.LEGENDARY, cost: 6, attack: 5, defense: 4, power: 6, production: 0,
    speed: 6, health: 4, range: 1, comboId: 'schemist',
    ability: 'Gambit. Snare (this creature’s attacks also Silence + Stun). Whenever an enemy Trap or Conspiracy is revealed, copy it under your control.',
    icon: '👑', desc: 'Doesn’t want the throne. Wants to be the reason someone else sits in it.'
  }
];

// Pre-calculate card limits by rarity
const COPY_LIMITS = {
  [RARITIES.COMMON]: 4,
  [RARITIES.UNCOMMON]: 4,
  [RARITIES.RARE]: 3,
  [RARITIES.EPIC]: 2,
  [RARITIES.LEGENDARY]: 1,
  [RARITIES.MYTHIC]: 1
};

// Per-type copy limits (in addition to rarity limits)
const TYPE_COPY_LIMITS = {
  [CARD_TYPES.ACTION]: 3,
  [CARD_TYPES.GEAR]: 3,
  [CARD_TYPES.CONSPIRACY]: 3
};

// Get cards by team
function getCardsByTeam(team) {
  return ALL_CARDS.filter(c => c.team === team);
}

// Get cards by type
function getCardsByType(type) {
  return ALL_CARDS.filter(c => c.type === type);
}

// Get cards by rarity
function getCardsByRarity(rarity) {
  return ALL_CARDS.filter(c => c.rarity === rarity);
}

// Validate deck. `characterId`, if provided, enforces the Character-lock (docs/CARDS.md §1/§6):
// every card must either be Colorless (no `character` field) or match `characterId` exactly.
function validateDeck(deck, characterId) {
  const errors = [];
  const cardCounts = {};

  deck.forEach(card => {
    cardCounts[card.id] = (cardCounts[card.id] || 0) + 1;
  });

  for (const [id, count] of Object.entries(cardCounts)) {
    const card = ALL_CARDS.find(c => c.id === id);
    if (!card) {
      errors.push(`Unknown card: ${id}`);
      continue;
    }
    const limit = COPY_LIMITS[card.rarity];
    if (count > limit) {
      errors.push(`${card.name} (${card.rarity}): ${count}/${limit} copies`);
    }
    // Check per-type copy limits for new card types
    if (TYPE_COPY_LIMITS[card.type] !== undefined) {
      const typeLimit = TYPE_COPY_LIMITS[card.type];
      if (count > typeLimit) {
        errors.push(`${card.name} (${card.type}): ${count}/${typeLimit} copies`);
      }
    }
    // Character-lock: a card tagged with a Character can only appear in that Character's deck.
    if (characterId && card.character && card.character !== characterId) {
      errors.push(`${card.name} is a ${card.character} signature card — not legal for ${characterId}`);
    }
  }
  
  const creatureCount = deck.filter(c => c.type === CARD_TYPES.CREATURE).length;
  const spellCount = deck.filter(c => c.type === CARD_TYPES.SPELL).length;
  const actionCount = deck.filter(c => c.type === CARD_TYPES.ACTION).length;
  const trapCount = deck.filter(c => c.type === CARD_TYPES.TRAP).length;
  const conspiracyCount = deck.filter(c => c.type === CARD_TYPES.CONSPIRACY).length;
  const structureCount = deck.filter(c => c.type === CARD_TYPES.STRUCTURE).length;
  const gearCount = deck.filter(c => c.type === CARD_TYPES.GEAR).length;
  
  if (deck.length !== 40) errors.push(`Deck must be exactly 40 cards (currently ${deck.length})`);
  if (creatureCount < 20) errors.push(`Need at least 20 creatures (currently ${creatureCount})`);
  if (spellCount + actionCount > 10) errors.push(`Max 10 spells and actions (currently ${spellCount + actionCount})`);
  if (actionCount > 3) errors.push(`Max 3 action cards (currently ${actionCount})`);
  if (trapCount + conspiracyCount > 5) errors.push(`Max 5 traps and conspiracies (currently ${trapCount + conspiracyCount})`);
  if (conspiracyCount > 3) errors.push(`Max 3 conspiracy cards (currently ${conspiracyCount})`);
  if (structureCount > 8) errors.push(`Max 8 structures (currently ${structureCount})`);
  if (gearCount > 3) errors.push(`Max 3 gear cards (currently ${gearCount})`);
  
  return {
    valid: errors.length === 0,
    errors,
    stats: { creatureCount, spellCount, actionCount, trapCount, conspiracyCount, structureCount, gearCount, total: deck.length }
  };
}

// Export for use in other modules
if (typeof module !== 'undefined') {
  module.exports = { ALL_CARDS, CARD_TYPES, TEAMS, RARITIES, RARITY_TO_PRIORITY, KEYWORDS, KEYWORD_DESCRIPTIONS, TEAM_COLORS, TEAM_ICONS, COPY_LIMITS, TYPE_COPY_LIMITS, validateDeck, getCardsByTeam, getCardsByType, getCardsByRarity };
}
