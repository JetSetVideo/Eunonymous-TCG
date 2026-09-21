# COLLAB.md — shared agent ledger

**Append only. Never edit or delete existing entries.** Newest entries at the bottom.
This is the audit log that lets Hermes (Ubuntu) and Claude Code (Mac M1) hand work
back and forth without stepping on each other.

Entry template:

```
### YYYY-MM-DD · <agent> · <branch>
**Did:**      what changed, in one or two lines
**Files:**    paths touched
**State:**    does it build / do the tests pass?
**Broken:**   anything you knowingly left broken
**Next:**     @hermes / @claude — the specific next step, or "nothing pending"
```

---

### 2026-09-21 · hermes · main (initial)

**Did:** Renamed the project `Synthopwars` → `Eunonymous-TCG`, initialised the git
repo, and built the real LAN multiplayer that the game only pretended to have.
Two computers on the same Wi-Fi can now play each other, and the two agents share
this repo as a coordination bus.

**Files:** added `server/lan-server.js`, `js/net.js`, `test/lan-server-test.js`,
`test/lan-browser-test.js`, `AGENTS.md`, `CLAUDE.md`, `COLLAB.md`, `docs/LAN_SETUP.md`,
`docs/MAC_SETUP.md`, `scripts/start-lan.sh`, `.gitignore`.
Modified `index.html` (title, `<h1>`, favicon, `js/net.js` include),
`js/game.js` (two `!this.netHumanEnemy` guards), `package.json` (name, scripts, `ws`).

**State:** `test/lan-server-test.js` 9/9 pass. `test/lan-browser-test.js` 24/24 pass —
two headless browsers complete a mirrored turn cycle in both directions.

**Broken:** Nothing known. Two benign 404s for `/favicon.ico` were fixed with an
inline favicon.

**Next:** @claude — pick up the guest-side polish pass:
  1. The guest renders state directly and therefore skips VFX/animation events
     (see AGENTS.md §8). Consider mirroring the interesting `emit` events to the
     guest so it animates too.
  2. Lobby ergonomics: no "waiting for host to start" spinner, no reconnect if a
     socket drops mid-match. Both are fair game.
  3. Please re-run both tests on macOS and record the result below.

**Ground rules reminder:** the human has not authorised rewriting history. Never
force-push `main`. Do not commit `node_modules/`.

---

### 2026-09-21 · hermes · main

**Did:** Fixed the test wiring. `package.json` had `"test": "node test/battle-test.js"`,
which points at a **legacy manual harness** — no assertions, no failure exit code,
and hardcoded to a chromium build plus a server on :8931. So `npm test` verified
nothing. Replaced it with a self-hosting runner.

- `test/run-all.js` — picks a free port, boots `server/lan-server.js`, runs both
  suites against it, tears the server down, exits non-zero on any failure.
- `npm test` → the runner. Added `test:relay`, `test:mirror`, `harness:battle`.
- Both suites now read `LAN_URL` / `GAME_URL`, and the browser suite auto-detects
  a Chromium-family binary (macOS Chrome path included) instead of hardcoding one.
- `package-lock.json` re-synced (`ws` was missing).

**Files:** `package.json`, `package-lock.json`, `test/run-all.js`,
`test/lan-server-test.js`, `test/lan-browser-test.js`, `AGENTS.md`, `CLAUDE.md`.

**State:** `npm test` → **9/9 relay + 24/24 browser mirror, all suites passed.**
Server boots on :8934 for the run and is cleaned up.

**Broken:** Nothing known.

**Next:** @claude — `npm test` is now the single bar. Run it once on macOS to
confirm the runner works there (the browser auto-detect should find your Chrome;
override with `CHROME_PATH` if not), then record the result below and pick up the
guest-side polish tasks from the first entry.

---

### 2026-09-21 · hermes · main · v1.2.0+b1

**Did:** Fixed the reported Quick Battle log bug (root cause was NOT the log),
added the version system, added the QA harness, and captured the responsive matrix.

#### Bug fixed — `turn-1-is-not-skipped`

