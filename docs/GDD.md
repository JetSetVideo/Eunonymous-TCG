# Synthopwars — Game Design Document (v3.0)

*This document covers everything that isn't a rule of play or a card spec. For those, see:*
- ***Rules of play**: `../GAME_RULES.md`*
- ***Card system, 5-axis Character design, all 9 Characters and their signature cards**: `CARDS.md`*

## 1. Game Overview

**Name:** Synthopwars
**Genre:** Deckbuilder / TCG Battleground — inspired by Hearthstone and Star Realms
**Setting:** Synthtopia Universe — 6 Neo-Cities fighting for control of the Great Vault
**Players:** 1v1 (bot or human) per match
**Session Length:** 5–20 minutes
**Platform:** Browser (HTML5), no build step

**Core Loop:** Pick a Character (see `CARDS.md`) → Build/modify your 40-card starter deck → Select a
Battleground → Bank Phase (buy cards with Mana) → Combat Phase (play from hand, attack) → Win/Lose →
Improve Deck.

---

## 2. Deck Archetypes — Team (Tribal) Strategies

These 6 strategies describe how the 8 **Teams** (tribal synergy tags — Overchargers, Fortress, Control,
Synergy, Economy, Chaos, plus Synth Legends/Titanborn as high-rarity capstones) play out on the field.
They are orthogonal to **Character** choice (`CARDS.md`) — a Cyborg deck leaning Overcharger-tribe
Colorless cards plays very differently from a Refinist deck doing the same, because the Character layer
governs signature cards/axis identity while the Team layer governs field synergy bonuses (`GAME_RULES.md`
§8).

### 2.1 Overcharge (Red/Fast)
Win by turn 5–7. Flood the board with cheap, fast creatures, ignore Defense, hit the base directly.
**Counters:** Control, Fortress. **Risk:** runs out of gas if the opponent survives.

### 2.2 Fortress (Green/Tank)
Outlast the opponent — walls and healing. **Counters:** Economy, Control. **Risk:** can be overrun early
without blockers.

### 2.3 Control (Blue/Disruption)
Deny resources, win through attrition — traps, counter-spells, debuffs. **Counters:** Overcharge, Synergy.
**Risk:** needs precise timing.

### 2.4 Synergy (Purple/Buff)
Stack buffs into overwhelming single units — Combo IDs, buff spells, aura structures. **Counters:**
Control, Chaos. **Risk:** vulnerable to board wipes.

### 2.5 Economy (Gold/Late)
Survive early, dominate late — Power generators, high-cost creatures, resource doubling. **Counters:**
Overcharge, Control. **Risk:** weak early game.

### 2.6 Chaos (Black/RNG)
Unpredictability — random damage, shuffles, steal effects. **Counters:** Fortress, Synergy. **Risk:**
high variance, can sabotage itself.

---

## 3. Battle System

### 3.1 Battlefield Layout
```
+--------------------------------------------------+
|  [COMMAND ZONE]     [BASE ROW x5]    [TRAP x3]  |
|                                                   |
|  [BATTLE ROW x5]                                 |
|                                                   |
|  [HAND]  [POWER: 0/12]  [BASE HP: 30/30]         |
+--------------------------------------------------+
```
Combat math, turn phases, targeting, and win conditions are specified in `../GAME_RULES.md` — this
document only covers layout and presentation.

---

## 4. Battlegrounds

### 4.1 Neo-City Fields
Each battleground has an environmental effect.

| Battleground | Theme | Effect |
|--------------|-------|--------|
| **Dalian Block** | Cyber-rain | Traps are hidden. Spells cost +1 Power. |
| **Mashhad Megacity** | Desert storm | Creatures with Speed < 3 cannot attack on first turn. |
| **London Reality** | Fog | Only Battle Row visible. Base Row hidden until attacked. |
| **Star Beijing** | Neon overload | All spells cost -1 Power. Creatures lose 1 HP/turn. |
| **People's Republic of Lahore** | Golden hour | Healing doubled. Structures regenerate 1 HP/turn. |
| **Future Odessa** | Gravity wells | Max hand size = 7. Excess draws are discarded. |
| **The Gauntlet** | Fire | Pure skill — escalating opponents, no environmental twist. |

