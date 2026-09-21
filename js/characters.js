/**
 * Synthopwars Character Registry
 * The 9 Characters (classes) a player chooses before deckbuilding — see docs/CARDS.md.
 * Each Character locks a set of 8 signature cards (tagged `character` in js/cards.js) and
 * ships with a pre-validated 40-card starter deck (signatures + Colorless filler) the player
 * can freely modify in the Deck Builder.
 *
 * axes: 1 (low) - 5 (high) on Cost, Stats, Engine, Choice, Tempo — see docs/CARDS.md §3.
 */

const CHARACTERS = {
  Synthetic: {
    id: 'Synthetic', name: 'Synthetic', color: '#9fb4c7', icon: '🤖',
    tagline: "No flourish, no waste. The number on the chassis is the whole argument.",
    axes: { cost: 2, stats: 4, engine: 1, choice: 2, tempo: 3 },
    keywords: ["Precision"],
    tribe: "Titanborn",
    signatureCardIds: ["syt_001","syt_002","syt_003","syt_004","syt_005","syt_006","syt_007","syt_008"],
    starterDeckIds: ["syt_001","syt_001","syt_001","syt_002","syt_002","syt_002","syt_003","syt_003","syt_003","syt_004","syt_004","syt_004","syt_005","syt_005","syt_006","syt_006","syt_007","syt_007","syt_008","tb_001","tb_001","tb_008","tb_008","tb_002","tb_002","tb_009","tb_009","tb_006","tb_006","tb_003","tb_007","ag_001","oc_001","ct_001","oc_007","oc_007","oc_008","oc_008","oc_009","oc_009"]
  },
  Memetic: {
    id: 'Memetic', name: 'Memetic', color: '#f92aff', icon: '🦠',
    tagline: "An idea doesn't need a body to spread.",
    axes: { cost: 2, stats: 1, engine: 5, choice: 5, tempo: 2 },
    keywords: ["Replicate","Infect"],
    tribe: "Chaos",
    signatureCardIds: ["mem_001","mem_002","mem_003","mem_004","mem_005","mem_006","mem_007","mem_008"],
    starterDeckIds: ["mem_001","mem_001","mem_001","mem_002","mem_002","mem_002","mem_003","mem_003","mem_003","mem_004","mem_004","mem_004","mem_005","mem_005","mem_006","mem_006","mem_007","mem_007","mem_008","ch_001","ch_001","ch_002","ch_002","ch_015","ch_015","ch_003","ch_003","sc_008","sc_008","ch_018","ch_018","ch_004","ch_004","ch_016","ch_016","oc_007","oc_007","oc_008","oc_008","oc_009"]
  },
  Refinist: {
    id: 'Refinist', name: 'Refinist', color: '#c9822e', icon: '⚗️',
    tagline: "Nothing is waste. Everything is one process away from being useful.",
    axes: { cost: 5, stats: 5, engine: 2, choice: 2, tempo: 1 },
    keywords: ["Transmute","Refine"],
    tribe: "Economy",
    signatureCardIds: ["ref_001","ref_002","ref_003","ref_004","ref_005","ref_006","ref_007","ref_008"],
    starterDeckIds: ["ref_001","ref_001","ref_001","ref_002","ref_002","ref_002","ref_003","ref_003","ref_003","ref_004","ref_004","ref_004","ref_005","ref_005","ref_006","ref_006","ref_007","ref_007","ref_008","ec_001","ec_001","ec_003","ec_003","sc_007","sc_007","ec_011","ec_011","ec_009","ec_009","ec_005","ec_005","sh_005","sh_005","ec_015","ec_015","oc_007","oc_007","oc_008","oc_008","oc_009"]
  },
  Technopriest: {
    id: 'Technopriest', name: 'Technopriest', color: '#b0203c', icon: '🕯️',
    tagline: "The Machine God does not want your creature. It wants your creature’s death.",
    axes: { cost: 4, stats: 3, engine: 4, choice: 2, tempo: 2 },
    keywords: ["Sacrament","Devotion"],
    tribe: "Control",
    signatureCardIds: ["tec_001","tec_002","tec_003","tec_004","tec_005","tec_006","tec_007","tec_008"],
    starterDeckIds: ["tec_001","tec_001","tec_001","tec_002","tec_002","tec_002","tec_003","tec_003","tec_003","tec_004","tec_004","tec_004","tec_005","tec_005","tec_006","tec_006","tec_007","tec_007","tec_008","ct_001","ct_001","sc_001","sc_001","sc_002","sc_002","ct_016","ct_016","ct_002","ct_002","sc_003","sc_003","ct_015","ct_015","ct_018","ct_018","oc_007","oc_007","oc_008","oc_008","oc_009"]
  },
  Cyborg: {
    id: 'Cyborg', name: 'Cyborg', color: '#7cff2a', icon: '🦾',
    tagline: "You don't out-think the Redline. You get run over by it.",
    axes: { cost: 1, stats: 3, engine: 1, choice: 2, tempo: 5 },
    keywords: ["Overclock","Adrenaline"],
    tribe: "Overchargers",
    signatureCardIds: ["cyb_001","cyb_002","cyb_003","cyb_004","cyb_005","cyb_006","cyb_007","cyb_008"],
    starterDeckIds: ["cyb_001","cyb_001","cyb_001","cyb_002","cyb_002","cyb_002","cyb_003","cyb_003","cyb_003","cyb_004","cyb_004","cyb_004","cyb_005","cyb_005","cyb_006","cyb_006","cyb_007","cyb_007","cyb_008","ag_001","ag_001","oc_001","oc_001","ag_002","ag_002","oc_002","oc_002","oc_016","oc_016","oc_003","oc_003","ag_003","ag_003","oc_013","oc_013","oc_007","oc_007","oc_008","oc_008","oc_009"]
  },
  Biopure: {
    id: 'Biopure', name: 'Biopure', color: '#1f9e6e', icon: '🌱',
    tagline: "Augment nothing. Grow everything.",
    axes: { cost: 3, stats: 4, engine: 3, choice: 3, tempo: 1 },
    keywords: ["Bloom","Symbiosis"],
    tribe: "Fortress",
    signatureCardIds: ["bio_001","bio_002","bio_003","bio_004","bio_005","bio_006","bio_007","bio_008"],
    starterDeckIds: ["bio_001","bio_001","bio_001","bio_002","bio_002","bio_002","bio_003","bio_003","bio_003","bio_004","bio_004","bio_004","bio_005","bio_005","bio_006","bio_006","bio_007","bio_007","bio_008","fr_001","fr_001","fr_019","fr_019","fr_002","fr_002","fr_012","fr_012","fr_003","fr_003","fr_013","fr_013","fr_017","fr_017","fr_020","fr_020","oc_007","oc_007","oc_008","oc_008","oc_009"]
  },
  Ethereal: {
    id: 'Ethereal', name: 'Ethereal', color: '#a48cff', icon: '👻',
    tagline: "You cannot counter what isn't fully there yet.",
    axes: { cost: 2, stats: 1, engine: 4, choice: 4, tempo: 3 },
    keywords: ["Drift","Manifest"],
    tribe: "Synth Legends",
    signatureCardIds: ["eth_001","eth_002","eth_003","eth_004","eth_005","eth_006","eth_007","eth_008"],
    starterDeckIds: ["eth_001","eth_001","eth_001","eth_002","eth_002","eth_002","eth_003","eth_003","eth_003","eth_004","eth_004","eth_004","eth_005","eth_005","eth_006","eth_006","eth_007","eth_007","eth_008","sl_001","sl_001","sl_008","sl_008","sl_002","sl_002","sl_009","sl_009","sl_003","sl_006","my_001","ag_001","oc_001","ct_001","sy_001","oc_007","oc_007","oc_008","oc_008","oc_009","oc_009"]
  },
  Organizer: {
    id: 'Organizer', name: 'Organizer', color: '#2f6fed', icon: '🐝',
    tagline: "One of us is nothing. Forty of us is a supply chain.",
    axes: { cost: 2, stats: 2, engine: 3, choice: 5, tempo: 3 },
    keywords: ["Deploy","Network"],
    tribe: "Synergy",
    signatureCardIds: ["org_001","org_002","org_003","org_004","org_005","org_006","org_007","org_008"],
    starterDeckIds: ["org_001","org_001","org_001","org_002","org_002","org_002","org_003","org_003","org_003","org_004","org_004","org_004","org_005","org_005","org_006","org_006","org_007","org_007","org_008","sy_001","sy_001","sy_002","sy_002","sy_011","sy_011","sy_014","sy_014","sy_003","sy_003","sh_004","sh_004","sy_004","sy_004","sy_015","sy_015","oc_007","oc_007","oc_008","oc_008","oc_009"]
  },
  Schemist: {
    id: 'Schemist', name: 'Schemist', color: '#4a1f5c', icon: '♟️',
    tagline: "The winning move was decided three turns before you noticed you were playing.",
    axes: { cost: 3, stats: 2, engine: 5, choice: 3, tempo: 2 },
    keywords: ["Snare","Gambit"],
    tribe: "Control",
    signatureCardIds: ["sch_001","sch_002","sch_003","sch_004","sch_005","sch_006","sch_007","sch_008"],
    starterDeckIds: ["sch_001","sch_001","sch_001","sch_002","sch_002","sch_003","sch_003","sch_003","sch_004","sch_004","sch_004","sch_005","sch_005","sch_006","sch_006","sch_007","sch_008","ct_001","ct_001","sc_001","sc_001","sc_002","sc_002","ct_016","ct_016","ct_002","ct_002","sc_003","sc_003","ct_015","ct_015","ct_018","ct_018","ct_020","ct_020","oc_007","oc_007","oc_008","oc_008","oc_010"]
  }
};

const CHARACTER_LIST = Object.keys(CHARACTERS);

// Returns the full starter deck as card objects (with repeats) for a given Character id.
function getStarterDeck(characterId, ALL_CARDS_REF) {
  const cardsById = {};
  ALL_CARDS_REF.forEach(c => { cardsById[c.id] = c; });
  const ch = CHARACTERS[characterId];
  if (!ch) return [];
  return ch.starterDeckIds.map(id => cardsById[id]).filter(Boolean);
}

// Returns true if a card is legal for a given Character: Colorless (no character tag) or
// matches the chosen Character exactly.
function isCardLegalForCharacter(card, characterId) {
  if (!card) return false;
  if (!card.character) return true; // Colorless
  return card.character === characterId;
}

// Export for use in other modules
if (typeof module !== 'undefined') {
  module.exports = { CHARACTERS, CHARACTER_LIST, getStarterDeck, isCardLegalForCharacter };
}
