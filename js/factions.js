/**
 * Eunonymous-TCG — Faction registry  (js/factions.js)
 * ===================================================
 * The 9 factions of the Eunonymous universe, taken from the Notion "Factions" page.
 * They are the same 9 identities as `js/characters.js` (CHARACTERS) — that file owns
 * the gameplay/card data; THIS file owns the VISUAL IDENTITY: colour code, material
 * style, animated SVG mark, and the back-of-card design.
 *
 * Notion axis vocabulary (used for faction positioning, see `axes`):
 *   eternity/immediate · totalitarian/libertarian · freewill/deterministic ·
 *   contemporary/historical · biology/technology · statist/independentist ·
 *   conservative/progressive
 *
 * MATERIAL STYLES — nine, one per faction, each with a distinct render treatment:
 *   metal · glitchy · bronze · material · energy · organic · virtual · fluid · atomic
 *
 * Everything visual is generated from here so a faction can be restyled in ONE place.
 */

const FACTION_STYLES = {
  metal:    { label: 'Brushed Metal', texture: 'sheen',     motion: 'sweep',   desc: 'Machined bevels, cold sheen, hard specular edges.' },
  glitchy:  { label: 'Glitch',        texture: 'scanline',  motion: 'glitch',  desc: 'Chromatic split, datamosh, RGB misregistration.' },
  bronze:   { label: 'Bronze',        texture: 'patina',    motion: 'shimmer', desc: 'Warm cast metal, oxidised patina, alchemical weight.' },
  material: { label: 'Material',      texture: 'matte',     motion: 'pulse',   desc: 'Dense matte solid, heavy, light-absorbing.' },
  energy:   { label: 'Energy',        texture: 'plasma',    motion: 'flicker', desc: 'Hot core, radiated filaments, plasma bleed.' },
  organic:  { label: 'Organic',       texture: 'cellular',  motion: 'breathe', desc: 'Cell membranes, growth rings, living curvature.' },
  virtual:  { label: 'Virtual',       texture: 'wireframe', motion: 'drift',   desc: 'Holographic wireframe, translucent, non-physical.' },
  fluid:    { label: 'Fluid',         texture: 'viscous',   motion: 'flow',    desc: 'Surface tension, flowing curves, poured liquid.' },
  atomic:   { label: 'Atomic',        texture: 'orbital',   motion: 'orbit',   desc: 'Nucleus and orbital shells, particle flicker.' },
};

/**
 * The 9 factions. `palette` drives every visual (icon, card back, field tint, shop).
 *   primary  — the faction's signature hue (matches characters.js where one exists)
 *   deep     — near-black tinted ground for that faction
 *   glow     — emissive accent for neon treatment
 *   edge     — frame/border colour
 */
