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
