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
