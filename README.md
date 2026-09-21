# Eunonymous-TCG

A deck-building battleground card game set in the Synthtopia universe.

> Formerly `Synthopwars`. The project now lives as **Eunonymous-TCG** and ships with
> real LAN multiplayer so two people on the same Wi-Fi can play each other.

## Quick Start

```bash
# Single player — just open the file
open index.html            # macOS
xdg-open index.html        # Linux

# Two players on the same Wi-Fi
node server/lan-server.js  # one machine hosts; both open the printed LAN URL
```

Both players open the same URL, then use the **◈ NET PLAY** panel (bottom-right):
one clicks **CREATE**, the other enters the 4-letter room code and clicks **JOIN**.
Full walkthrough: [`docs/LAN_SETUP.md`](docs/LAN_SETUP.md).

**Working on the code with an AI agent?** Read [`AGENTS.md`](AGENTS.md) (shared
manual) and [`COLLAB.md`](COLLAB.md) (handoff ledger). macOS: [`docs/MAC_SETUP.md`](docs/MAC_SETUP.md).

## Game Overview

**Genre:** Deckbuilder / TCG (Trading Card Game) Battleground  
**Platform:** Browser-based (HTML5), no build step — open `index.html` directly  
**Core Mechanic:** Pick a Character, build/modify your 40-card deck, enter battlegrounds, use a Hearthstone-style mana system to buy cards during the Bank Phase, then deploy them during the Combat Phase.

## How to Play

### 1. Pick a Character
Choose one of **9 Characters** — Synthetic, Memetic, Refinist, Technopriest, Cyborg, Biopure, Ethereal,
Organizer, Schemist. Each has its own 8 signature cards, a color scheme, and a rating on 5 design axes
(Cost, Stats, Engine, Choice, Tempo). Full details: [`docs/CARDS.md`](docs/CARDS.md).

### 2. Build/Modify a Deck
Your Character loads a ready-to-play 40-card starter deck (signature cards + Colorless picks). Modify it
freely in the Deck Builder (minimum 20 creatures) — every Colorless card (the original 8-Team pool) is
available to any Character; signature cards are locked to their own Character.

### 3. Choose a Battleground
Each Neo-City battleground has unique rules and an animated visual theme.

### 4. Battle Flow

**Bank Phase (Hearthstone Mana System)**
- Each turn, max mana is `max(2, min(turn, 10))` and fully refills — it never carries over.
- A market of cards is revealed from the **Metadeck** (both players' decks shuffled together, 80 cards total).
- First player's very first turn shows only 3 cards (to reduce first-player advantage). All other turns show 5 cards.
- Market cards are **never repeated** in the same game.
- Click a card to buy it (must have enough mana). Card goes to your hand.
- Click **End Bank Phase** when done buying.

**Combat Phase**
- Drag cards from your hand onto the battlefield.
- **Creatures** → placed on battlefield slots (up to 5).
- **Attack:** Click your creature, then click an enemy creature, enemy structure, or the enemy HP orb.
- Each creature gets **1 attack per turn** (green pips show remaining attacks).
- **Taunt, Cover, Stealth, Flying** affect targeting.
- **Spells/Action cards** → activate on play and are consumed.
- **Structures** → placed in base slots (visible as compact cards with HP bars).
- Select an attacker, then click a target or enemy base to attack.
- Click **End Turn** to pass to the opponent.

### 5. Win Conditions
1. **Annihilation** — Reduce enemy HP to 0.
2. **Domination** — Hold 3+ structures for 3 consecutive turns.
3. **Combo Victory** — 5 different Teams on the field simultaneously.
4. **Exodus** — Enemy draws 3 times from an empty deck (escalating fatigue damage).
5. **Timeout** — Turn 30 reached, highest HP wins (exact tie = Draw).
6. **Sudden Death** — From turn 31 on, both sides take 2 damage/turn until someone falls.
7. **Surrender** — Forfeit from the battle menu.

Full rules: [`GAME_RULES.md`](GAME_RULES.md).

## Card Design

Cards display:
- **🪙 Cost** — golden coin top-left (mana cost to buy during Bank Phase)
- **Name** — centered in top bar; faction name in small text below
- **★ Stars** — 0–5 stars between art and type bar showing rarity/priority
  - common=0, uncommon=1, rare=2, epic=3, legendary=4, mythic=5
- **⚔ ATK badge** — bottom-left corner, outside frame
- **🛡 DEF badge** — bottom-right corner, outside frame
- **Type bar** — inset/encasted look below stars

## Priority System

Rarer cards resolve first in combat:
`mythic(5) > legendary(4) > epic(3) > rare(2) > uncommon(1) > common(0)`

## Characters vs. Teams

Synthopwars has two independent card tags — see [`docs/CARDS.md`](docs/CARDS.md) for the full design doc:

- **Character** (which of the 9 classes you're playing) governs **deckbuilding legality** — only your
  Character's 8 signature cards, plus the shared Colorless pool, can go in your deck.
- **Team** (tribe) governs **battlefield synergy** — any card, Colorless or signature, still carries one
  of the 8 Team tags below, and 2+/3+ same-Team creatures on the field grant Ally/Synergy bonuses.

### The 9 Characters (pick one before deckbuilding)
| Character | Color | Axes (Cost·Stats·Engine·Choice·Tempo) |
|---|---|---|
| 🤖 Synthetic | Chrome Silver | 2·4·1·2·3 |
| 🦠 Memetic | Glitch Fuchsia | 2·1·5·5·2 |
| ⚗️ Refinist | Refined Bronze | 5·5·2·2·1 |
| 🕯️ Technopriest | Ritual Crimson | 4·3·4·2·2 |
| 🦾 Cyborg | Acid Lime | 1·3·1·2·5 |
| 🌱 Biopure | Deep Jade | 3·4·3·3·1 |
| 👻 Ethereal | Periwinkle | 2·1·4·4·3 |
| 🐝 Organizer | Indigo | 2·2·3·5·3 |
| ♟️ Schemist | Shadow Violet | 3·2·5·3·2 |

### The 8 Teams (tribal synergy — any Character can run these Colorless cards)
- **Overchargers** (red) — Aggression, speed, charge attacks
- **Fortress** (green) — Defense, tanks, regeneration
- **Control** (blue) — Disruption, mana drain, silence
- **Synergy** (purple) — Combo buffs, link chains
- **Economy** (gold) — Resource generation, late game
- **Chaos** (black) — Random effects, unpredictability
- **Synth Legends** (cyan) — Legendary synths, healing
- **Titanborn** (orange) — Massive stats, mountain tokens

## Keywords

~40 universal keywords plus 17 Character-locked keywords (e.g. Transmute, Replicate, Sacrament, Deploy,
Drift, Snare — one or two per Character). Full lists: [`GAME_RULES.md`](GAME_RULES.md) §6.

## Battlegrounds

| Battleground | Biome | Effect |
|---|---|---|
| Dalian Block | cyber | Traps hidden; Spells cost +1 |
| Mashhad Megacity | desert | Slow creatures can't attack first turn |
| London Reality | fog | Base row hidden until attacked |
| Star Beijing | neon | Spells cost -1; creatures lose 1 HP/turn |
| Lahore Republic | golden | Healing doubled; structures regen |
| Future Odessa | gravity | Max hand 7; -1 speed |
| The Gauntlet | fire | Pure skill — escalating opponents |

## Run

Open `index.html` in any modern browser.
