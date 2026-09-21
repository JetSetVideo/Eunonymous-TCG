# SYNTHOPWARS — OFFICIAL GAME RULES (v3.0)

*Canonical rules document. `docs/rules.md` and `docs/GDD.md` point here and to `docs/CARDS.md` rather
than duplicating this content — see those files for why. This version reconciles the rules text with
what `js/game.js` actually implements, and layers in the Character system from `docs/CARDS.md`.*

## 1. OVERVIEW

Synthopwars is a turn-based deckbuilding battleground game. Two Commanders face off using cards drawn
from a shared Metadeck. There is no individual deck once the battle starts — both players' pre-built
decks are shuffled together into one Metadeck, and every card a player will ever hold is acquired
through the Bank phase.

**Win Conditions:**
- **Annihilation** — reduce the opponent's Base HP to 0
- **Domination** — hold 3+ Structures for 3 consecutive turns
- **Combo Victory** — have 5 different Teams on the field simultaneously
- **Exodus** — draw from an empty personal deck 3 times (fatigue damage escalates each time; the 3rd forced draw ends the game)
- **Timeout** — turn 30 is reached with neither side eliminated; highest HP wins, exact tie is a Draw
- **Sudden Death** — from turn 31 on, both Commanders take 2 damage at the start of every turn until Annihilation triggers or both hit 0 simultaneously (Draw)
- **Surrender** — a player forfeits

## 2. PRE-GAME

### 2.1 Choose a Character (new)
Before deckbuilding, each player selects one of the **9 Characters** — Synthetic, Memetic, Refinist,
Technopriest, Cyborg, Biopure, Ethereal, Organizer, Schemist. Full identity, axis ratings, and signature
card lists live in `docs/CARDS.md`. The Character choice determines:
- Which 8 signature cards this player may include in their deck (in addition to the ~100-card Colorless pool every Character shares).
- The **starter deck** that pre-loads the deck builder — a ready-to-play 40-card list the player is free to modify before locking in.

### 2.2 Build/Modify a 40-Card Deck
- Each player's deck is exactly **40 cards**: signature cards from their chosen Character + any Colorless cards.
- Copy limits by rarity: Common ×4, Uncommon ×4, Rare ×3, Epic ×2, Legendary ×1, Mythic ×1. Action/Gear/Conspiracy cards are additionally capped at ×3 regardless of rarity.
- Minimum 20 creatures. Max 10 combined Spells+Actions (max 3 Actions). Max 5 combined Traps+Conspiracies (max 3 Conspiracies). Max 8 Structures. Max 3 Gear.
- A card belonging to a *different* Character never appears in the builder for a player who didn't pick that Character — it is hidden, not merely disabled.

### 2.3 Battle Start
1. Both players' 40-card decks are combined and shuffled into one **Metadeck (80 cards)** — the only
   source of cards either player will ever actively acquire, starting from turn 1's Bank phase.
2. Both players start with **0 cards in hand**. No opening hand is dealt.
3. Each player's original 40-card deck is *also* kept, separately shuffled, as a hidden personal-deck
   resource — it is never drawn from automatically and contributes nothing to the starting hand. It only
   matters for the handful of card effects that explicitly say "Draw" (drawing from your own personal
   deck, not the Bank) and for the **Exodus** win condition, which triggers off *this* deck running dry,
   not the Metadeck. Buying, playing, and the Bank market are entirely a Metadeck affair.
4. Both players start with **30 Base HP**.
5. The first player is determined and goes first.

## 3. TURN STRUCTURE

Each turn has three phases, executed in order:

```
Phase 1: BANK  →  Phase 2: MAIN  →  Phase 3: RESOLUTION
```

### 3.1 BANK PHASE

The Bank phase is the card-acquisition phase. Players spend Mana to buy cards from the Bank market.

