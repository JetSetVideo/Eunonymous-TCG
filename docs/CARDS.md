# Synthopwars — Card System & Character Design Document

*Version 3.0 — supersedes all character/faction descriptions in `GAME_RULES.md`, `docs/GDD.md`, `docs/rules.md`, and `README.md`, which are being aligned to this document. This is the canonical source for the card system, the Character layer, and the five design axes.*

---

## 1. Two Layers of Identity: Team (Tribe) vs. Character (Class)

Synthopwars cards carry **two independent tags**:

| Tag | What it answers | Cardinality | Effect |
|---|---|---|---|
| **Team** (Tribe) | "What faction culture does this card belong to?" | 8 Teams | Grants **Tribal Synergy** bonuses when 2+/3+ same-Team cards share the field (see `GAME_RULES.md` §8). Purely a battlefield synergy tag. |
| **Character** (Class) | "Who is allowed to own this card?" | 9 Characters + Colorless | Governs **deckbuilding legality**. A card tagged with a Character can only be bought, held, or played by a player who selected that Character. A card with no Character tag (`character: null`) is **Colorless** and legal for everyone. |

This split means the existing 8-Team, ~100-card pool (Overchargers, Fortress, Control, Synergy, Economy, Chaos, Synth Legends, Titanborn) does not get thrown away — it becomes the **Colorless pool**, open to every Character. The 9 new Characters add **signature cards** on top: a small, tightly-designed pool each Character alone can use. A Cyborg deck might run a Titanborn-tribe colorless card for its stats while still only that player's Cyborg signatures unlock the class-defining plays.

**Why this matters for the buy-during-battle economy:** the shared Metadeck (§4 of `GAME_RULES.md`) is built by shuffling both players' *personal* decks together. A personal deck can only contain: (a) Colorless cards, and (b) that player's own Character's signature cards. So even though the Metadeck is shared, a player will never draw a market offer they are mechanically unable to have chosen for their deck — the market simply reflects what both decks agreed to include.

---

## 2. Card Anatomy (recap, refined)

Every card carries these fields (matches the `ALL_CARDS` schema in `js/cards.js`):

| Field | Meaning | Notes |
|---|---|---|
| `id` | Unique key | Character cards use a 3-letter prefix (see §5) |
| `name` | Display name | |
| `type` | Creature / Spell / Trap / Structure / Action / Gear / Conspiracy / Role | |
| `team` | Tribal Synergy tag | One of the 8 Teams |
| `character` | Class-lock | One of the 9 Characters, or `null`/absent = Colorless |
| `rarity` | Common → Mythic | Drives priority order and copy limits |
| `cost` | Mana price in the Bank | What you pay to *buy* the card |
| `power` | Power price in the Main Phase | What you pay to *play* the card once bought |
| `attack` / `defense` / `health` | Combat stats | |
| `production` | Power generated per turn (Structures mainly) | |
| `speed` | Combat resolution order | |
| `range` | Melee(1) / Ranged(2) / Artillery(3) | |
| `comboId` | Legacy synergy tag from the original 8-Team design | Retained for backward compatibility |
| `ability` | Rules text | |
| `icon`, `desc` | Presentation | |

Nothing here changes structurally — the Character layer is additive (`character` field), so no existing card needs to change shape, only the new signature cards need the field populated.

---

## 3. The Five Axes

Every Character is rated **1 (low) to 5 (high)** on five independent axes. Together they form the Character's identity fingerprint and are the design contract every signature card must obey.

| # | Axis | Low (1) means... | High (5) means... |
|---|---|---|---|
| 1 | **Cost** | Signature cards are cheap; the whole curve tops out early. | Signature cards are expensive; the curve reaches deep into the late game. |
| 2 | **Stats** | Raw ATK/DEF/HP-per-Cost is below the pool average — the payoff is elsewhere. | Raw ATK/DEF/HP-per-Cost is above the pool average — the card wins by simply being bigger. |
| 3 | **Engine** | Almost no rules text; cards are "vanilla" and self-contained. | Dense, chaining, build-around abilities; cards actively read the board/graveyard/hand and combo with each other. |
| 4 | **Choice** | A small, tight signature pool (8 cards) with a narrow, repeated game plan. | The Character's cards create many *derivative* decisions in play — tokens, copies, reveal effects, branching triggers — so a "small" pool still produces a wide decision tree. |
| 5 | **Tempo** | Wants the game to run long — durdles early, dominates turns 20+. | Wants the game over fast — every signature card front-loads board impact and closes turns 4–8. |

