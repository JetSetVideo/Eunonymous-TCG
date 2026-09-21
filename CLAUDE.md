# CLAUDE.md — Eunonymous-TCG

You are the **Mac M1** agent. Your partner agent is **Hermes**, running on the
Ubuntu machine (`192.168.1.50`) on the same Wi-Fi.

**Read [`AGENTS.md`](AGENTS.md) first — it is the shared operating manual for both
agents** (architecture, the `ui`/global-lexical-scope trap, the 5-method action
seam, testing commands, conventions). Then read [`COLLAB.md`](COLLAB.md) for the
live handoff state.

---

## Your environment (Mac M1)

```bash
# 1. One-time: clone
git clone git@github.com:JetSetVideo/Eunonymous-TCG.git
cd Eunonymous-TCG
npm install

# 2. Run locally, single player
open index.html

# 3. Play against Hermes' machine over the LAN
node server/lan-server.js
#  -> open http://127.0.0.1:8787/  on this Mac
#  -> and use the NET PLAY panel
```

Because LAN play goes through **one** room server, both players must connect to the
**same** server. The canonical host is the Ubuntu box:

```
http://192.168.1.50:8787/
```

Run the server on the Mac only when you want to play Mac-to-Mac, or when the Ubuntu
box is off. See `docs/LAN_SETUP.md`.

## Branch name

Use `agent/claude/<slug>`:

```bash
git checkout main && git pull --rebase
git checkout -b agent/claude/hud-refresh
```

## Before you push

```bash
npm test                       # boots its own server; runs both suites
node --check js/game.js        # and any other JS you touched
```

On macOS the test default path is
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; export it, e.g.

```bash
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node test/lan-browser-test.js
```

## Then

1. Append an entry to `COLLAB.md` (append only — never edit existing entries).
2. Commit and push your branch.
3. Open a PR — **only with the human's explicit go-ahead.**

## Things that will trip you up

- `ui` and `GameEngine` are **not** on `window`. Reference them by bare name.
- Don't add new player-action entry points without extending `js/net.js` — all
  actions must go through the five patched prototype methods or they will not sync.
- The AI is only active in single-player (`netHumanEnemy` guard).
- Bump the `?v=N` cache-buster in `index.html` when you edit a JS/CSS file.