- **Mana:** `maxMana = max(2, min(turn, 10))`. Mana refills to max at the start of every turn — it never carries over.
- **Market size:** the very first player's very first turn shows **3 cards**. Every other turn (including the second player's first turn) shows **5 cards**.
- **Buying:** click a Bank card to purchase it. Its `cost` is deducted from Mana; the card goes to hand.
- **Replacement:** a bought card's slot is immediately refilled from the Metadeck. The market always holds the target count (3 or 5) unless the Metadeck runs dry.
- **Affordability guarantee:** if nothing in the current market is affordable, the game swaps the most expensive market card for a random affordable one from the Metadeck (if any exist) — a player is never shown a market they mathematically cannot act on.
- **Supply:** the Metadeck is finite (80 cards). Once exhausted, slots stop refilling.
- **Mana Burn:** if a player ends the Bank phase with **more than 2 unused Mana**, they take `floor((mana - 2) / 2)` damage.
- **Pass:** click "End Bank Phase" to proceed to the Main phase.

### 3.2 MAIN PHASE

- **Power:** a separate resource, generated at the start of Main phase: `min(turn, 12)` base, plus Production from Structures, capped at 12 total. Power does not carry over between turns.
- **Playing Cards:** click a hand card to play it; its `power` cost is deducted. Cards resolve into their zone:
  - Creatures → Battle Row (5 slots)
  - Structures → Base Row (5 slots)
  - Traps / Conspiracies → Trap Zone (3 slots, face-down)
  - Spells / Actions → resolve immediately, go to Graveyard
  - Gear → attaches to a target creature
- **Summoning Sickness:** a creature cannot attack the turn it's played, unless it has **Charge** (a.k.a. Haste).
- **Attacking:** click a ready creature, then click an enemy creature, enemy Structure, or the enemy Base to attack.
- **End Main Phase:** click "End Turn" to proceed to Resolution.

### 3.3 RESOLUTION PHASE

1. Cards played this turn resolve in **priority order**: rarity first (Mythic → Legendary → Epic → Rare → Uncommon → Common), then higher cost within the same rarity.
2. On-play effects trigger in that order.
3. Combat resolves: declared attackers deal damage to their declared targets.
4. Destroyed cards go to the Graveyard.
5. End-of-turn effects resolve (Poison, Regenerate, Fortify, Bloom, Devotion checks, Ephemeral, etc.).
6. Turn passes to the opponent.

## 4. CARD TYPES

| Type | Description |
|------|-------------|
| Creature | Units that fight on the battlefield. Have ATK/DEF/HP. Cannot attack the turn they're played unless they have Charge. |
| Structure | Buildings in the Base row. Have DEF/HP. Some produce Power. Absorb damage aimed at the base. |
| Spell | One-time effect, resolves immediately, then Graveyard. |
| Trap | Face-down, triggers on a condition. Placed in the Trap Zone. |
| Action | Larger one-time effect than a Spell, same timing. |
| Gear | Equipment attached to a creature; grants stat bonuses/keywords. |
| Conspiracy | Hidden win-adjacent objective, similar to a Trap but tied to a long-run condition. |
| Role | Commander card with passive aura effects (legacy type, distinct from the Character system). |

## 5. COMBAT RULES

### 5.1 Attack Readiness
- Each creature gets **1 attack per turn** by default (green/grey pips show attacks remaining).
- **Surge** grants 2 attacks/turn. **Overclock** (Cyborg keyword) grants an extra attack at the cost of 1 self-damage per bonus attack.
- Summoning-sick creatures cannot attack the turn they're played. **Charge** bypasses this.

### 5.2 Targeting Rules
- Click a friendly creature to select it as attacker; a green arrow follows the cursor.
- Click an enemy creature, enemy Structure, or the enemy HP orb to attack it.
- **Taunt** — must be attacked first, unless Silenced.
- **Cover** — redirects attacks from adjacent creatures.
- **Stealth** — cannot be targeted until it attacks (breaks Stealth).
- **Drift** (Ethereal) — cannot be targeted by enemy *creature abilities* until it attacks; spells can still target it.
- **Flying** — only Flying, Ranged, or range ≥2 attackers can hit it.
- **Precision** (Synthetic) — the attacker ignores Stealth and Cover when choosing its own target.

