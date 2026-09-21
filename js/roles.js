/**
 * Eunonymous-TCG — Role registry  (js/roles.js)
 * =============================================
 * The identity layer, per the Notion GDD §4 "The 9 Roles (Commander Classes)".
 *
 *   ROLE       = the mechanical commander class. Passive bonus + active ability.
 *                This is where RULES live. 9 roles, fixed set.
 *   CHARACTER  = a themed identity that *plays as* a role. This is where ART,
 *                LORE and SIGNATURE CARDS live (js/characters.js).
 *
 * A role may eventually host several characters; today the 9 existing characters
 * map 1:1 onto the 9 roles. Mapping characters -> roles (rather than renaming
 * characters) preserves every existing artwork, signature card set and starter
 * deck: only the mechanical layer changes.
 *
 * STATUS: the role DEFINITIONS are transcribed verbatim from the GDD and are
 * authoritative. The CHARACTER -> ROLE mapping is a PROPOSAL — see docs/ROLES.md.
 * The passives/actives are DATA ONLY here; nothing is wired into GameEngine yet.
 * Wiring them is a balance-affecting change and must be scored on all 14 axes
 * (docs/AGENT_ROSTER.md) with an AI-vs-AI batch before it ships.
 */

const ROLES = {
  Artiste: {
    id: 'Artiste', name: 'Artiste', color: 'Magenta', hex: '#f92aff', icon: '🎨',
    passive: { key: 'cheapSpells', text: 'Spells cost -1 Power (minimum 1).', value: -1, min: 1 },
    active: { key: 'masterpiece', name: 'Masterpiece', text: 'Draw 2 cards. The next spell you play this turn is free.', cooldownTurns: 3 },
    identity: 'Spell-slinging tempo. Wins by chaining cheap Volonté for value.',
  },
  Policier: {
    id: 'Policier', name: 'Policier', color: 'Blue', hex: '#2f6fed', icon: '🛡️',
    passive: { key: 'doubleTraps', text: 'Your traps activate twice.', value: 2 },
    active: { key: 'lockdown', name: 'Lockdown', text: 'Enemy cannot play traps next turn. Remove Stealth from all enemy creatures.', cooldownTurns: 3 },
    identity: 'Hidden-information control. Punishes opponents who attack into unknowns.',
  },
  Docteur: {
    id: 'Docteur', name: 'Docteur', color: 'White', hex: '#e8eef5', icon: '⚕️',
    passive: { key: 'healingBoost', text: 'Healing effects are +50%.', value: 1.5 },
    active: { key: 'triage', name: 'Triage', text: 'Restore 8 HP to your Base, OR revive 1 creature at 50% HP.', cooldownTurns: 3 },
    identity: 'Attrition and recovery. Outlasts aggro by never running out of HP.',
  },
  Ingénieur: {
    id: 'Ingénieur', name: 'Ingénieur', color: 'Orange', hex: '#ff8c00', icon: '⚙️',
    passive: { key: 'sturdyStructures', text: 'Your structures have +2 HP.', value: 2 },
    active: { key: 'overclock', name: 'Overclock', text: 'All your structures generate double Power this turn.', cooldownTurns: 3 },
    identity: 'Base-building economy. Converts board presence into a resource engine.',
  },
  Cuisinier: {
    id: 'Cuisinier', name: 'Cuisinier', color: 'Yellow', hex: '#ffd700', icon: '🍲',
    passive: { key: 'sturdyTokens', text: 'Your token creatures gain +1/+1.', value: 1 },
    active: { key: 'feast', name: 'Feast', text: 'Create two 2/2 Food tokens with Cover.', cooldownTurns: 3 },
    identity: 'Go-wide swarm. Buries the opponent in cheap bodies.',
  },
  Politicien: {
    id: 'Politicien', name: 'Politicien', color: 'Purple', hex: '#bc13fe', icon: '🗳️',
    passive: { key: 'extraBaseHp', text: 'Start with +5 Base HP (35 instead of 30).', value: 5 },
    active: { key: 'propaganda', name: 'Propaganda', text: "Steal 1 random card from the opponent's hand.", cooldownTurns: 3 },
    identity: 'Resource denial and card advantage. Wins long games on value.',
  },
  Architecte: {
    id: 'Architecte', name: 'Architecte', color: 'Brown', hex: '#a9713f', icon: '🏗️',
    passive: { key: 'extraBaseSlot', text: 'Base Row has 6 slots instead of 5.', value: 6 },
    active: { key: 'fortify', name: 'Fortify', text: 'Place a 0/8 Wall structure for free.', cooldownTurns: 3 },
    identity: 'Immovable defence. The base is the weapon.',
  },
  Professeur: {
    id: 'Professeur', name: 'Professeur', color: 'Green', hex: '#1f9e6e', icon: '📚',
    passive: { key: 'extraDraw', text: 'Draw phase: draw +1 card.', value: 1 },
    active: { key: 'research', name: 'Research', text: 'Look at the top 3 cards of the mixed deck. Draw 1.', cooldownTurns: 3 },
    identity: 'Consistency and foresight. Always has the answer in hand.',
  },
  Juge: {
    id: 'Juge', name: 'Juge', color: 'Black', hex: '#4a1f5c', icon: '⚖️',
    passive: { key: 'doubleRequiem', text: 'Requiem (death) effects trigger twice.', value: 2 },
    active: { key: 'verdict', name: 'Verdict', text: 'Destroy 1 creature with ATK > 5. Ignores Cover.', cooldownTurns: 3 },
    identity: 'Removal and punishment. Turns the opponent\u2019s own board against them.',
  },
};