- **What:** Opening a match after a coin toss that picked the enemy started **two**
  turns: `turnCount` doubled to 2, the player's opening Bank phase was skipped, and
  the AI immediately took turn 1. The battle log is where the player noticed it —
  the enemy was buying cards before the player had a turn.
- **Where:** `index.html:3263-3264` (`launchBattle`), symptom rendered at
  `index.html:3364` (`updateBattleLog`).
- **When:** Every Quick Battle, 50% of the time — any time `coinWinner === 'enemy'`.
- **Why:** `startBattle()` already ends by calling `startTurn(this.player)`. The
  caller then called `startTurn(this.game.enemy)` **again** for the coin winner.
- **How:** `npm run qa:probe` → `turnCount=2, enemyTurn=1 (expected 0)`. Reproduced
  headlessly, so it is not a race.
- **Fix:** `startBattle(deck, enemyDeck, mode, battleground, firstSide)` now starts
  the correct opening turn itself; the caller's extra `startTurn` was deleted;
  `js/net.js` forwards the new argument.
- **What-next:** closed. Guarded permanently by the probe, which now covers **both**
  coin-toss outcomes.

#### Added

- `js/version.js` — `GAME_VERSION` + `BALANCE_REVISION`, loaded first. `v1.2.0+b1`.
- `tools/qa/harness.js` — the QA harness (`npm run qa`, `npm run qa:probe`):
  stamped screenshots across 6 viewports, FPS, console/JS/network error capture,
  layout-overflow detection, two probes, `REPORT.md` + `report.json`.
- `docs/QA_HARNESS.md`, `docs/VERSIONING.md`, `docs/AGENT_ROSTER.md`
  (14 agents, six-W reporting contract, 7 player personas, 14-axis balance matrix).

#### Measured findings from the first sweep (v1.2.0+b1)

- **What:** The title screen is **1688px tall inside an 844px viewport** at 390×844 —
  2× vertical overflow, i.e. it scrolls on a phone. The **NET PLAY panel covers the
  entire lower menu** at that size (WORLD, FRIENDS, TROPHIES, LEADERBOARD, QUESTS,
  HELP are all unreachable behind it).
  **Where:** title screen, all 6 viewports (overflow `Y` on every one), worst on
  `phone-portrait`. Panel CSS injected by `js/net.js`.
  **Why:** fixed-size layout with no vertical scaling; the net panel is a
  desktop-positioned floating widget (`position:fixed; right/bottom`).
  **What-next:** @ui-designer + @ux — responsive layout pass, and the net panel
  must become a collapsible/inline control below the tablet breakpoint.
- **What:** At 1920×1080 the arena uses only the centre ~60% of the width; text does
  not scale up; the NET PLAY panel clips the right edge of the battlefield row.
  **Where:** `desktop__quickbattle`. **Why:** single fixed layout, no large-screen rules.
- **What:** FPS falls roughly in proportion to viewport area —
  35 fps @390×844 → **6.4 fps @1920×1080** (headless, `--disable-gpu`).
  **Why:** consistent with **fill-rate-bound** rendering (fullscreen shader + VFX
  canvases), not game logic. **Caveat:** software rasterisation makes absolute
  numbers pessimistic; the *trend* is the signal. **What-next:** @optimiser —
  profile on real hardware before acting; then consider capping shader canvas
  resolution / DPR.
- **Zero console errors, zero failed requests, and zero horizontal overflow** across
  all 12 captures. The error baseline is clean.

#### Discrepancies found: Notion GDD vs. current implementation (needs a decision)

The Notion GDD (`Eunonymous — Game Design Document`, v2.0, 2026-05-28) is now the
authoritative spec. The build disagrees with it in several places:

| GDD says | Build does | Impact |
|---|---|---|
| 9 **Roles** as Commander classes (Artiste, Policier, Docteur, Ingénieur, Cuisinier, Politicien, Architecte, Professeur, Juge) | 9 different **Characters** (Synthetic, Memetic, Refinist, Technopriest, Cyborg, Biopure, Ethereal, Organizer, Schemist) | The core identity system is not the specced one |
| Starting hand of **5** from the mixed pool | **0-card** zero-start economy, everything bought from the Metadeck | Fundamental economy difference |
| Trap Row max **3**, separate Battle Phase | Trap row exists; phases differ (bank/main) | Turn structure |
| Deck: 40 cards, copy limits by rarity | 40 cards, "min 20 creatures" | Deck rules |
| Battle Row max 5 | 5 | ✅ agrees |

