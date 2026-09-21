# LAN Setup — play Eunonymous-TCG on two computers

Two people, two machines, one Wi-Fi. Nothing leaves your network — no accounts, no
internet dependency, no build step.

## The model

```
        ┌──────────────────────────── Ubuntu box (192.168.1.50) ────────────────────────────┐
        │                                                                                   │
        │   node server/lan-server.js          <-- ONE process, ONE port (8787)             │
        │      • serves the game (index.html, js/, css/)                                    │
        │      • relays WebSocket messages between exactly two players in a "room"           │
        │                                                                                   │
        └───────────────▲───────────────────────────────────────▲───────────────────────────┘
                        │  http://192.168.1.50:8787/            │
              ┌─────────┴──────────┐                  ┌─────────┴──────────┐
              │  Player A (host)   │                  │  Player B (guest)  │
              │  authoritative     │◄──── mirror ─────│  display only      │
              │  GameEngine        │──── actions ────►│  forwards actions  │
              └────────────────────┘                  └────────────────────┘
```

The relay server is a **dumb pipe** — it holds no game state and makes no rules
decisions. One of the two players (whoever clicks **CREATE**) is the authoritative
*h*ost and runs the real engine; the other mirrors it.

## 1. Start the server (on the Ubuntu box)

```bash
cd ~/Desktop/Eunonymous-TCG
node server/lan-server.js
# or:  npm start
# or:  ./scripts/start-lan.sh
```

It prints the URLs it is reachable on:

```
   Local     : http://127.0.0.1:8787/
   LAN (enp3s0  ): http://192.168.1.50:8787/
```

Custom port: `node server/lan-server.js --port 9000` (or `PORT=9000`).
Static-only (no rooms): `node server/lan-server.js --static-only`.

Sanity check from any machine:

```bash
curl http://192.168.1.50:8787/health
```

## 2. Open the game on both machines

Both players open **the same URL** — the one belonging to the machine running the
server. If the server is on the Ubuntu box:

- Ubuntu:  `http://127.0.0.1:8787/`
- Mac M1:  `http://192.168.1.50:8787/`

## 3. Use the NET PLAY panel (bottom-right of the screen)

| Step | Player A (host) | Player B (guest) |
|---|---|---|
| 1 | Set your name | Set your name |
| 2 | Click **CREATE** → a 4-letter code appears (e.g. `K7QP`) | — |
| 3 | Read the code out to Player B | Type the code → click **JOIN** |
| 4 | Both panels should show a green dot and *"… is in the room"* | same |
| 5 | **Pick a deck in the Deck Builder** (otherwise a random 40-card deck is used) | **Pick a deck too** |
| 6 | Click **START MATCH** | waits — the battle screen appears automatically |

The host's panel has the **START MATCH** button. The guest's does not (it is hidden).

## 4. While playing

- Each machine always sees **itself at the bottom** of the board. The guest's view is
  mirrored, so no mental flipping is needed.
- The **chat box** in the NET PLAY panel is there for coordinating ("your go", "that
  crashed", "gg").
- Phase timers are **disabled** in LAN play — nobody gets auto-passed mid-thought.
- **LEAVE** ends the session and notifies the other player.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Panel says *"WebSocket error"* | The server is not running, or you opened `index.html` from disk (`file://`) instead of the served URL. Use `http://…:8787/`. |
| Guest clicks JOIN → *"No such room"* | Wrong code, or the host's server is a *different* server. Both players must open the same machine's URL. |
| *"Room already has two players"* | That room is full. The host must CREATE a new one. |
| MAC can't reach `192.168.1.50` | Different Wi-Fi network, or a firewall. Check `ping 192.168.1.50`; allow port 8787 in `ufw` if enabled. |
| Mac firewall blocks incoming | Only needed if the server runs on the Mac. Incoming connections must be allowed for `node`. |
| Screen looks frozen on the guest | The guest is a mirror — it only changes when the host's state changes. It is the host's turn. |

## Checking who is connected

```bash
curl -s http://192.168.1.50:8787/health | python3 -m json.tool
```

Lists every live room, whether host/guest are attached, and player names.

## Notes and limits

- **Two players per room**, one match at a time.
- The authoritative player is whoever clicked CREATE. If the host's browser tab is
  closed, the match ends.
- Reconnect-within-a-match is **not** implemented yet (see `COLLAB.md`).
- Rooms are reaped after 6 hours or when both players leave.
