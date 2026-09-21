# AGENTS.md — Eunonymous-TCG

Operating manual for **any** AI coding agent working in this repository.
Both agents (Hermes on the Ubuntu box, Claude Code on the Mac M1) follow this file.

Read this first. Then read [`COLLAB.md`](COLLAB.md) for the live handoff state.

---

## 1. What this is

**Eunonymous-TCG** — a browser-based deck-building battleground trading card game.
Vanilla HTML5/CSS/JS. **No build step, no bundler, no framework.** Open `index.html`
and it runs. Set in the Synthtopia universe.

| Property | Value |
|---|---|
| Entry point | `index.html` (single page, ~4.1k lines; one large inline UI script at the end) |
| Engine | `js/game.js` — `class GameEngine`, ~3.1k lines, all rules live here |
| Cards | `js/cards.js` (`ALL_CARDS`, `TEAM_COLORS`) |
| Characters | `js/characters.js` (`CHARACTER_LIST`) |
| Visuals | `js/shaders.js` (WebGL2, CSS fallback), `js/vfx.js` |
| LAN netcode | `js/net.js` (client) + `server/lan-server.js` (relay) |
| Version | `js/version.js` — `GAME_VERSION` + `BALANCE_REVISION`, loaded FIRST. See `docs/VERSIONING.md` |
| QA harness | `tools/qa/harness.js` — stamped screenshots, FPS, probes. See `docs/QA_HARNESS.md` |
| Rules doc | `GAME_RULES.md`, `docs/CARDS.md`, `docs/GDD.md` |

## 2. Architecture notes that will bite you

- **`ui` is a top-level `const`** in a classic `<script>` in `index.html`. So are
  `class GameEngine` (in `js/game.js`) and the other `js/*.js` globals. These live
  in the **global lexical environment, NOT on `window`**. `window.ui` is
  `undefined`; reference them by bare name. (This is why `js/net.js` uses `U()`
  and `EngineCls()` accessors.)
- **`ui.renderBattle()` is the single render entry point.** Everything that changes
  the board calls it.
- **The engine is event-driven.** `GameEngine` has `on(event, cb)` / `emit(event, data)`.
  UI wiring lives in `ui.launchBattle()`. Use `emit` for anything the UI must react to.
- **All player actions funnel through 5 `GameEngine.prototype` methods:**
  `buyCard`, `playCard`, `attack`, `endBankPhase`, `endTurn` — always called as
  `game.<method>(game.player, ...)`. This is the single interception seam used by
  the netcode. Do not add new player-action entry points without extending `js/net.js`.
- **AI is embedded in exactly two places:** `startTurn()` (~L409) and
  `continueTurn()` (~L712), both guarded by `!this.netHumanEnemy`. The AI is only
  active in single-player.
- **Engine state is plain data** (`this.player` / `this.enemy` are plain objects with
  no DOM references), so it is directly JSON-serialisable — that is how LAN mirroring works.
- Cards are deep-copied and stamped with a unique `instanceId` (`_stampCard`).
  `instanceId` is stable across JSON round-trips and is the wire identity for cards.

## 3. Turning flow (short version)

```
startTurn(player)      -> mana refill, market refill, danger events, emit 'bankStart'
endBankPhase(player)   -> mana burn, applyRefine, -> continueTurn()
continueTurn(player)   -> power, structure effects, synergies -> phase 'main', emit 'turnStart'
   [player plays cards / attacks]
endTurn(player)        -> 'end' phase cleanup -> startTurn(opponent)
```
Bank = buy from the shared Metadeck. Main = play + attack. First player's turn 1 shows
only 3 market cards; all other turns show 5.

## 4. Running it

```bash
# Single player (just open the file)
xdg-open index.html          # Linux
open index.html             # macOS

# LAN / two computers  (strongly preferred while developing)
node server/lan-server.js   # serves the game + the WebSocket room relay
```

`npm start` is an alias for the server. See `docs/LAN_SETUP.md`.

## 5. Testing — run these before you push

```bash
npm test          # boots its own server, runs both suites, tears it down
```

That is the whole bar. It runs:

| Suite | Asserts |
|---|---|
| `test/lan-server-test.js` | relay protocol — rooms, joins, both directions, full-room rejection, disconnect, `/health` |
| `test/lan-browser-test.js` | two headless browsers play a mirrored turn cycle; side-swap, HP mirroring, both-direction actions, no page errors |

Both take env overrides (`LAN_URL`, `GAME_URL`) so they can point at any server.
Individually: `npm run test:relay` / `npm run test:mirror`.