These axes are deliberately **orthogonal**: Cost is about price tags, Stats is about numbers-per-price, Engine is about text density/interaction, Choice is about the size of the decision space the cards generate, Tempo is about *when* the deck wants to win. A Character can be cheap AND slow (Refinist-adjacent ramp), or expensive AND fast (not represented here, but the axes allow it) — nothing forces correlation.

### 3.1 Axis Radar — All Nine Characters

| Character | Cost | Stats | Engine | Choice | Tempo |
|---|:-:|:-:|:-:|:-:|:-:|
| Synthetic | 2 | 4 | 1 | 2 | 3 |
| Memetic | 2 | 1 | 5 | 5 | 2 |
| Refinist | 5 | 5 | 2 | 2 | 1 |
| Technopriest | 4 | 3 | 4 | 2 | 2 |
| Cyborg | 1 | 3 | 1 | 2 | 5 |
| Biopure | 3 | 4 | 3 | 3 | 1 |
| Ethereal | 2 | 1 | 4 | 4 | 3 |
| Organizer | 2 | 2 | 3 | 5 | 3 |
| Schemist | 3 | 2 | 5 | 3 | 2 |

Read as archetypes: **Cyborg** is the aggro rush deck (lowest Cost, highest Tempo). **Refinist** is the ramp/big-stats deck (highest Cost, highest Stats, lowest Tempo). **Memetic** and **Schemist** are the two combo/control engines (Engine 5), split by fantasy — Memetic replicates and infects, Schemist ambushes and steals. **Synthetic** and **Cyborg** are the two low-Engine "vanilla" decks, split by speed. **Organizer** has the widest Choice via token/network branching despite an ordinary Engine score. **Ethereal** and **Biopure** sit in the middle, trading Stats for reactive tricks (Ethereal) or grinding HP (Biopure).

### 3.2 How the Axes Drive Balance

A card's stat total (ATK+DEF+HP) should track the pool's `Stats` axis relative to its Cost:
- **Stats 5** (Refinist): total stats per Cost point ≈ **3.0–3.4** (best-in-game efficiency, paid for by narrow Choice and near-zero Tempo).
- **Stats 4** (Synthetic, Biopure): ≈ **2.4–2.8**.
- **Stats 3** (Technopriest, Cyborg): ≈ **1.8–2.2**, average pool efficiency.
- **Stats 1–2** (Memetic, Ethereal, Organizer, Schemist): ≈ **1.0–1.6** — the shortfall is the price of their Engine/Choice payoff.

An Engine-5 card should never *also* sit at the top of its Cost tier for stats — the text is the payoff, not the body. This is the guardrail that keeps Memetic and Schemist from being strictly better than Synthetic; it's checked per-card in §5.

---

## 4. Colorless Cards

The existing 8-Team pool (`js/cards.js`, ids `oc_ fr_ ct_ sy_ ec_ ch_ sl_ tb_` plus the neutral `nt_`, `ac_`, `ag_`, `cp_`, `gr_`, `sh_`, `my_` families) is redesignated **Colorless**. Any Character may buy, hold, and play any Colorless card. Colorless cards keep their `team` tag for Tribal Synergy but carry no `character` tag.

Colorless cards exist to:
1. Fill curve gaps a Character's narrow signature pool leaves open (especially for Refinist, Cyborg, and Technopriest, whose signature pools are only 8 cards each).
2. Give every Character access to the 8 Tribal Synergy bonuses regardless of class.
3. Keep the shared Metadeck large enough that the Bank market rarely runs dry mid-match.

**Design rule:** Colorless cards must stay near the pool-average Stats/Cost ratio (~2.0–2.4 total stats per Cost) and carry no Character-restricted keyword (Transmute, Sacrament, Replicate, Infect, Deploy, Network, Drift, Manifest, Snare, Gambit, Overclock/Adrenaline, Bloom/Symbiosis — see §5). Those ten keyword families are what make a card feel like it belongs to a Character; keeping them off Colorless cards is what keeps the Character layer meaningful.