### 5.3 Damage Formula
```
Damage = max(1, ATK - DEF - DamageReduction)
```
- Pierce ignores DEF entirely: damage = ATK.
- Absolute Defense reduces damage by 3 (minimum damage still applies).

### 5.4 Counterattack
```
Counter Damage = max(0, Target ATK - Attacker DEF)
```
- First Strike: if the attacker's Speed exceeds the target's Speed, no counterattack occurs.

### 5.5 Base Attack
1. The frontmost Structure absorbs damage first, up to its remaining HP.
2. Overflow after a Structure is destroyed goes to Base HP.
3. Fortress Wall absorbs 3 damage per attack while alive.
4. Pierce ignores Structure interception entirely.

## 6. KEYWORDS

### 6.1 Universal Keywords (appear on Colorless and Character cards alike)

| Keyword | Effect |
|---------|--------|
| Charge / Haste | Can attack the turn it's played. |
| Taunt | Enemies must attack this creature if able. |
| Cover | Redirects attacks from adjacent creatures. |
| Pierce | Ignores DEF entirely. |
| Ward | Absorbs the next instance of damage completely, then is consumed. |
| Shield | Reduces the next instance of damage by 50% (min 1), then consumed. |
| Reflect | Returns 50% of damage taken back to the attacker. |
| Thorns | Deals damage back to any attacker. |
| Lifesteal | Heals the controller's base for damage dealt. |
| Barrage | Attacks all enemy creatures simultaneously. |
| Fortify | Gains +1/+1 if it survives combat, or +2 DEF while you control a Structure. |
| Regenerate | Heals 2 HP at the start of the controller's turn. |
| Poison | Deals 1 damage/turn, stack decreases by 1 each time. |
| Silence | Removes all abilities from the target. |
| Enrage | +2 ATK while below 50% HP. |
| Immortal | Survives lethal damage at 1 HP once, then is consumed. |
| Stealth | Cannot be targeted until it attacks. |
| Catalyst | Boosts the effect of the next Spell/Action played. |
| Demolish | Deals double damage to Structures. |
| Surge | Doubles ATK on the first attack each turn; grants 2 attacks/turn. |
| Invoke | Summons an extra token creature on play. |
| Resonance | Gains bonus stats if another card of the same Team is on the field. |
| Detonate | Deals splash damage to all creatures on death. |
| Recall | Returns to hand instead of Graveyard on death. |
| Forge | +1/+1 per turn on the field (max +4/+4). |
| Synth | Combines with another Synth card to upgrade both. |
| Overload | Spend extra Power to boost stats before attacking. |
| Nexus | Shares buffs with every other Nexus card. |
| Echo | Copies the last Spell cast, each time it triggers. |
| Harvest | Generates Power equal to its current DEF, end of turn. |
| Nullify | Cancels the next opposing ability played. |
| Phase | Cannot be targeted by Spells for one turn after being played. |
| Conduit | Doubles adjacent Structures' Production. |
| Ascend | +1 to all stats permanently whenever an allied creature dies. |
| Flying / Ranged | See §5.2. |
| Frozen | Cannot attack while frozen. |

### 6.2 Character Keywords (locked — see `docs/CARDS.md` §7 for full rules text)

| Keyword | Character |
|---|---|
| Precision | Synthetic |
| Replicate, Infect | Memetic |
| Transmute, Refine | Refinist |
| Sacrament, Devotion | Technopriest |
| Overclock, Adrenaline | Cyborg |
| Bloom, Symbiosis | Biopure |
| Drift, Manifest | Ethereal |
| Deploy, Network | Organizer |
| Snare, Gambit | Schemist |

These never appear on a Colorless card — that boundary is what keeps a Character's identity distinct
even when their deck is 3/4 Colorless filler.

## 7. RESOURCE SYSTEM