---

## 5. Features

### 5.1 Deck Builder
- 40-card deck, opens pre-loaded with the chosen Character's starter deck (`CARDS.md` §6).
- Copy limits by rarity: Common (4), Uncommon (4), Rare (3), Epic (2), Legendary (1), Mythic (1).
- Auto-suggest synergy cards (Team-tribal and Character-signature).
- Import/export deck codes.
- Deck validation (minimum 20 creatures, max 10 spells/actions, Character-lock enforced — `GAME_RULES.md` §2.2).

### 5.2 Custom Card Backs
- 15 unlockable card back designs; a Character's chosen color (see `CARDS.md` §5) is available as a
  default back tint.
- NFT holders can use their NFT art as card back.
- Seasonal/event exclusive backs.

### 5.3 Friends List
Add by username or player ID. Online/offline status. Challenge to 1v1. Match history.

### 5.4 Chat System
Global chat (lobby), Battleground chat (spectator + players), private messages (friends), team chat
(2v2 mode), quick emotes (15 default, unlockable).

### 5.5 Settings
- **Audio:** Master, Music, SFX, Voice sliders.
- **Visual:** Card size, animation speed, colorblind mode.
- **Gameplay:** Auto-pass, confirm attacks, turn timer warning.
- **Privacy:** Public, Friends Only, Invisible.
- **Language:** English (default), Spanish, French, Japanese, Mandarin.

### 5.6 Animations
See `GAME_RULES.md` §11 for the timing/meaning principle. Baseline durations:
- Card draw: 0.3s slide
- Play creature: 0.5s materialize
- Attack: 0.5s lunge + 0.2s shake
- Spell cast: 1.0s projectile + impact
- Trap trigger: 0.8s reveal + 1.0s effect
- Character-keyword trigger (Replicate, Transmute, Deploy, etc.): 0.6s glow-pulse in the Character's color
- Combo: 1.5s cinematic + field flash
- Victory: 3.0s sequence + confetti

### 5.7 Sound Effects
Card draw: soft whoosh. Play creature: deep thud. Attack: sharp slash + metal clink. Spell: elemental
chime. Trap: tension string + snap. Combo: crescendo chord. Victory: brass fanfare. Defeat: low drone fade.

---

## 6. World Building

### 6.1 Lore
Full lore and lexicon: `../assets/lore/world.txt`.

In the year 2187, the 6 Neo-Cities discover the **Great Vault** — an ancient repository of infinite
power. Each city sends its best Commanders to claim it. Every player picks a Character (`CARDS.md`) —
one of nine ways of *being* a Commander — before they even build a deck.

### 6.2 Factions (Teams)
See `GAME_RULES.md` §8 for the mechanical synergy table. Full lore per Team: `../assets/lore/world.txt`.

### 6.3 Characters (Commanders)
The old "9 French-titled Roles" (Artiste, Policier, Docteur, etc.) are retired and replaced by the 9
**Characters** — Synthetic, Memetic, Refinist, Technopriest, Cyborg, Biopure, Ethereal, Organizer,
Schemist. Full identity, 5-axis ratings, and signature cards: `CARDS.md` §5. Full lore: `../assets/lore/world.txt`.

---

## 7. Progression

### 7.1 Currencies
- **Credits:** Soft currency. Earned from matches. Used for packs.
- **Synth:** Hard currency. Earned from ranked/tournaments. Used for NFT packs.

### 7.2 Rewards
Daily missions (3/day, 1 cancelable). Achievements (card backs, titles, emotes). Season pass (30-day
cycles). Ranked leagues (Bronze → Grandmaster).

---

## 8. Technical

- **Engine:** Vanilla HTML5 Canvas + CSS3
- **Audio:** Web Audio API
- **Storage:** localStorage + IndexedDB for offline
- **Multiplayer:** WebRTC P2P (casual), planned WebSocket (ranked)
- **Resolution:** Responsive (desktop + tablet)

---

*Document Version: 3.0 — Synthopwars © 2026*
