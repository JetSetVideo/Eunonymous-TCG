# Synthopwars CHANGELOG

## v2.0 — Battle System Rebuild (2026-07-03)

### Core Game Engine Overhaul
- **Hearthstone Mana System**: Players start with 1 mana crystal, gain +1 per turn, cap at 10, fully refills at start of each Bank Phase.
- **Metadeck**: Both players' decks are shuffled together to form a shared market supply. Cards shown in the market are never repeated in the same game.
- **Bank Phase Market**: 3 cards shown on the very first player's first turn (reduces first-player advantage), 5 cards on all other turns.
- **Buy mechanic**: Click a market card to buy it (deducts mana). Unaffordable cards are grayed out.
- **Enemy AI Bank Phase**: AI automatically buys the most valuable affordable cards before combat.
- **Priority Queue**: Rarer cards resolve first in combat (mythic=5 > legendary=4 > epic=3 > rare=2 > uncommon=1 > common=0).
- **`RARITY_TO_PRIORITY` constant** added to cards.js.

### Card Visual Redesign
- **🪙 Golden coin** cost badge in top-left header (replaces cyan circle).
- **Card name** centered in top bar; **faction name** in very small text below name.
- **★ Stars** (0-5) between art and type bar showing rarity — common=0 stars, mythic=5 stars.
- **⚔ ATK badge** positioned bottom-left corner, outside/overlapping the card frame.
- **🛡 DEF badge** positioned bottom-right corner, outside/overlapping the card frame.
- **Type bar** redesigned with inset/encasted look (dark background, inner shadow).

### Animated Battleground Backgrounds
- Added CSS animated background classes for all 7 biomes: `.bg-cyber`, `.bg-desert`, `.bg-fog`, `.bg-neon`, `.bg-golden`, `.bg-gravity`, `.bg-fire`.
- Applied to `#battle-arena` on battle start based on selected battleground's biome.
- Each animation uses slow loops (7–15s) with CSS `@keyframes` on `background-position` and `filter`.

### Bank Zone UI
- New mana crystal display (Hearthstone-style blue crystals showing current/max mana).
- Market cards in bank zone have cost labels: green "affordable" or red "cannot buy".
- "End Bank Phase" button to transition to combat.
- Bank zone is a centered overlay during bank phase.

### Docs
- README.md fully rewritten with new rules, card design guide, priority system.
- GDD.md updated with v2.0 game design specifications.

---

# Synthopwars v1.0 — Patch Notes

## 🚀 Battle Speed Improvements
- **Bot AI plays instantly** — no more waiting for the opponent! All setTimeout delays removed. Bots play cards, attack, and end turn immediately.
- **20-second player turn timer** — down from 90s. Card game pace drastically improved. Push "End Turn" to go faster.
- **Visual urgency** — timer flashes red and pulses at 5 seconds remaining.
- During bot turns, timer shows ⚡ instead of counting.

## 🔍 New Scout / Reveal Mechanics
- **8 new Scout cards** added across Control, Economy, and Chaos
- **Scout Drone**: Reveal 1 random enemy card
- **Infiltrator**: Reveal 2 enemy cards, +1 ATK if both Creatures
- **Oracle Eye**: Reveal ALL enemy cards, discard 1 revealed Spell
- **Signal Intercept**: Peek at top 3 cards of any deck, may discard
- **Mind Probe**: Reveal enemy hand, steal 1 card
- **Spy Network**: Each turn, reveal top enemy deck card
- **Deck Scryer**: Look at top 2 of your deck, keep or bottom
- **Grave Robber**: Take top card from any graveyard

## ⚔️ Deck Balance & Archetype Expansion
- **21 new cards** across all factions for better archetype balance
- **Overcharge Aggro**: Spark Scout (free!), Speed Demon, Berserker, Chain Lightning
- **Control Disruption**: Thoughtseize, Freeze Ray
- **Fortress Sustain**: Shield Wall, Regeneration Tank
- **Synergy Combo**: Harmonic Linker, Overmind
- **Economy Ramp**: Loan Shark, Market Crash
- **Chaos RNG**: Wild Mutation, Pandemonium
- **7 balanced preset decks** — choose from Overcharge, Fortress, Control, Synergy, Economy, Chaos, or Balanced

## 📏 Rules Improvements
- **Max hand size**: 10 cards (7 in Future Odessa battleground)
- **Battleground-specific limits** enforced in draw and discard phases
- Excess draws go to graveyard (not silently deleted)

## 🎵 Audio Additions
- **Reveal SFX**: Ascending mystical chime when Scout/Oracle cards reveal enemy cards
- **Peek SFX**: Subtle pitch-bend tone for deck-scrying actions
- Context-aware sound triggers based on card abilities

## 🎨 Visual & Animation Enhancements
- **timerPulse animation**: Urgent timer flash in last 5 seconds
- **attackStrike animation**: Attack trail visual effect
- **cardMaterialize**: Cards flip into existence when played
- **revealPulse**: Gold glow on revealed cards
- **comboGlow**: Brightness boost on combo activation
- **Battleground tints**: Each battlefield has a themed background glow

---

*Synthopwars © 2026 — Card Database: 60 → 81 cards*