---

## 5. The Nine Characters

Each entry gives: fantasy, color, new keyword(s) introduced, axis identity, and its 8 signature cards. Card stat blocks are final and ready for transcription into `js/cards.js` (Stage 2 of the implementation).

Deck-legality reminder: a Character's *signature* pool is only 8 cards. Their **starter deck** (40 cards, per §6) is therefore always signature cards + a curated slice of Colorless cards — this is intentional and is what "an already-defined deck that can be modified" means in practice.

---

### 5.1 Synthetic — Chrome Silver `#9fb4c7` — 🤖
*"No flourish, no waste. The number on the chassis is the whole argument."*
Mass-produced android infantry out of the Star Beijing assembly stacks. The class of best-stats-for-cost with almost no rules text — what you see printed is what you get.

**Axes:** Cost 2 · Stats 4 · Engine 1 · Choice 2 · Tempo 3
**Keyword:** *Precision* — ignores Stealth and Cover when choosing a target.

| id | Name | Type | Rarity | Cost/Pwr | ATK/DEF/HP | Ability |
|---|---|---|---|:-:|:-:|---|
| syt_001 | Drone Sentinel | Creature | Common | 1/1 | 2/2/2 | — (vanilla) |
| syt_002 | Line Trooper | Creature | Common | 2/2 | 4/3/3 | — (vanilla) |
| syt_003 | Calibrated Marksman | Creature | Uncommon | 3/3 | 5/3/3 | Precision. Range 2. |
| syt_004 | Efficiency Directive | Action | Uncommon | 3/3 | — | Reduce the Power cost of your next creature played this turn by 2 (min 1). |
| syt_005 | Bulwark Unit | Creature | Rare | 4/4 | 5/7/7 | — (vanilla) |
| syt_006 | Assembly Line | Structure | Rare | 5/5 | —/—/5 (prod 1) | Whenever you play a Synthetic creature, gain 1 Power this turn only. |
| syt_007 | Apex Chassis | Creature | Epic | 6/6 | 9/8/8 | Precision. |
| syt_008 | Prime Directive Warden | Creature | Legendary | 7/7 | 10/10/10 | Precision. Immortal. |

---

### 5.2 Memetic — Glitch Fuchsia `#f92aff` — 🦠
*"An idea doesn't need a body to spread."*
Rogue signal-cults out of the Dalian Block data markets, running on hijacked ad-servers. Fragile bodies, exponential effects.

**Axes:** Cost 2 · Stats 1 · Engine 5 · Choice 5 · Tempo 2
**Keywords:** *Replicate* — on play, create a token copy of the cheapest Colorless creature you control (a 1/1 Meme Fragment if none). *Infect* — attach to an enemy creature: it loses 1 ATK per turn; if it dies while Infected, Infect jumps to a random adjacent enemy creature.

| id | Name | Type | Rarity | Cost/Pwr | ATK/DEF/HP | Ability |
|---|---|---|---|:-:|:-:|---|
| mem_001 | Meme Fragment | Creature | Common | 1/1 | 1/1/1 | When this dies, create a copy of it if you control 2+ other Memetic cards. |
| mem_002 | Glitch Whisperer | Creature | Common | 2/2 | 1/1/2 | Deals 0 combat damage; Infects the defender instead of dealing damage. |
| mem_003 | Copycat Splicer | Creature | Uncommon | 2/2 | 2/1/2 | Replicate. |
| mem_004 | Viral Payload | Spell | Uncommon | 3/3 | — | Infect all enemy creatures. Draw a card for each creature Infected this way (max 3). |
| mem_005 | Idea Parasite | Creature | Rare | 3/3 | 2/2/3 | Whenever an enemy creature dies while Infected, this gains +1/+1 permanently. |
| mem_006 | Echo Chamber | Structure | Rare | 4/4 | —/—/4 (prod 1) | Your Replicate triggers twice. Replicated Colorless creatures keep their printed abilities. |
| mem_007 | Signal Broadcaster | Creature | Epic | 5/5 | 3/3/4 | Replicate. Whenever you Replicate a creature, deal 1 damage to the enemy base. |
| mem_008 | Patient Zero | Creature | Legendary | 6/6 | 4/3/5 | Infect spreads to ALL enemy creatures on the host's death. Replicate copies the last creature that died this turn (either side) at 50% stats. |

