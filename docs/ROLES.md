# Roles & Characters — the identity layer

Decision (JetSetVideo, 2026-09-21): **map the 9 Characters onto the 9 GDD Roles.**
Keep both. Characters become role variants.

## Why two layers

| Layer | File | Holds | Changes when |
|---|---|---|---|
| **Role** | `js/roles.js` | Mechanics: passive bonus + active ability, per GDD §4 | Rules/balance change |
| **Character** | `js/characters.js` | Identity: art, lore, tribe, 8 signature cards, starter deck | Art/content change |

This split is what makes the mapping cheap: every existing artwork, signature card
and starter deck survives untouched — only the mechanical layer is introduced.

```
ROLE  Architecte  (mechanics: 6 base slots, Fortify)
  └── CHARACTER  Synthetic   (art 🏗️-presenting, Titanborn, syt_001..008)
ROLE  Politicien  (mechanics: +5 Base HP, Propaganda)
  └── CHARACTER  Memetic     (art, Chaos tribe, mem_001..008)
```

A role may eventually host **several** characters (variants). Today it is 1:1.

## The 9 Roles (verbatim from GDD §4)

| Role | Colour | Passive | Active (CD 3 turns) |
|---|---|---|---|
| Artiste | Magenta | Spells cost -1 (min 1) | Masterpiece — draw 2; next spell free |
| Policier | Blue | Traps activate twice | Lockdown — enemy can't play traps next turn; remove Stealth |
| Docteur | White | Healing +50% | Triage — restore 8 Base HP, or revive a creature at 50% |
| Ingénieur | Orange | Structures +2 HP | Overclock — structures double Power this turn |
| Cuisinier | Yellow | Tokens +1/+1 | Feast — two 2/2 Food tokens with Cover |
| Politicien | Purple | +5 Base HP (35) | Propaganda — steal 1 random card from opponent's hand |
| Architecte | Brown | Base Row = 6 slots | Fortify — free 0/8 Wall |
| Professeur | Green | Draw phase +1 card | Research — look at top 3, draw 1 |
| Juge | Black | Requiem triggers twice | Verdict — destroy a creature with ATK > 5, ignores Cover |

## The mapping (PROPOSAL — needs sign-off)

| Character | → Role | Fit | Rationale |
|---|---|---|---|
| Synthetic | Architecte | strong | Titanborn sturdiness; "no flourish, no waste" = immovable base-building |
| Memetic | Politicien | strong | Replicate/Infect = ideas spreading; Propaganda steals from hand |
| Refinist | Ingénieur | strong | Transmute/Refine = resource conversion; Economy tribe = the Power engine |
| Technopriest | Juge | strong | Sacrament/Devotion = ritual death; Requiem ×2 is the whole kit |
| Biopure | Docteur | strong | Bloom/Symbiosis = growth and sustain; +50% healing |
| Organizer | Cuisinier | strong | Deploy/Network = swarm; tokens +1/+1 rewards going wide |
| Schemist | Policier | strong | Snare/Gambit *is* trap play; traps activating twice is the literal kit |
| Ethereal | Professeur | ok | Drift/Manifest = partial information and foresight; Research fits |
| **Cyborg** | **Artiste** | **weak** | **Cyborg is the aggro/tempo identity — and the GDD has no aggro role. See gap #1.** |

## Known gaps in the GDD (flagged, not silently resolved)

**Gap 1 — there is no aggro role.** Cyborg's identity is tempo 5, Overchargers,
Overclock/Adrenaline: the fast deck. None of the 9 roles is fast. Artiste is the
nearest (burst via cheap spells) but it is a spell-mastery role, not a rush role.
Either Cyborg is underserved, or the GDD is missing a 10th role. **Decide: add an
aggro role, or accept Cyborg-as-Artiste.**

**Gap 2 — sacrifice has no home.** Technopriest's Sacrament sacrifices its own
creatures. Juge's Requiem (death triggers) is the closest mechanic, but the GDD has
no dedicated sacrifice/aristocrats role.

**Gap 3 — the build contradicts the GDD's economy.** The GDD specifies a **5-card
starting hand** from the mixed pool; the build uses a **0-card zero-start economy**
where everything is bought from the Metadeck. This changes the entire opening curve
and therefore the power ranking of every cheap card. **Must be resolved before any
balance work.**

## What is NOT done yet

- The passives/actives in `js/roles.js` are **data only** — nothing is wired into
  `GameEngine`. No role currently affects play.
- Wiring them is a balance-affecting change. Per `docs/AGENT_ROSTER.md` it must be
  scored on all 14 axes with an AI-vs-AI batch before shipping.
- The active abilities need a cooldown/UI affordance (the GDD's "once per 3 turns").

## Verification

`npm run qa:probe` runs `role-mapping-complete`, which fails if any character maps to
an unknown role, any role is left unclaimed, or the role count is not 9. Weak fits are
**reported, not failed** — they are design decisions, not bugs.

```bash
node -e "console.log(JSON.stringify(RoleRegistry.auditRoleMapping(),null,2))"
```