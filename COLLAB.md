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