### Mana (Bank Phase)
- `maxMana = max(2, min(turn, 10))`, refills to max every turn, never carries over.
- Excess over 2 unspent Mana burns at end of Bank phase: `floor((mana-2)/2)` HP damage.

### Power (Main Phase)
- `basePower = min(turn, 12)` + Structure Production, capped at 12 total.
- Does not carry over between turns.

## 8. TEAM (TRIBAL) SYNERGY

Team tags are independent of Character choice — see `docs/CARDS.md` §1. Having 2+ same-Team creatures
on the field grants a minor Ally bonus; 3+ grants full Synergy:

| Team | Ally (2+) | Synergy (3+) |
|------|-----------|--------------|
| Overchargers | +1 ATK | +1 ATK + Charge |
| Fortress | +1 DEF | +2 DEF |
| Control | +1 Power | +2 Power |
| Synergy | +1 ATK | +1/+1 |
| Economy | +1 Power | +3 Power |
| Chaos | — | Random ATK bonus (1–4) |
| Synth Legends | — | +3 HP |
| Titanborn | — | +2/+2 |

## 9. DANGER EVENTS (Out There Omega)

Every 4 global turns starting turn 6, an escalating danger event hits **both** Commanders simultaneously
(Void Storm, Solar Flare, Gravity Surge, Scavenger Pod, Nebula Bloom), growing more severe (level 1→5) as
the match goes on. Announced with a banner and screen flash.

## 10. BATTLE LOG

Synthopwars keeps a full structured event history for the match (`game.battleHistory`), covering every
buy, play, attack, ability trigger, structure change, and phase change with a timestamp, turn number, and
HP snapshot for both sides. The in-battle Log panel presents this Starcraft-2-style: a scrolling, filterable,
timestamped (`mm:ss` from battle start) feed, color-coded by player, with a category icon per event type
(🛒 buy, ▶️ play, ⚔️ attack, ✨ ability, 🏗️ structure, 💀 destroy, 🏆 win-condition progress). See the
implementation notes in `docs/REDESIGN_PROGRESS.md` Stage 6.

## 11. UI & ANIMATION PRINCIPLES

- Every zone (Hand, Battle Row, Base Row, Trap Zone, Bank Market, Graveyard) carries a persistent label —
  a player should never have to infer what a region of the screen is from context alone.
- The active player's Character color accents their HUD frame, HP orb ring, and card backs, so ownership
  is readable at a glance in a cluttered board state.
- Animation timing is tied to game-state meaning, not decoration: quick/cheap actions (drawing, buying a
  Common) get short, low-amplitude motion; game-changing actions (Legendary/Mythic plays, lethal attacks,
  win conditions triggering) get longer, higher-amplitude motion. See `docs/REDESIGN_PROGRESS.md` Stage 8
  for the concrete timing table.

## 12. GAME FLOW DIAGRAM

```
PRE-GAME
  ├── Both players pick a Character
  ├── Both players build/modify a 40-card deck (signatures + Colorless)
  └── Decks combined → shuffled into 80-card Metadeck

TURN START
  ├── Mana refills to max(2, min(turn,10))
  ├── Power generated (min(turn,12) + structure production, cap 12)
  └── Bank phase begins

BANK PHASE
  ├── 3 cards shown (first player, first turn only) / 5 cards (all other turns)
  ├── Player buys cards with Mana; slots refill from Metadeck
  ├── Unused Mana >2 burns: floor((mana-2)/2) damage
  └── Player clicks "End Bank Phase"

MAIN PHASE
  ├── Player plays cards from hand using Power
  ├── Creatures placed in Battle Row (summoning sickness unless Charge)
  ├── Structures placed in Base Row; Spells/Actions resolve immediately
  ├── Player declares attackers and targets
  └── Player clicks "End Turn"

RESOLUTION PHASE
  ├── Cards resolve in rarity → cost priority
  ├── Combat damage resolved
  ├── Destroyed cards → Graveyard
  ├── End-of-turn effects resolve
  └── Next player's turn begins
```