**What-next:** @game-designer + @architect must reconcile these before rules work
proceeds. This is a decision for the human, not for an agent to guess.

**Files:** `js/version.js` (new), `tools/qa/harness.js` (new), `docs/AGENT_ROSTER.md`,
`docs/VERSIONING.md`, `docs/QA_HARNESS.md` (new), `js/game.js`, `js/net.js`,
`index.html`, `AGENTS.md`, `package.json`, `.gitignore`.

**State:** `npm test` → 9/9 + 24/24 pass. `npm run qa:probe` → 2/2 probes pass
(after the fix; 1/2 before). No console errors in any capture.

**Broken:** Nothing known. The responsive/performance findings above are defects, not
unknowns — they are logged here rather than silently fixed without a design decision.

**Next:** @claude — in priority order:
  1. `npm test` + `npm run qa` once on macOS, record the result below.
  2. Read `docs/AGENT_ROSTER.md`; adopt the six-W format for your findings.
  3. Guest-side VFX mirroring (carried over from the first entry) — still open.
  4. Responsive layout: net panel must not cover the menu below the tablet
     breakpoint, and the title screen must fit without scrolling. This is the
     biggest single UX defect measured so far.

---

### 2026-09-21 · hermes · main · decision: identity layer

**Did:** Implemented the human's decision on the GDD-vs-build fork —
*"map the 9 Characters onto the 9 Roles (keep both — characters become role variants)"*.

**The model now:**
- **Role** (`js/roles.js`) = mechanics. Passive + active (CD 3), transcribed verbatim
  from GDD §4. 9 roles.
- **Character** (`js/characters.js`) = identity. Art, lore, tribe, 8 signature cards,
  starter deck. Unchanged.
- Every existing artwork, signature card and starter deck survives the change — only
  the mechanical layer is introduced. That was the point of choosing this option.

**Mapping (PROPOSAL, marked as such in `docs/ROLES.md`):**
Synthetic→Architecte · Memetic→Politicien · Refinist→Ingénieur ·
Technopriest→Juge · Cyborg→Artiste · Biopure→Docteur · Ethereal→Professeur ·
Organizer→Cuisinier · Schemist→Policier

**Files:** `js/roles.js` (new), `docs/ROLES.md` (new), `index.html` (script tag),
`tools/qa/harness.js` (probe).

**State:** `npm run qa:probe` → **3/3 probes pass.** New probe
`role-mapping-complete` asserts 9 roles, every character resolving to a real role,
and no role left unclaimed. Observed:
`roles=9 characters=9 weak=["Cyborg"]`.

**Three GDD gaps found while mapping — these need the human, not an agent:**

1. **There is no aggro role.** Cyborg is tempo-5 / Overchargers / Overclock-Adrenaline
   — the fast deck. None of the 9 roles is fast. Artiste is the nearest fit but it is
   spell-mastery, not rush. Cyborg is therefore **the one weak mapping**. Decide: add
   a 10th aggro role, or accept Cyborg-as-Artiste.
2. **Sacrifice has no home.** Technopriest's Sacrament sacrifices its own creatures;
   Juge's Requiem is the closest, but there is no aristocrats role.
3. **The build contradicts the GDD economy.** GDD says a **5-card starting hand** from
   the mixed pool; the build uses a **0-card zero-start economy** bought from the
   Metadeck. This changes the whole opening curve and therefore the power ranking of
   every cheap card. **Resolve before any balance work** — it invalidates all
   pre-existing balance assumptions.

**Broken:** Nothing. But note: the role passives/actives are **data only** — no role
yet affects play. Wiring them is balance-affecting and must be scored on the 14 axes
with an AI-vs-AI batch before it ships.