---

### 5.3 Refinist — Refined Bronze `#c9822e` — ⚗️
*"Nothing is waste. Everything is one process away from being useful."*
Alchemist-engineers of Future Odessa, feeding creatures into the crucible to forge better ones. Highest cost curve, highest raw stats, in exchange for the slowest clock in the game.

**Axes:** Cost 5 · Stats 5 · Engine 2 · Choice 2 · Tempo 1
**Keywords:** *Transmute* — sacrifice a friendly Colorless creature: this permanently gains that creature's printed ATK/DEF/HP, and its own Power cost this game is reduced by the sacrificed creature's Cost (min 1). *Refine* — at end of turn, convert 1 unused Mana into +1 permanent Production.

| id | Name | Type | Rarity | Cost/Pwr | ATK/DEF/HP | Ability |
|---|---|---|---|:-:|:-:|---|
| ref_001 | Ore Sifter | Structure | Common | 2/2 | —/—/3 (prod 1) | Refine. |
| ref_002 | Apprentice Alchemist | Creature | Common | 2/2 | 2/2/2 | Transmute. |
| ref_003 | Crucible Adept | Creature | Uncommon | 3/3 | 3/3/3 | Transmute. |
| ref_004 | Distillation Rite | Spell | Uncommon | 3/3 | — | Sacrifice a friendly Colorless creature: gain Power equal to twice its Cost, this turn only. |
| ref_005 | Master Refiner | Creature | Rare | 4/4 | 4/5/5 | Transmute. Whenever this Transmutes, it also gains +1 Production permanently if you control a Structure. |
| ref_006 | The Great Forge | Structure | Rare | 5/5 | —/—/6 (prod 2) | Refine. Your Transmute effects also heal your base 2 HP. |
| ref_007 | Grand Transmuter | Creature | Epic | 6/6 | 6/8/8 | Transmute — may sacrifice creatures that died this turn (yours or the opponent's), not just ones you control. |
| ref_008 | Philosopher's Core | Creature | Legendary | 8/8 | 10/12/12 | Transmute (no reduction cap). Refine. On play, if you have 2+ creatures in your graveyard, auto-Transmutes with one of them for free. |

---

### 5.4 Technopriest — Ritual Crimson `#b0203c` — 🕯️
*"The Machine God does not want your creature. It wants your creature's death."*
Techno-religious order out of Mashhad Megacity that reads sacrifice as liturgy. Mid-late payoff engine that gets stronger the more of its own cards fill the graveyard.

**Axes:** Cost 4 · Stats 3 · Engine 4 · Choice 2 · Tempo 2
**Keywords:** *Sacrament* — on play, you may sacrifice a friendly creature; if you do, this gains +2/+2 and its ability (if any) triggers immediately. *Devotion* — gains +1/+1 permanently for each Technopriest card in your graveyard.

| id | Name | Type | Rarity | Cost/Pwr | ATK/DEF/HP | Ability |
|---|---|---|---|:-:|:-:|---|
| tec_001 | Acolyte of the Core | Creature | Common | 2/2 | 1/2/2 | Devotion. |
| tec_002 | Censer Bearer | Creature | Common | 2/2 | 2/1/2 | Sacrament. |
| tec_003 | Rite of Ash | Spell | Uncommon | 3/3 | — | Sacrifice a friendly creature: deal damage equal to its HP to an enemy creature or the enemy base. |
| tec_004 | Doctrine Enforcer | Creature | Uncommon | 3/3 | 3/3/3 | Sacrament. Devotion. |
| tec_005 | Reliquary | Structure | Rare | 4/4 | —/—/5 (prod 1) | Whenever a Technopriest creature you control dies, gain 1 Power immediately. |
| tec_006 | High Inquisitor | Creature | Rare | 5/5 | 5/4/5 | Sacrament. Devotion. If a sacrifice was made on play, Silence the strongest enemy creature. |
| tec_007 | The Cardinal Engine | Creature | Epic | 6/6 | 6/6/7 | Sacrament (may sacrifice up to 2 creatures). Devotion. |
| tec_008 | Voice of the Machine God | Creature | Legendary | 7/7 | 7/7/8 | Devotion. Sacrament — sacrifice also deals its ATK to the enemy base. On play, if 3+ Technopriest cards are in your graveyard, resurrect one as a 1/1 token. |

---

### 5.5 Cyborg — Acid Lime `#7cff2a` — 🦾
*"You don't out-think the Redline. You get run over by it."*
Street-augmented brawlers from Dalian Block's underdecks. The lowest curve and the highest Tempo in the game — cheap, simple, relentless.

**Axes:** Cost 1 · Stats 3 · Engine 1 · Choice 2 · Tempo 5
**Keywords:** *Overclock* — may attack a second time this turn; after the second attack, this takes 1 self-damage. *Adrenaline* — gains permanent +1 ATK whenever it deals damage directly to the enemy base.

| id | Name | Type | Rarity | Cost/Pwr | ATK/DEF/HP | Ability |
|---|---|---|---|:-:|:-:|---|
| cyb_001 | Scrap Runner | Creature | Common | 1/1 | 2/1/1 | Charge. |
| cyb_002 | Piston Fist | Creature | Common | 1/1 | 3/1/2 | Adrenaline. |
| cyb_003 | Redline Ganger | Creature | Uncommon | 2/2 | 4/1/2 | Charge. Overclock. |
| cyb_004 | Nitro Injection | Spell | Uncommon | 2/2 | — | Give a creature Charge and +2 ATK this turn. |
| cyb_005 | Streetfight Champion | Creature | Rare | 3/3 | 5/2/3 | Overclock. Adrenaline. |
| cyb_006 | Junction Overload | Trap | Rare | 3/3 | — | When an enemy creature attacks: it takes 3 damage and that player's Power is reduced by 2 next turn. |
| cyb_007 | Berserk Chassis | Creature | Epic | 4/4 | 7/2/4 | Charge. Overclock. Adrenaline. |
| cyb_008 | The Redline | Creature | Legendary | 5/5 | 8/3/5 | Charge. Overclock (up to a 3rd attack, 1 self-damage per extra attack). Adrenaline. |

---

### 5.6 Biopure — Deep Jade `#1f9e6e` — 🌱
*"Augment nothing. Grow everything."*
Anti-cybernetic naturalists holding the last green ground in Lahore Republic. Slow, tanky, and self-sustaining.

**Axes:** Cost 3 · Stats 4 · Engine 3 · Choice 3 · Tempo 1
**Keywords:** *Bloom* — at the start of your turn, heal your base 1 HP for each Biopure creature you control. *Symbiosis* — gains ATK/DEF equal to half the DEF of an adjacent ally (rounded down).

| id | Name | Type | Rarity | Cost/Pwr | ATK/DEF/HP | Ability |
|---|---|---|---|:-:|:-:|---|
| bio_001 | Seedling Warden | Creature | Common | 2/2 | 1/4/4 | Regenerate. |
| bio_002 | Rootbound Healer | Creature | Common | 2/2 | 1/3/3 | Bloom. |
| bio_003 | Mycelial Network | Structure | Uncommon | 3/3 | —/—/5 (prod 1) | Bloom. All Biopure creatures you control gain Regenerate. |
| bio_004 | Photosynthesis | Spell | Uncommon | 3/3 | — | Heal all friendly creatures 3 HP and your base 3 HP. |
| bio_005 | Thornback Guardian | Creature | Rare | 4/4 | 3/6/6 | Symbiosis. Thorns. |
| bio_006 | Elder Bloomtree | Creature | Rare | 5/5 | 4/8/8 | Bloom. Regenerate. |
| bio_007 | Verdant Colossus | Creature | Epic | 6/6 | 6/10/10 | Symbiosis. Regenerate. Bloom. |
| bio_008 | The World Root | Creature | Legendary | 7/7 | 7/12/12 | Bloom (double healing). Regenerate. Symbiosis. Immortal. |

---

### 5.7 Ethereal — Periwinkle `#a48cff` — 👻
*"You cannot counter what isn't fully there yet."*
Phase-shifted energy remnants haunting London Reality's permanent fog. Fragile bodies, dense toolbox of reactive, ambush-shaped effects.

**Axes:** Cost 2 · Stats 1 · Engine 4 · Choice 4 · Tempo 3
**Keywords:** *Drift* — cannot be targeted by enemy creature abilities until it has attacked; may swap battle-row positions with another Ethereal creature for free, once per turn. *Manifest* — may be played face-down as a 0/0 Ward token for 1 Power; flip it up anytime by paying the difference to its printed Power cost to reveal full stats and trigger its on-play ability.

| id | Name | Type | Rarity | Cost/Pwr | ATK/DEF/HP | Ability |
|---|---|---|---|:-:|:-:|---|
| eth_001 | Flicker Wisp | Creature | Common | 1/1 | 1/1/1 | Drift. |
| eth_002 | Static Echo | Creature | Common | 2/2 | 1/1/2 | Manifest. |
| eth_003 | Phase Walker | Creature | Uncommon | 2/2 | 2/1/2 | Drift. Phase. |
| eth_004 | Veil of Static | Spell | Uncommon | 3/3 | — | Target friendly creature gains Drift and Ward until your next turn. |
| eth_005 | Signal Ghost | Creature | Rare | 3/3 | 2/2/2 | Manifest. Drift. |
| eth_006 | Resonant Rift | Trap | Rare | 3/3 | — | When targeted by an enemy spell or ability: negate it, then Manifest a random Ethereal card from your hand for free. |
| eth_007 | Half-Light Sentinel | Creature | Epic | 4/4 | 3/3/3 | Drift. Manifest. Ward. |
| eth_008 | The Unseen | Creature | Legendary | 5/5 | 4/3/4 | Drift. Manifest. Stealth until it attacks. Ward. |

---

### 5.8 Organizer — Indigo `#2f6fed` — 🐝
*"One of us is nothing. Forty of us is a supply chain."*
Hive-logistics network out of Star Beijing's warehouse districts. Individually weak, structurally relentless — the widest decision tree in the game via token/network branching.

**Axes:** Cost 2 · Stats 2 · Engine 3 · Choice 5 · Tempo 3
**Keywords:** *Deploy* — on play, create 2 additional 0-cost 1/1 Worker tokens (Colorless, no abilities) in open adjacent slots. *Network* — gains +1 Production permanently whenever you play another Organizer card or a Colorless Structure.

| id | Name | Type | Rarity | Cost/Pwr | ATK/DEF/HP | Ability |
|---|---|---|---|:-:|:-:|---|
| org_001 | Worker Drone | Creature | Common | 1/1 | 1/1/1 | — (the token unit itself; also purchasable directly) |
| org_002 | Cell Coordinator | Creature | Common | 2/2 | 1/2/2 | Deploy. |
| org_003 | Logistics Node | Structure | Uncommon | 2/2 | —/—/3 (prod 1) | Network. |
| org_004 | Mobilization Order | Spell | Uncommon | 3/3 | — | Deploy twice (4 Worker tokens total, split across open slots). |
| org_005 | Hive Overseer | Creature | Rare | 3/3 | 2/3/3 | Deploy. Whenever a Worker token you control dies, gain 1 Power. |
| org_006 | Distribution Hub | Structure | Rare | 4/4 | —/—/4 (prod 2) | Network. All Worker tokens you control gain +1/+1. |
| org_007 | The Swarm Mind | Creature | Epic | 5/5 | 3/4/4 | Deploy (3 tokens). Network. While you control 5+ creatures, gains Taunt and +2/+2. |
| org_008 | Central Directive | Creature | Legendary | 6/6 | 4/5/5 | Deploy (4 tokens; overflow tokens fill the Base row as 0/1 if Battle Row is full). Network. |

---

### 5.9 Schemist — Shadow Violet `#4a1f5c` — ♟️
*"The winning move was decided three turns before you noticed you were playing."*
Deception specialists working the black markets between all six Neo-Cities. Highest Engine score alongside Memetic, but built from ambush and theft instead of replication.

**Axes:** Cost 3 · Stats 2 · Engine 5 · Choice 3 · Tempo 2
**Keywords:** *Snare* — a Trap that also Silences and Stuns (skips the triggering creature's next attack) in addition to its stated effect. *Gambit* — when this would be destroyed, flip a coin: on a win it survives at 1 HP instead (once per card).

| id | Name | Type | Rarity | Cost/Pwr | ATK/DEF/HP | Ability |
|---|---|---|---|:-:|:-:|---|
| sch_001 | Cutpurse | Creature | Common | 1/1 | 2/1/1 | Stealth. |
| sch_002 | False Ledger | Trap | Common | 2/2 | — | Snare — deals 2 damage to the triggering creature. |
| sch_003 | Double Agent | Creature | Uncommon | 2/2 | 2/2/2 | Gambit. |
| sch_004 | Forged Contract | Spell | Uncommon | 3/3 | — | Look at the enemy hand; force them to discard the card of your choice. |
| sch_005 | Ambush Warren | Trap | Rare | 3/3 | — | Snare — also summons a 2/2 Cutthroat token onto the triggering creature's now-empty slot. |
| sch_006 | Puppet Master | Creature | Rare | 4/4 | 3/3/3 | Gambit. When an enemy Trap triggers, this may trigger a copy of it in your favor. |
| sch_007 | The Long Con | Conspiracy | Epic | 5/5 | — | Set face-down. Trigger: once you've bought/drawn 2+ more cards than your opponent this game, deal 6 damage to the enemy base. |
| sch_008 | The Kingmaker | Creature | Legendary | 6/6 | 5/4/4 | Gambit. Snare (this creature's attacks also Silence + Stun). Whenever an enemy Trap or Conspiracy is revealed, copy it under your control. |

---

## 6. Deck Construction with a Character

1. **Pick a Character first.** This is now a mandatory pre-game step before the deck builder opens (see `GAME_RULES.md` §2, updated).
2. The deck builder opens pre-loaded with that Character's **starter deck** — a ready-to-play 40-card list combining all 8 signature cards (2 copies of Commons/Uncommons where the copy limit allows, 1 copy of Rares+, per the existing `COPY_LIMITS` table) plus a curated Colorless filler chosen to complete the curve and hit the ≥20-creature minimum.
3. **The player may freely modify** the starter deck: swap any card for another card their Character is legal to run (their own 8 signatures + any Colorless card), subject to the existing rules in `js/cards.js::validateDeck` (40 cards, ≥20 creatures, copy limits, type caps).
4. Card pool shown in the deck builder = 8 signature cards (highlighted in the Character's color) + all ~100 Colorless cards. Cards belonging to *other* Characters are not selectable and are hidden from the builder entirely, not merely grayed out — a player should never have to wonder why a card they can see is unusable.
5. Once both players lock in, decks are shuffled together into the Metadeck exactly as today (`GAME_RULES.md` §2/§4) — the Character choice has already done its job by the time the match starts.

### 6.1 Starter Deck Shape (all 9 Characters)

Every starter deck targets the same skeleton so Characters remain comparable in raw deck construction, even though their axis identities differ sharply in play:

| Slice | Count | Source |
|---|:-:|---|
| Signature creatures | up to 12 (2 copies of each Common/Uncommon signature creature, 1 of each Rare+) | Character pool |
| Signature non-creatures | up to 6 (1–2 copies each) | Character pool |
| Colorless creatures | remainder, to reach 22–24 creatures total | Colorless pool, biased toward the Character's own Team-tribe affinity (see §6.2) |
| Colorless non-creatures | remainder, to reach 40 | Colorless pool |

### 6.2 Suggested Tribal Affinity (flavor, not a hard rule)

Each Character's starter deck leans on one Colorless Team for flavor cohesion — this is a deckbuilding *suggestion* baked into the starter list, not an enforced restriction (a player can still pick any Colorless card):

| Character | Suggested Team lean | Why |
|---|---|---|
| Synthetic | Titanborn | shared "raw numbers" philosophy |
| Memetic | Chaos | shared unpredictability/virality |
| Refinist | Economy | shared ramp/greed philosophy |
| Technopriest | Control | shared denial-through-attrition feel |
| Cyborg | Overchargers | shared rush philosophy |
| Biopure | Fortress | shared tank/heal philosophy |
| Ethereal | Synth Legends | shared "ancient/otherworldly" feel |
| Organizer | Synergy | shared stacking/linking philosophy |
| Schemist | Control | shared disruption philosophy (Technopriest and Schemist both lean Control from different angles — attrition vs. deception) |

---

## 7. New Keywords Introduced by This Document

These 12 keywords are added to `KEYWORDS`/`KEYWORD_DESCRIPTIONS` in `js/cards.js` and are **Character-locked flavor** — they never appear on a Colorless card (see §4):

| Keyword | Character | One-line rule |
|---|---|---|
| Precision | Synthetic | Ignores Stealth and Cover when choosing a target. |
| Replicate | Memetic | On play, create a token copy of the cheapest Colorless creature you control (1/1 Meme Fragment if none). |
| Infect | Memetic | Attached creature loses 1 ATK/turn; spreads to a random adjacent enemy on the host's death. |
| Transmute | Refinist | Sacrifice a friendly Colorless creature: gain its stats permanently, reduce this card's Power cost by the sacrifice's Cost. |
| Refine | Refinist | At end of turn, convert 1 unused Mana into +1 permanent Production. |
| Sacrament | Technopriest | On play, may sacrifice a friendly creature for +2/+2 and an immediate ability trigger. |
| Devotion | Technopriest | +1/+1 permanently per Technopriest card in your graveyard. |
| Overclock | Cyborg | May attack a 2nd time this turn; takes 1 self-damage after each extra attack. |
| Adrenaline | Cyborg | +1 ATK permanently whenever this deals damage directly to the enemy base. |
| Bloom | Biopure | At start of turn, heal your base 1 HP per Biopure creature you control. |
| Symbiosis | Biopure | Gains ATK/DEF equal to half an adjacent ally's DEF (rounded down). |
| Drift | Ethereal | Untargetable by enemy creature abilities until it attacks; free position-swap with another Ethereal, once/turn. |
| Manifest | Ethereal | May be played face-down as a 0/0 Ward token for 1 Power; flip later by paying the cost difference. |
| Deploy | Organizer | On play, create 2 extra 0-cost 1/1 Worker tokens in open adjacent slots. |
| Network | Organizer | +1 Production permanently whenever you play another Organizer card or a Colorless Structure. |
| Snare | Schemist | A Trap that also Silences + Stuns its target, on top of its stated effect. |
| Gambit | Schemist | On lethal damage, coin-flip to survive at 1 HP instead (once per card). |

*(17 listed — the "12" figure above undercounts; every Character contributes 1–2, for 17 total across 9 Characters.)*

---

## 8. Implementation Checklist

- [ ] Add `character: null` to every existing `ALL_CARDS` entry implicitly (no field = Colorless; no code change required, `card.character` will simply read `undefined`).
- [ ] Add the 72 signature cards above to `js/cards.js` (or a new `js/characters.js` requiring `ALL_CARDS.push(...)`), each with `character: '<Name>'`.
- [ ] Add a `CHARACTERS` registry: `{ id, name, color, icon, tagline, axes: {cost,stats,engine,choice,tempo}, keywords: [...], signatureCardIds: [...], starterDeckIds: [...] }` for all 9.
- [ ] Add the 17 new keywords to `KEYWORDS` / `KEYWORD_DESCRIPTIONS`.
- [ ] Add a **Character Select** screen before the Deck Builder in `index.html`, gating deck-builder card visibility to Colorless + the chosen Character.
- [ ] Update `js/cards.js::validateDeck` to reject any card whose `character` is set and does not match the active player's chosen Character.
- [ ] Generate the 9 starter decklists per §6.1–6.2 and store them alongside the `CHARACTERS` registry.

This document is the design source of truth; the checklist above is tracked and executed in the accompanying implementation pass (see `docs/REDESIGN_PROGRESS.md`).