const ROLE_LIST = Object.keys(ROLES);

/**
 * PROPOSAL — character -> role. Characters keep their art, lore, signature cards
 * and starter decks; they inherit their role's mechanics.
 *
 * Each entry carries a rationale so the mapping can be argued on evidence rather
 * than taste. Two fits are genuinely awkward and are flagged; see docs/ROLES.md.
 */
const CHARACTER_ROLE = {
  Synthetic:     { role: 'Architecte', fit: 'strong', why: 'Titanborn sturdiness; "no flourish, no waste" reads as immovable base-building.' },
  Memetic:       { role: 'Politicien', fit: 'strong', why: 'Replicate/Infect = ideas spreading without bodies; Propaganda steals from hand.' },
  Refinist:      { role: 'Ingénieur',  fit: 'strong', why: 'Transmute/Refine = resource conversion; Economy tribe = the Power engine.' },
  Technopriest:  { role: 'Juge',       fit: 'strong', why: 'Sacrament/Devotion = ritual death; Requiem triggering twice is the whole kit.' },
  Cyborg:        { role: 'Artiste',    fit: 'weak',   why: 'Cyborg is the aggro/tempo identity, but the GDD has NO aggro role. Nearest is Artiste burst. GDD gap — see docs/ROLES.md.' },
  Biopure:       { role: 'Docteur',    fit: 'strong', why: 'Bloom/Symbiosis = growth and sustain; +50% healing is the natural home.' },
  Ethereal:      { role: 'Professeur', fit: 'ok',     why: 'Drift/Manifest = partial information and foresight; Research/Draw fits.' },
  Organizer:     { role: 'Cuisinier',  fit: 'strong', why: 'Deploy/Network = swarm; tokens +1/+1 rewards going wide.' },
  Schemist:      { role: 'Policier',   fit: 'strong', why: 'Snare/Gambit is trap play; traps activating twice is the literal kit.' },
};

/** Resolve a character id to its role id (falls back to null, never throws). */
function roleOf(characterId) {
  const m = CHARACTER_ROLE[characterId];
  return m ? m.role : null;
}

/** Resolve a character id to the full role object. */
function getRoleForCharacter(characterId) {
  const r = roleOf(characterId);
  return r ? ROLES[r] : null;
}

/** All characters that play as a given role (roles may host several). */
function charactersForRole(roleId) {
  return Object.keys(CHARACTER_ROLE).filter((c) => CHARACTER_ROLE[c].role === roleId);
}

/** Audit the mapping: every role covered? every character mapped? any weak fits? */
function auditRoleMapping() {
  const unmapped = Object.keys(CHARACTER_ROLE).filter((c) => !ROLES[CHARACTER_ROLE[c].role]);
  const unclaimed = ROLE_LIST.filter((r) => !charactersForRole(r).length);
  const weak = Object.keys(CHARACTER_ROLE).filter((c) => CHARACTER_ROLE[c].fit === 'weak');
  return { unmapped, unclaimed, weak, ok: !unmapped.length && !unclaimed.length };
}

const RoleRegistry = {
  ROLES, ROLE_LIST, CHARACTER_ROLE,
  roleOf, getRoleForCharacter, charactersForRole, auditRoleMapping,
};

if (typeof module !== 'undefined') {
  module.exports = RoleRegistry;
}
if (typeof window !== 'undefined') {
  window.RoleRegistry = RoleRegistry;   // for tooling/QA; also reachable by bare name
}