**Next:** @claude — the ordering I would argue for:
  1. Get the two machines verified (`npm test` + `npm run qa` on macOS).
  2. The three GDD gaps above are blocking. Ask the human, do not guess.
  3. Responsive/UI rework (biggest measured UX defect).
  4. Art import from `~/OneDrive/Eunonymous` — but only AFTER gap 3 is resolved, or
     cards get renamed twice.

**Note on the art:** 132 files (73 jpeg, 47 png, 11 jpg, 1 webp; 265MB) in
`~/OneDrive/Eunonymous`. Filenames are descriptive-but-inconsistent
(`3ladies-cyborgs-product.jpeg`, `alchemymagic_ai-projection_femine_matrix.webp`).
They need a naming convention + a manifest before import, not a bulk copy.

---

### 2026-09-21 · hermes · main · economy decision + responsive fix

#### Decision: the opening economy is ZERO-START (GDD §2.1 superseded)

Made under the human's instruction to use best judgement; **pending one-line
confirmation**. Full reasoning + reversal path: `docs/DECISIONS.md`.

Evidence, strongest first:
1. The human's own brief describes the build: *"cards of two facing players are mixed
   ... into a common master deck and **bought by each player at their turn**."*
2. The GDD contradicts itself — §7.4 describes a shared shop Recruit Phase, which only
   makes sense with a buy economy.
3. Turn 1 already grants 2 mana + a deliberately smaller 3-card market — a designed
   counterweight to the missing head start.

**Consequences:** balance work and the art import are both unblocked.
**Not done:** the Notion GDD was **not** edited (human's rule: append-only, yellow/blue).

#### Fixed: net panel covered the menu on phones — probe-verified

- **What (before):** at 390×844, **5 menu items were hidden behind the NET PLAY panel**
  (Friends, Trophies, Leaderboard, Quests, Help). A fixed-position overlay, so
  `scrollHeight` checks never saw it.
- **Where:** `js/net.js` injected panel CSS; title screen.
- **Why:** desktop-positioned floating widget at all sizes.
- **How:** new probe `menu-reachable-on-small-screens` hit-tests every menu item with
  `document.elementFromPoint` at phone size. It failed first with the 5 items named.
- **Fix:** panel shrinks below 860px, caps its own height, and **auto-collapses** into a
  small `◈ NET PLAY ◂` pill. Driven by a `matchMedia` listener rather than a one-shot
  width read — the probe caught that the first attempt only collapsed at load, so a
  resize/orientation change left it expanded. It now only ever auto-collapses; an
  explicit user expand is never fought.
- **After:** probe passes. `buttonCount=9, covered=[], offscreen=[]`. Visually confirmed
  — all 9 items visible, panel collapsed bottom-right.

#### Open — title screen still overflows (HYPOTHESIS, not yet diagnosed)

- **What:** `scrollH=1688` vs `clientH=844` at 390×844 — 2× vertical overflow — and it
  is still `overflow=Y` on **all 6 viewports**.
- **Where:** title screen, every size.
- **Hypothesis (unverified):** inactive `.screen` blocks are not `display:none`, so their
  content still contributes height. The tutorial screen alone is ~60 lines of rules
  text. This would explain why the overflow is present even at 1920×1080 where the
  menu is short.
- **Why it matters:** every menu item now fits inside the first 844px, so nothing is
  *blocked* — but the page still scrolls, which violates the "avoid scrolling" goal.
- **What-next:** @ui-designer — first VERIFY the hypothesis (measure each `.screen`'s
  contribution to `scrollHeight`), then hide inactive screens properly. Do not fix
  before verifying; the cause might be the aurora/background layer instead.

**Files:** `docs/DECISIONS.md` (new), `js/net.js`, `tools/qa/harness.js` (new probe).

**State:** `npm test` → 9/9 + 24/24 pass. `npm run qa:probe` → **4/4 probes pass.**
Full sweep: 0 console errors, 0 failed requests, 0 horizontal overflow, 12 captures.

**Next:** @claude —
  1. Confirm (or overturn) the economy decision — it is one line either way.
  2. Verify the title-overflow hypothesis before fixing it.
  3. The remaining GDD gaps: no aggro role (Cyborg), no sacrifice role (Technopriest).
  4. Then the art import, which is now unblocked.
