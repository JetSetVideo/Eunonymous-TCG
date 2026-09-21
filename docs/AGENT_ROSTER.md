# Agent roster & communication protocol

Eunonymous-TCG is worked by a **panel of specialist agents**, not one generalist.
This file defines who they are, what each owns, and — crucially — the reporting
contract every one of them obeys.

Human operators: **JetSetVideo** (Ubuntu) and **Paul** (Mac M1).
Coding agents: **Hermes** (Ubuntu) and **Claude Code** (Mac M1) — see `AGENTS.md`.

---

## 1. The reporting contract (every agent, every finding)

No agent may report a bare opinion. Every finding is filed with the **six W's**:

| Field | Meaning | Example |
|---|---|---|
| **What** | The observation, stated as a fact | "Title screen is 1688px tall in an 844px viewport" |
| **Where** | Exact location: screen, viewport, file, line, element | `title screen @390x844`, `index.html:61` |
| **When** | When it occurs: always / after action X / only in mode Y | "on load, every phone size" |
| **Why** | Root cause, or "hypothesis" if unproven | "fixed-size layout, no vertical scaling" |
| **How** | Mechanism / reproduction steps | "open at 390x844, measure documentElement.scrollHeight" |
| **What-next** | Recommendation + owner | "responsive layout pass, @ui-designer, @frontend" |

Findings are **evidence-backed or labelled as hypothesis**. A screenshot, a probe
result (`tools/qa/harness.js`), or a console trace is evidence. "I think it feels
slow" is a hypothesis and must be labelled as one.

**Disagreement is expected and required.** When two agents disagree, both post their
evidence in `COLLAB.md` under a `## Debate:` heading with the W6 blocks, and the
dispute is resolved by an experiment (a probe, a measurement, a playtest), never by
seniority or by who wrote the most words.

---

## 2. The agents

### Build & correctness

| Agent | Owns | Answers for |
|---|---|---|
| **@architect** | Module boundaries, state ownership, the `GameEngine` ↔ UI seam, netcode authority model, data & save schemas, versioning strategy | "does this scale to Battleground mode / 9 players?" |
| **@debugger** | Reproducing reported bugs to a failing probe *before* any fix; root cause, not symptom | "why does this break, and how do we prove it's fixed?" |
| **@tester** | The test suites (`npm test`), the QA harness probes, regression coverage | "what will break if we change this?" |
| **@optimiser** | Frame budget, fill-rate, animation cost, memory, startup, payload size | "why is desktop at 6 FPS?" |

### Product & feel

| Agent | Owns | Answers for |
|---|---|---|
| **@game-designer** | Rules fidelity to the GDD, keyword interactions, Combo Matrix, turn structure, win conditions | "is this rule coherent with the rest of the system?" |
| **@balance-analyst** | The multi-axis balance matrix (below), card/faction power, matchup spread | "is faction X winning too often, and why?" |
| **@ux** | Flows, click budgets (GDD: ≤2 clicks per action), information hierarchy, onboarding, reachability | "can a new player find this in 2 clicks?" |
| **@ui-designer** | The responsive parameter system, card layering, shop data-layer variants, screen-size equations | "does this hold at every size on the matrix?" |
| **@artist** | Art integration, placeholder removal, naming, cropping, palette/faction identity | "does the art carry the faction identity?" |
| **@critic** | The outside view — a YouTube-game-critique lens. First 5 minutes, retention, what's confusing, what's derivative | "would a stranger keep playing, or bounce?" |

### Player-profile testers (the @tester's panel)

Testing with one profile is testing with none. These personas play the builds:

| Persona | Profile | Watches for |
|---|---|---|
| **@first-timer** | Never played a TCG | Onboarding failure, unexplained jargon, dead ends |
| **@hearthstone-vet** | Battlegrounds main | Mana economy feel, tempo, hero-power (Role) clarity |
| **@tcg-spike** | MTG / Yu-Gi-Oh competitive | Rules depth, trap counterplay, combo legitimacy, RNG fairness |
| **@mobile-casual** | Plays on a phone, 5-min sessions | Tap targets, scrolling, load time, one-handed reach |
| **@accessibility** | Colourblind / low vision / motor-impaired | Contrast, colour-only signals, keyboard nav, target sizes |
| **@streamer** | Plays for an audience | Spectatability — can a viewer follow the board? |
| **@completionist** | Chases collections | Progression, achievement clarity, collection UI |