const FACTIONS = {
  Synthetic: {
    id: 'Synthetic', name: 'Synthetic', style: 'metal', icon: '🤖',
    palette: { primary: '#9fb4c7', deep: '#0a0e14', glow: '#dfe9f5', edge: '#6c7f93' },
    lore: 'No flourish, no waste. The number on the chassis is the whole argument.',
    axes: { eternity: -2, totalitarian: +2, determinism: +3, contemporary: 0, biology: -3, statist: +2, conservative: +1 },
    position: 'Baseline humanoid chassis — the industrial standard others deviate from.',
  },
  Memetic: {
    id: 'Memetic', name: 'Memetic', style: 'glitchy', icon: '🦠',
    palette: { primary: '#f92aff', deep: '#12001a', glow: '#ff8cff', edge: '#8a10a0' },
    lore: "An idea doesn't need a body to spread.",
    axes: { eternity: -3, totalitarian: -1, determinism: -2, contemporary: +2, biology: +1, statist: -2, conservative: -3 },
    position: 'Information as organism. Spreads through populations, not bodies.',
  },
  Refinist: {
    id: 'Refinist', name: 'Refinist', style: 'bronze', icon: '⚗️',
    palette: { primary: '#c9822e', deep: '#14100a', glow: '#ffc978', edge: '#8a5a1c' },
    lore: 'Nothing is waste. Everything is one process away from being useful.',
    axes: { eternity: +1, totalitarian: 0, determinism: +1, contemporary: -1, biology: +1, statist: 0, conservative: +2 },
    position: 'Alchemical transmuters — value is a process, not a substance.',
  },
  Technopriest: {
    id: 'Technopriest', name: 'Technopriest', style: 'material', icon: '🕯️',
    palette: { primary: '#b0203c', deep: '#14060a', glow: '#ff6b85', edge: '#7a1428' },
    lore: "The Machine God does not want your creature. It wants your creature's death.",
    axes: { eternity: +3, totalitarian: +3, determinism: +3, contemporary: -2, biology: -1, statist: +3, conservative: +3 },
    position: 'Sacrifice as liturgy. Death is the offering that makes the machine listen.',
  },
  Cyborg: {
    id: 'Cyborg', name: 'Cyborg', style: 'energy', icon: '🦾',
    palette: { primary: '#7cff2a', deep: '#0a1400', glow: '#c6ff8a', edge: '#4aa01c' },
    lore: "You don't out-think the Redline. You get run over by it.",
    axes: { eternity: -3, totalitarian: +1, determinism: +2, contemporary: +3, biology: -2, statist: 0, conservative: -2 },
    position: 'Overclocked augmentation. Speed as an ideology.',
  },
  Biopure: {
    id: 'Biopure', name: 'Biopure', style: 'organic', icon: '🌱',
    palette: { primary: '#1f9e6e', deep: '#04140e', glow: '#6bffbe', edge: '#12734f' },
    lore: 'Augment nothing. Grow everything.',
    axes: { eternity: +2, totalitarian: -2, determinism: -1, contemporary: -3, biology: +3, statist: -2, conservative: +2 },
    position: 'Anti-augmentation biosphere. Growth is the only legitimate technology.',
  },
  Ethereal: {
    id: 'Ethereal', name: 'Ethereal', style: 'virtual', icon: '👻',
    palette: { primary: '#a48cff', deep: '#0b0818', glow: '#d6c8ff', edge: '#6a55b0' },
    lore: "You cannot counter what isn't fully there yet.",
    axes: { eternity: +3, totalitarian: -3, determinism: -3, contemporary: 0, biology: -3, statist: -3, conservative: -1 },
    position: 'Partially instantiated minds. Presence is a variable, not a fact.',
  },
  Organizer: {
    id: 'Organizer', name: 'Organizer', style: 'fluid', icon: '🐝',
    palette: { primary: '#2f6fed', deep: '#050d1c', glow: '#8ab4ff', edge: '#1d4aa3' },
    lore: 'One of us is nothing. Forty of us is a supply chain.',
    axes: { eternity: -1, totalitarian: +2, determinism: 0, contemporary: +1, biology: 0, statist: +2, conservative: +1 },
    position: 'Collective logistics. The swarm is the unit; the individual is throughput.',
  },
  Schemist: {
    id: 'Schemist', name: 'Schemist', style: 'atomic', icon: '♟️',
    palette: { primary: '#8b5cf6', deep: '#0a0616', glow: '#c4b5fd', edge: '#5b21b6' },
    lore: 'The winning move was decided three turns before you noticed you were playing.',
    axes: { eternity: +2, totalitarian: -1, determinism: +3, contemporary: -1, biology: -2, statist: -1, conservative: 0 },
    position: 'Long-horizon planners. Cause and effect are inventory.',
  },
};

const FACTION_LIST = Object.keys(FACTIONS);
const FACTION_STYLE_LIST = Object.keys(FACTION_STYLES);

// ---------------------------------------------------------------------------
// Animated SVG marks — neon / techno / crypto-minimalist, one per faction.
// Each is a small geometric sigil whose FORM encodes the faction and whose
// MOTION comes from the style (see factionStyleCSS). Inline SVG only: crisp at
// any size, themeable via currentColor, no image requests, no icon font.
// ---------------------------------------------------------------------------

/** Shared defs: a soft neon bloom filter every mark can reference. */
const FACTION_SVG_DEFS =
  '<defs><filter id="fx-bloom" x="-50%" y="-50%" width="200%" height="200%">' +
  '<feGaussianBlur stdDeviation="1.6" result="b"/>' +
  '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';

