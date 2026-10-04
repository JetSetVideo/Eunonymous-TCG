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
| Panel says *"Connection lost — reconnecting…"* | The socket dropped (Wi-Fi blip, laptop slept). It retries with backoff (0.5s → 8s, 12 tries) and resumes the same room; the host re-sends the full board. |
| *"…seat is reserved for the player who disconnected"* | Someone dropped mid-match; their seat is held for 2 minutes. Only they (same tab) can reclaim it. |
| *"Too many failed joins — wait a minute"* | 20 wrong room codes from one machine within a minute. Wait 60s. |
| *"Bad origin"* / WebSocket 403 | The page was served from a different host than the relay (e.g. a reverse proxy). Start the server with `LAN_ALLOW_ANY_ORIGIN=1`. |
| MAC can't reach `192.168.1.50` | Different Wi-Fi network, or a firewall. Check `ping 192.168.1.50`; allow port 8787 in `ufw` if enabled. |
| Mac firewall blocks incoming | Only needed if the server runs on the Mac. Incoming connections must be allowed for `node`. |
| Screen looks frozen on the guest | The guest is a mirror — it only changes when the host's state changes. It is the host's turn. |

## Checking who is connected

```bash
curl -s http://192.168.1.50:8787/health | python3 -m json.tool
```

Lists every live room and whether host/guest are attached. **Room codes and player
names are only shown when `/health` is requested from the server machine itself**
(`127.0.0.1`) — on the LAN they would let anyone walk into a room.

## Notes and limits

- **Two players per room**, one match at a time.
- The authoritative player is whoever clicked CREATE. If the host's browser tab is
  **closed or reloaded**, the match ends (the host's engine state lives in that tab).
  A host whose *socket* drops (Wi-Fi blip) reconnects and keeps the match.
- **Reconnect within a match is supported** — see below.
- Rooms are reaped after 6 hours, or 2 minutes after both players have dropped, or
  immediately when both players press LEAVE.

## Reconnect and resync

- When a socket drops unexpectedly, `js/net.js` reconnects with exponential backoff
  (0.5s, 1s, 2s … capped at 8s, ±20% jitter, max 12 tries). The panel dot turns
  orange and the status reads *"Connection lost — reconnecting…"*.
- On `create`/`join` the relay hands out a **seat token**. A dropped player's seat
  is **reserved for 2 minutes** (`LAN_RESERVE_MS`); only the matching token can take
  it back. The guest's token is kept in `sessionStorage`, so a guest who **reloads the
  page** can type the same code, press JOIN and land back in the live match.
- Whenever the guest (re)joins while a match is in progress, the host immediately
  re-sends a **full state snapshot** (resync). The guest can also request one
  (`{k:'resync'}`) — it does so automatically if a snapshot fails to apply.
- Every snapshot carries `{epoch, seq}`. `epoch` is random per match; `seq` increases
  per snapshot. The guest drops duplicates and out-of-order snapshots, and validates
  each snapshot's shape before it touches the board.
- **Hidden information:** snapshots no longer contain the host's hand contents or
  either deck's order — just same-length `{hidden:true}` placeholders, which is all the
  guest UI renders. (Before, the guest's devtools showed the host's hand and draw order.)
- Panel status states (`#net-panel[data-net-state]`): `offline`, `waiting`,
  `connected`, `reconnecting`, `disconnected`.

## Security limits (relay + static host)

The server is meant for a trusted LAN, but it is still reachable by anything on the
Wi-Fi, so it is hardened. All limits can be changed with env vars:

| Limit | Default | Env var | What happens |
|---|---|---|---|
| Max WebSocket frame | 2 MiB | `LAN_MAX_PAYLOAD` | socket closed with 1009 |
| Messages per connection | 120 / s | `LAN_RATE_MAX`, `LAN_RATE_WINDOW_MS` | extras dropped + one `RATE_LIMITED` error; >4× budget → closed 1008 |
| Concurrent rooms | 200 | `LAN_MAX_ROOMS` | `create` → `SERVER_FULL` |
| Sockets per IP / total | 32 / 512 | `LAN_MAX_CONN_PER_IP`, `LAN_MAX_CONN_TOTAL` | upgrade refused 429 / 503 |
| Failed joins per IP | 20 / min | `LAN_JOIN_FAIL_MAX` | `TOO_MANY_ATTEMPTS`; 10 bad joins on one socket closes it |
| Heartbeat | 30 s | `LAN_HEARTBEAT_MS` | a socket that misses a ping round is terminated (peer gets `peerLeft`) |
| Seat reservation | 120 s | `LAN_RESERVE_MS` | see Reconnect |
| WebSocket `Origin` | must match `Host` | `LAN_ALLOW_ANY_ORIGIN=1` | foreign origin → 403 (blocks cross-site WebSocket hijacking) |

Other rules: room codes must match `^[A-HJ-NP-Z2-9]{4}$` (`BAD_ROOM` otherwise) and are
generated with `crypto.randomBytes`; malformed JSON gets a `BAD_JSON` error instead
of silence; player names are trimmed to 24 characters with control characters and `<>`
stripped. The static host serves `GET`/`HEAD` only, refuses `..`, `%2e%2e`, encoded
slashes and backslashes, NUL bytes, dot-paths (`.git`, `.env`, …), `node_modules` and
symlinks that point outside the repo (403). It answers a malformed `%`-escape with 403
(this used to crash the server), sends `X-Content-Type-Options: nosniff`,
`X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer` and an explicit
`Content-Type`, and no longer sends wildcard CORS.

Tests: `node test/lan-security-test.js` (also part of `npm test`).