### Coordination

| Agent | Owns |
|---|---|
| **@scribe** | Keeps `COLLAB.md`, this roster, and the docs in sync with the code. Nothing merges undocumented. |

---

## 3. The balance matrix (≥12 axes)

@balance-analyst maintains this. Every proposed card or faction change is scored
against **all** axes, not just the one it was aimed at — a tweak that fixes Aggro
vs Control but breaks Cheap vs Expensive is a regression.

| # | Axis | Pressure test |
|---|---|---|
| 1 | Aggro ↔ Control | Does the fast deck kill before the slow deck stabilises? |
| 2 | Rush ↔ Ramp | Is an early board worth as much as late power? |
| 3 | Cheap ↔ Expensive | Is the cost curve punishing or rewarding at 2 vs 8 power? |
| 4 | Many ↔ Few | Does going wide beat going tall, or vice versa? |
| 5 | Tech ↔ Bio ↔ Meta | Do the factions have a rock-paper-scissors or a hierarchy? |
| 6 | Token ↔ Elite | Is a 1/1 swarm competitive with a single 8/8? |
| 7 | Trap ↔ Spell | Is hidden information worth the tempo loss? |
| 8 | Structure ↔ Creature | Does base-building pay off vs aggression? |
| 9 | Combo ↔ Curve | Are Combo payoffs reachable by curve play or only by luck? |
| 10 | Speed ↔ Health | Does attack order decide fights too often? |
| 11 | Deck-size ↔ Draw | Is 40 cards + mixed pool the right consistency? |
| 12 | Mixed-deck ↔ Ownership | Does shared-pool play make deckbuilding skill matter less? |
| 13 | First-player advantage | Win rate of the opener (the coin toss exists to fix this) |
| 14 | RNG ↔ Determinism | How many games are decided by a roll, not a decision? |

Method: **AI-vs-AI batches** (see §4), thousands of games per configuration, results
aggregated into `tools/qa/` reports and compared across `BALANCE_REVISION` (see
`docs/VERSIONING.md`). No balance change ships without a before/after batch.

---

## 4. AI-vs-AI as a balance instrument

The engine can drive both sides. Run mirrored batches (each matchup both ways to
cancel first-player advantage), then read the report:

- **Win-rate by faction / deck / card** — the headline number.
- **Inclusion rate** — cards that never get played are dead weight.
- **Win-rate when drawn vs not drawn** — isolates a card's real contribution.
- **Turn-count distribution** — tells you if games end by design or by fatigue.
- **Matchup spread** — a healthy meta has no auto-win pairings.

Visual analysis is optional and secondary; the aggregate numbers are the evidence.

---

## 5. How a change travels

```
report (W6)  ->  @scribe files it  ->  @tester writes a failing probe
             ->  @debugger root-causes  ->  fix
             ->  probe passes + npm test passes  ->  @balance-analyst runs an AI batch
             ->  @critic + personas play it  ->  @scribe updates COLLAB.md
```

A change is **done** only when: the probe passes, `npm test` passes, the balance
batch shows no regressions on the 14 axes, and `COLLAB.md` records it with the W6.

---

## 6. Where each agent's output lives

| Output | Location |
|---|---|
| Findings, debates, handoffs | `COLLAB.md` (append-only) |
| Machine-checked invariants | `tools/qa/harness.js` probes |
| Screenshots + metrics per version | `tools/qa/out/` (stamped with version + FPS) |
| Rules & card truth | `GAME_RULES.md`, `docs/CARDS.md`, `docs/GDD.md` |
| Balance decisions | `docs/BALANCE.md` (per-axis log, versioned) |
| This roster | `docs/AGENT_ROSTER.md` |