const FACTION_SVG_BODY = {
  // Metal: machined hexagon with a hard core and bevelled struts.
  Synthetic:
    '<polygon class="fx-sweep" points="16,3 28,10 28,22 16,29 4,22 4,10"/>' +
    '<polygon points="16,8 23,12 23,20 16,24 9,20 9,12" opacity=".55"/>' +
    '<circle class="fx-core" cx="16" cy="16" r="3.1"/>' +
    '<path d="M16 3v5M16 24v5M4 10l4 2M28 10l-4 2" opacity=".6"/>',
  // Glitch: three misregistered rings + a torn core.
  Memetic:
    '<circle class="fx-g1" cx="16" cy="16" r="10" opacity=".55"/>' +
    '<circle class="fx-g2" cx="16" cy="16" r="6.6" opacity=".7"/>' +
    '<rect class="fx-glitch-band" x="4" y="14" width="24" height="3.4" opacity=".85"/>' +
    '<circle class="fx-core" cx="16" cy="16" r="2.5"/>',
  // Bronze: crucible triangle with a rising drop and patina ring.
  Refinist:
    '<polygon points="16,4 28,26 4,26"/>' +
    '<polygon class="fx-shimmer" points="16,10 23,24 9,24" opacity=".5"/>' +
    '<circle class="fx-core" cx="16" cy="20" r="2.6"/>' +
    '<path class="fx-rise" d="M16 12v-5M13.5 9l2.5-3 2.5 3" opacity=".8"/>',
  // Material: dense monolith with a lit aperture.
  Technopriest:
    '<rect x="7" y="4" width="18" height="24" rx="2.5"/>' +
    '<rect class="fx-solid" x="10" y="9" width="12" height="14" rx="1.5" opacity=".45"/>' +
    '<path class="fx-flame" d="M16 12.5c2.2 2.6 3.1 4.2 3.1 5.9a3.1 3.1 0 0 1-6.2 0c0-1.7.9-3.3 3.1-5.9z"/>',
  // Energy: visor + bolt, radiating filaments.
  Cyborg:
    '<path d="M4 11h24v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" opacity=".55"/>' +
    '<path class="fx-bolt" d="M17.5 6l-5.5 8h4l-2 6 6-8.4h-4z"/>' +
    '<path d="M4 8.5h5M23 8.5h5M6 24l3.5-3M26 24l-3.5-3" opacity=".7"/>',
  // Organic: seed with cellular rings and a sprouting arc.
  Biopure:
    '<path class="fx-breathe" d="M16 28c0-9 4-13 10-13 0 8-4 13-10 13z" opacity=".65"/>' +
    '<path d="M16 4c-6 5-6 12 0 24" opacity=".85"/>' +
    '<circle class="fx-core" cx="16" cy="13" r="3"/>' +
    '<circle cx="16" cy="13" r="6.5" opacity=".3"/>',
  // Virtual: wireframe diamond with echoed afterimages.
  Ethereal:
    '<polygon class="fx-drift" points="16,3 29,16 16,29 3,16" opacity=".5"/>' +
    '<polygon points="16,8 24,16 16,24 8,16" opacity=".75"/>' +
    '<polygon class="fx-echo" points="16,12 20,16 16,20 12,16"/>' +
    '<circle class="fx-core" cx="16" cy="16" r="1.9"/>',
  // Fluid: poured droplets coalescing into a cell cluster.
  Organizer:
    '<path class="fx-flow-a" d="M9 22c-3 0-5-2.2-5-5s2.2-5 5-5c1.8-3 6-3.6 8.4-1.2C20 8 25 10 26 14.6c2.3.5 3.9 2.5 3.9 4.9 0 2.8-2.2 5-5 5z" opacity=".5"/>' +
    '<circle class="fx-core" cx="12" cy="17" r="3"/>' +
    '<circle cx="19" cy="15" r="2.4" opacity=".8"/>' +
    '<circle class="fx-flow-b" cx="21" cy="20" r="2"/>',
  // Atomic: nucleus with two orbital shells and particle ticks.
  Schemist:
    '<circle class="fx-core" cx="16" cy="16" r="3.4"/>' +
    '<ellipse class="fx-orbit-a" cx="16" cy="16" rx="12" ry="5" opacity=".8"/>' +
    '<ellipse class="fx-orbit-b" cx="16" cy="16" rx="5" ry="12" opacity=".8"/>' +
    '<circle class="fx-particle" cx="28" cy="16" r="1.6"/>' +
    '<circle cx="16" cy="4" r="1.3" opacity=".7"/>',
};

