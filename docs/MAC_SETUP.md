# Mac M1 Setup — Eunonymous-TCG

You are setting up the **second machine** so you (or Paul) can play against the
Ubuntu box and let **Claude Code** work on the same codebase.

## 1. Prerequisites

```bash
node --version      # v18+ is fine; repo was developed on v24
git --version
```

If Node is missing: `brew install node` (or grab it from nodejs.org).

## 2. Clone

```bash
cd ~/Desktop            # or wherever you keep projects
git clone git@github.com:JetSetVideo/Eunonymous-TCG.git
cd Eunonymous-TCG
npm install             # installs ws + puppeteer-core (dev/test only)
```

No build step. `index.html` runs as-is.

## 3. Single-player smoke test

```bash
open index.html
```

You should see the EUNONYMOUS title screen and a **◈ NET PLAY** panel in the
bottom-right corner. If the panel is missing, `js/net.js` didn't load — check the
browser console.

## 4. Play against the Ubuntu machine

The Ubuntu box runs the room server. **You do not need to run anything on the Mac.**

1. On the Mac, open: **`http://192.168.1.50:8787/`**
2. On the Ubuntu box, open: `http://127.0.0.1:8787/`
3. One of you clicks **CREATE**, reads out the 4-letter code, the other **JOIN**s.
4. Both pick a deck, the host clicks **START MATCH**.

Full details and troubleshooting: [`LAN_SETUP.md`](LAN_SETUP.md).

> Verify reachability first: `curl http://192.168.1.50:8787/health`
> If that fails, the two machines are not on the same network, or a firewall is
> blocking port 8787.

### Running the server on the Mac instead

Only needed for Mac-to-Mac play or if the Ubuntu box is off:

```bash
cd ~/Desktop/Eunonymous-TCG
node server/lan-server.js
```

macOS will ask whether to allow incoming connections for `node` — **Allow**. Then
both players open `http://<mac-lan-ip>:8787/` (find the IP with
`ipconfig getifaddr en0`).

## 5. Set up Claude Code

```bash
cd ~/Desktop/Eunonymous-TCG
claude
```

Claude Code picks up **`CLAUDE.md`** automatically, which points at **`AGENTS.md`**
(the shared manual for both agents) and **`COLLAB.md`** (the handoff ledger).

Your first instruction to Claude Code should be:

> Read AGENTS.md and COLLAB.md. Then run both test suites and tell me if anything
> fails on macOS.

### Running the tests on macOS

```bash
node test/lan-server-test.js     # needs the server up
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  node test/lan-browser-test.js
```

`puppeteer-core` does **not** download a browser — it drives one you already have.
Point `CHROME_PATH` at Chrome, Chromium, or Brave. On Apple Silicon any of them work.

## 6. Branch and push

```bash
git checkout main && git pull --rebase
git checkout -b agent/claude/<what-you-are-doing>
# ... work ...
git add -A && git commit -m "…"
git push -u origin agent/claude/<what-you-are-doing>
```

Then append to `COLLAB.md` and hand back to `@hermes`. **Do not push to `main`
without the human's go-ahead, and never force-push.**

## 7. Things that differ from the Linux side

| Topic | Note |
|---|---|
| Browser | Safari works but is untested; Chrome/Brave recommended (the tests assume a Chromium-family binary). |
| WebGL shaders | `js/shaders.js` falls back to CSS if WebGL2 is unavailable. If the arena looks flat, check the console for a shader warning. |
| Paths | `scripts/start-lan.sh` is a bash script — fine on macOS. |
| Firewall | Only relevant when the Mac itself runs the server. |

## Quick reference

```bash
open index.html                                # single player
open http://192.168.1.50:8787/                 # play vs Ubuntu
node server/lan-server.js                      # host a room server locally
curl http://192.168.1.50:8787/health           # is the Ubuntu server up?
ipconfig getifaddr en0                         # this Mac's LAN IP
```