- `test/lan-browser-test.js` uses `puppeteer-core`, which **never downloads a
  browser** — it auto-detects `brave-browser`/`chromium`/Chrome, and you can force
  one with `CHROME_PATH`.
- There is no linter wired up; at minimum run `node --check <file>` on any JS you touch.
- `test/battle-test.js` is a **legacy manual harness** (`npm run harness:battle`) —
  it only logs a play-through, has no assertions, and needs its own server on :8931.
  It is not part of `npm test` and is kept for interactive debugging only.
- **A green `npm test` is the bar for touching netcode.**

### 5b. QA harness — screenshots, metrics and probes

```bash
npm run qa          # all viewports x title+quickbattle, stamped screenshots
npm run qa:probe    # probes only — fast
```

`tools/qa/harness.js` covers the responsive matrix (phone both orientations, tablet,
laptop, desktop), measures FPS, captures every console error / JS exception / failed
request, flags layout overflow, and writes `tools/qa/out/REPORT.md` + `report.json`.
Every screenshot carries the game version burnt into it.

**Probes are the regression net.** When you fix a bug, add a probe that fails first
and passes after — prose descriptions of bugs rot, probes do not. Run
`npm run qa:probe` before and after any fix to the turn flow or UI.

Full guide: `docs/QA_HARNESS.md`.

### 5c. Who does what, and how findings are filed

Specialist agents, their ownership, the six-W reporting contract (what/where/when/
why/how/what-next), the player-persona test panel and the 14-axis balance matrix are
defined in `docs/AGENT_ROSTER.md`. Read it before proposing a rules or balance
change — a change must be scored against all axes, not just the one it targets.

## 6. Conventions

- Match surrounding style. The codebase is ES5-flavoured (`var`, `function`) in
  `js/game.js` and the inline UI; `js/net.js` follows the same style on purpose.
  Do not "modernise" files as a side quest.
- Keep docs in sync with code. If you change a rule, update `GAME_RULES.md`.
  If you change a card, update `docs/CARDS.md`. The user cares about this.
- Card rendering rules the user has specified: **ATK above the sword icon**, the
  type row sits **between art and ability**, **bold effect + italic description**.
- Bump the `?v=N` cache-buster on a `<script>`/`<link>` in `index.html` when you
  change that file, or browsers will serve stale JS/CSS.
- Never commit `node_modules/`.

## 7. Working alongside the other agent — the protocol

> The two agents share one repo. GitHub is the bus. `COLLAB.md` is the ledger.

**Every session:**

1. `git pull --rebase` before you start. Always.
2. Read `COLLAB.md` — check the **Handoffs** section for anything addressed to you.
3. Work on your own branch: `agent/hermes/<slug>` or `agent/claude/<slug>`.
4. Small, focused commits with real messages.
5. Append an entry to `COLLAB.md` describing what you did, what you touched, what
   is broken, and who should pick it up next.
6. Push, then open a PR (or fast-forward `main` directly for trivial fixes) —
   **only with the human's go-ahead.**

**Hard rules**

- **Never rewrite history on a branch the other agent is using.** No force-push to
  `main`, ever.
- **Never edit `COLLAB.md`'s existing entries.** Append only. It is an audit log.
- If you must touch a file the other agent has an open PR on, note it in `COLLAB.md`
  and keep the diff as small as possible.
- Disclose any test data you write. The user does not want the DB or GitHub history
  touched without explicit permission.
- Report blockers in `COLLAB.md` rather than silently working around them.

**Who does what (default split, adapt as needed)**

| Area | Owner |
|---|---|
| Engine rules, balance, card data | whoever is free — coordinate in `COLLAB.md` |
| Netcode (`js/net.js`, `server/`) | Hermes |
| UI / visual polish | Claude Code |
| Playtesting & bug reports | both — file issues |

## 8. Current known gaps (update as they close)

- `js/multiplayer.js` is **cosmetic only** — a localStorage friends/chat mock with
  hardcoded fake friends (`NeonStriker`, `VaultKeeper`, …). It is unrelated to the
  real LAN netcode in `js/net.js`. Do not confuse the two.
- LAN play is **host-authoritative mirroring**: the guest is a display. Client-side
  prediction, reconnect-within-a-match, and >2 players are not implemented.
- The guest does not replay VFX/animation events; it renders state directly, so the
  guest sees fewer flourishes than the host. Known, accepted for now.
- Saved decks / settings use legacy `synthopwars_*` localStorage keys (kept so
  existing saves survive the rename). Player name uses `eunonymous_playerName`.