/**
 * Build an inline animated SVG mark for a faction.
 * @param {string} factionId
 * @param {{size?:number, cls?:string}} opts
 * @returns {string} SVG markup (safe to inject via innerHTML)
 */
function factionIconSVG(factionId, opts) {
  opts = opts || {};
  const f = FACTIONS[factionId];
  if (!f) return '';
  const size = opts.size || 32;
  const body = FACTION_SVG_BODY[factionId] || '<circle cx="16" cy="16" r="9"/>';
  const p = f.palette;
  return (
    '<svg class="fx-icon fx-' + f.style + (opts.cls ? ' ' + opts.cls : '') + '" ' +
    'viewBox="0 0 32 32" width="' + size + '" height="' + size + '" ' +
    'fill="none" stroke="' + p.primary + '" stroke-width="1.6" ' +
    'stroke-linejoin="round" stroke-linecap="round" ' +
    'style="--fx-primary:' + p.primary + ';--fx-glow:' + p.glow + ';--fx-edge:' + p.edge + ';color:' + p.primary + '">' +
    FACTION_SVG_DEFS +
    '<g filter="url(#fx-bloom)">' + body + '</g>' +
    '</svg>'
  );
}

/** Card-back gradient for a faction — used by the shop and the deck builder. */
function factionCardBackStyle(factionId) {
  const f = FACTIONS[factionId];
  if (!f) return '';
  const p = f.palette;
  const s = FACTION_STYLES[f.style];
  const sheen = {
    metal:    'linear-gradient(135deg, rgba(255,255,255,.22) 0%, transparent 38%, transparent 62%, rgba(255,255,255,.12) 100%)',
    glitchy:  'repeating-linear-gradient(0deg, rgba(255,255,255,.14) 0 1px, transparent 1px 3px)',
    bronze:   'radial-gradient(circle at 30% 25%, rgba(255,220,160,.28), transparent 55%)',
    material: 'linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.35))',
    energy:   'radial-gradient(circle at 50% 45%, rgba(255,255,255,.35), transparent 60%)',
    organic:  'radial-gradient(circle at 35% 70%, rgba(120,255,190,.22), transparent 58%)',
    virtual:  'repeating-linear-gradient(45deg, rgba(255,255,255,.10) 0 2px, transparent 2px 7px)',
    fluid:    'radial-gradient(ellipse at 60% 30%, rgba(140,180,255,.26), transparent 60%)',
    atomic:   'conic-gradient(from 210deg at 50% 50%, rgba(255,255,255,.20), transparent 35%, rgba(255,255,255,.14) 70%, transparent)',
  }[f.style] || 'none';
  return 'background-image:' + sheen + ',radial-gradient(circle at 50% 40%, ' + p.primary + '33, transparent 62%),linear-gradient(160deg, ' + p.deep + ', #04060c);' +
         'border-color:' + p.edge + ';box-shadow:0 0 0 1px rgba(0,0,0,.6) inset, 0 0 18px -4px ' + p.primary + '99;';
}

/** Tint applied to a battlefield for a faction-held field. */
function factionFieldTint(factionId) {
  const f = FACTIONS[factionId];
  if (!f) return '';
  return 'background-image:radial-gradient(ellipse at 50% 30%, ' + f.palette.primary + '26 0%, transparent 60%),' +
         'linear-gradient(180deg, ' + f.palette.deep + ' 0%, #04060c 100%);';
}

if (typeof module !== 'undefined') {
  module.exports = { FACTIONS, FACTION_LIST, FACTION_STYLES, FACTION_STYLE_LIST, factionIconSVG, factionCardBackStyle, factionFieldTint };
}
if (typeof window !== 'undefined') {
  window.FactionRegistry = { FACTIONS, FACTION_LIST, FACTION_STYLES, FACTION_STYLE_LIST, factionIconSVG, factionCardBackStyle, factionFieldTint };
}