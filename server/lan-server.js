#!/usr/bin/env node
/**
 * Eunonymous-TCG — LAN Server
 * ============================
 * One process does two jobs, over a single port:
 *
 *   1. Static host  — serves the game (index.html, js/, css/, assets/) so any
 *                     machine on the same Wi-Fi can just open a URL. No build step.
 *   2. Room relay   — a WebSocket endpoint (/ws) that pairs two players into a
 *                     room and relays messages between them. The server is a DUMB
 *                     pipe: it holds no game state and makes no rules decisions.
 *                     One client in the pair is the authoritative "host" (it runs
 *                     the real GameEngine); the other is the mirroring "guest".
 *
 * Usage:
 *   node server/lan-server.js                 # port 8787
 *   node server/lan-server.js --port 9000
 *   PORT=9000 node server/lan-server.js
 *   node server/lan-server.js --static-only   # no websocket rooms
 *
 * Verify:
 *   curl http://127.0.0.1:8787/health
 *
 * Hardening (see docs/LAN_SETUP.md "Security limits"). Every limit can be
 * overridden by an env var, which is how test/lan-security-test.js shrinks them:
 *
 *   LAN_MAX_PAYLOAD      max WebSocket frame, bytes          (default 2 MiB)
 *   LAN_RATE_MAX         messages per connection per window  (default 120)
 *   LAN_RATE_WINDOW_MS   rate window                         (default 1000)
 *   LAN_HEARTBEAT_MS     ping interval; 2 missed => dropped   (default 30000)
 *   LAN_MAX_ROOMS        concurrent rooms                     (default 200)
 *   LAN_MAX_CONN_PER_IP  sockets per remote address           (default 32)
 *   LAN_JOIN_FAIL_MAX    failed joins per IP per minute       (default 20)
 *   LAN_RESERVE_MS       how long a dropped player's seat is held (default 120000)
 *   LAN_ALLOW_ANY_ORIGIN=1  disable the WebSocket Origin check
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const ROOT = fs.realpathSync(path.resolve(__dirname, '..'));
const argv = process.argv.slice(2);
function argVal(flag, fallback) {
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
}
function envInt(name, fallback) {
  const v = parseInt(process.env[name] || '', 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}
const PORT = parseInt(argVal('--port', process.env.PORT || '8787'), 10);
const STATIC_ONLY = argv.includes('--static-only');
const HOST = argVal('--bind', '0.0.0.0');

const LIMITS = {
  maxPayload: envInt('LAN_MAX_PAYLOAD', 2 * 1024 * 1024),
  rateMax: envInt('LAN_RATE_MAX', 120),
  rateWindowMs: envInt('LAN_RATE_WINDOW_MS', 1000),
  heartbeatMs: envInt('LAN_HEARTBEAT_MS', 30000),
  maxRooms: envInt('LAN_MAX_ROOMS', 200),
  maxConnPerIp: envInt('LAN_MAX_CONN_PER_IP', 32),
  maxConnTotal: envInt('LAN_MAX_CONN_TOTAL', 512),
  joinFailMax: envInt('LAN_JOIN_FAIL_MAX', 20),
  joinFailWindowMs: 60000,
  reserveMs: envInt('LAN_RESERVE_MS', 120000),
  allowAnyOrigin: process.env.LAN_ALLOW_ANY_ORIGIN === '1',
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.glsl': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

// Headers sent on every static response.
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

// ---------------------------------------------------------------------------
// Room registry
// ---------------------------------------------------------------------------
/**
 * roomCode -> {
 *   host: ws|null, guest: ws|null, createdAt, names:{host,guest},
 *   tokens:{host,guest}   seat secrets; a dropped player reclaims its seat with it
 *   dropped:{host,guest}  ms timestamp the seat was vacated by a disconnect (reserved)
 *   emptySince            ms timestamp both seats became empty (null if occupied)
 * }
 */
const rooms = new Map();
const ROOM_TTL_MS = 6 * 60 * 60 * 1000; // 6h — reap stale rooms

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 ambiguity
const ROOM_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

function newRoomCode() {
  let code;
  do {
    code = '';
    const bytes = crypto.randomBytes(4);
    for (let i = 0; i < 4; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  } while (rooms.has(code));
  return code;
}
function newToken() { return crypto.randomBytes(16).toString('hex'); }

function tokenEq(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Strip control chars / markup-ish noise; names land in logs and /health. */
function cleanName(v, fallback) {
  const s = String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 24);
  return s || fallback;
}

function send(ws, obj) {
  if (ws && ws.readyState === 1) {
    try { ws.send(JSON.stringify(obj)); } catch (_) { /* ignore */ }
  }
}

function peerOf(room, ws) {
  if (!room) return null;
  return room.host === ws ? room.guest : (room.guest === ws ? room.host : null);
}

function laneOf(room, ws) {
  if (!room) return null;
  if (room.host === ws) return 'host';
  if (room.guest === ws) return 'guest';
  return null;
}

function broadcastRoom(room, obj, exceptWs) {
  [room.host, room.guest].forEach((c) => { if (c && c !== exceptWs) send(c, obj); });
}

function seatReserved(room, lane, now) {
  return !!(room.dropped[lane] && now - room.dropped[lane] < LIMITS.reserveMs);
}

function reapRooms() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const empty = !room.host && !room.guest;
    const stale = now - room.createdAt > ROOM_TTL_MS;
    const expiredEmpty = empty && (!room.emptySince || now - room.emptySince >= LIMITS.reserveMs);
    if (expiredEmpty || stale) {
      [room.host, room.guest].forEach((c) => { if (c) { c.room = null; send(c, { t: 'error', code: 'ROOM_EXPIRED', message: 'Room expired' }); } });
      rooms.delete(code);
    }
  }
}

/**
 * Remove ws from its room.
 * reason 'left'       — explicit LEAVE: seat freed, room deleted if empty.
 * reason 'disconnect' — socket dropped: seat reserved for LAN_RESERVE_MS so the
 *                       same player can reconnect (with its token) and resume.
 */
function vacate(ws, reason) {
  const code = ws.room;
  const room = code ? rooms.get(code) : null;
  ws.room = null;
  if (!room) return;
  const lane = laneOf(room, ws);
  if (!lane) return;
  room[lane] = null;
  const now = Date.now();
  if (reason === 'disconnect') room.dropped[lane] = now;
  else { room.dropped[lane] = 0; room.tokens[lane] = null; }
  broadcastRoom(room, { t: 'peerLeft', reason, side: lane, reserved: reason === 'disconnect' });
  if (!room.host && !room.guest) {
    if (reason === 'disconnect' && (room.tokens.host || room.tokens.guest)) room.emptySince = now;
    else rooms.delete(code);
  }
  console.log(`[room ${code}] ${lane} ${reason}  (rooms: ${rooms.size})`);
}

// Per-IP bookkeeping: open sockets + failed join attempts (anti brute force).
const ipConns = new Map();       // ip -> count
const joinFails = new Map();     // ip -> [timestamps]

function noteJoinFail(ip) {
  const now = Date.now();
  const arr = (joinFails.get(ip) || []).filter((t) => now - t < LIMITS.joinFailWindowMs);
  arr.push(now);
  joinFails.set(ip, arr);
}
function joinLocked(ip) {
  const now = Date.now();
  const arr = (joinFails.get(ip) || []).filter((t) => now - t < LIMITS.joinFailWindowMs);
  if (arr.length) joinFails.set(ip, arr); else joinFails.delete(ip);
  return arr.length >= LIMITS.joinFailMax;
}

function isLoopback(addr) {
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

// ---------------------------------------------------------------------------
// HTTP: static host + /health
// ---------------------------------------------------------------------------
/**
 * Resolve a URL path to a file inside root, or return null if it must not be
 * served. Rejects: malformed %-escapes, NUL bytes, anything resolving outside
 * root (../, %2e%2e, encoded slashes/backslashes), dot-segments (.git, .env,
 * .omh …), node_modules, and symlinks pointing outside root.
 */
function safeJoin(root, urlPath) {
  let clean;
  try {
    clean = decodeURIComponent(String(urlPath).split('?')[0].split('#')[0]);
  } catch (_) {
    return null; // malformed %-escape (this used to crash the whole server)
  }
  if (clean.indexOf('\0') !== -1) return null;
  const rel = clean.replace(/\\/g, '/').replace(/^\/+/, '');
  const segs = rel.split('/').filter(Boolean);
  for (const s of segs) {
    if (s === '..' || s.charAt(0) === '.' || s === 'node_modules') return null;
  }
  const target = path.resolve(root, rel);
  if (target !== root && !target.startsWith(root + path.sep)) return null; // traversal guard
  try {
    const real = fs.realpathSync(target);
    if (real !== root && !real.startsWith(root + path.sep)) return null; // symlink escape
  } catch (_) { /* does not exist — caller 404s / falls back */ }
  return target;
}

function sendText(res, code, text, extra) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, SECURITY_HEADERS, extra || {}));
  res.end(text);
}

function healthBody(req) {
  // Room codes are the only secret that gates a room. Anyone on the Wi-Fi can
  // GET /health, so codes are only revealed to requests from the server machine.
  const local = isLoopback(req.socket && req.socket.remoteAddress);
  return JSON.stringify({
    ok: true,
    service: 'eunonymous-tcg-lan',
    staticOnly: STATIC_ONLY,
    roomCount: rooms.size,
    rooms: [...rooms.entries()].map(([code, r]) => ({
      code: local ? code : null,
      host: !!r.host,
      guest: !!r.guest,
      names: local ? r.names : undefined,
      ageSec: Math.round((Date.now() - r.createdAt) / 1000),
    })),
    uptimeSec: Math.round(process.uptime()),
    ts: new Date().toISOString(),
  }, null, 2);
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';
  const pathname = url.split('?')[0];

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendText(res, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
  }

  if (pathname === '/health' || pathname === '/healthz') {
    res.writeHead(200, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, SECURITY_HEADERS));
    return res.end(req.method === 'HEAD' ? undefined : healthBody(req));
  }

  let filePath = safeJoin(ROOT, url);
  if (!filePath) return sendText(res, 403, 'Forbidden');

  // Directory -> index.html
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (_) { /* fall through to 404 */ }

  // SPA-ish fallback: unknown non-file path -> index.html
  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    filePath = path.join(ROOT, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) return sendText(res, 404, 'Not Found');
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, Object.assign({
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': 'no-cache',
    }, SECURITY_HEADERS));
    res.end(req.method === 'HEAD' ? undefined : data);
  });
});
server.on('clientError', (err, socket) => {
  try { socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'); } catch (_) {}
});

// ---------------------------------------------------------------------------
// WebSocket: dumb room relay
// ---------------------------------------------------------------------------
let wss = null;
if (!STATIC_ONLY) {
  wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: LIMITS.maxPayload,
    perMessageDeflate: false,
    verifyClient(info, cb) {
      const ip = info.req.socket.remoteAddress || '?';
      if (wss.clients.size >= LIMITS.maxConnTotal) return cb(false, 503, 'Server full');
      if ((ipConns.get(ip) || 0) >= LIMITS.maxConnPerIp) return cb(false, 429, 'Too many connections');
      // Cross-site WebSocket hijacking guard: a browser always sends Origin; it
      // must match the Host it is talking to. Non-browser clients send none.
      const origin = info.origin || info.req.headers.origin;
      if (origin && !LIMITS.allowAnyOrigin) {
        let oh = null;
        try { oh = new URL(origin).host; } catch (_) { /* bad origin */ }
        if (!oh || oh !== info.req.headers.host) return cb(false, 403, 'Bad origin');
      }
      cb(true);
    },
  });

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress || '?';
    ipConns.set(ip, (ipConns.get(ip) || 0) + 1);
    ws.ip = ip;
    ws.isAlive = true;
    ws.room = null;
    ws.rate = { start: Date.now(), count: 0, warned: false };
    ws.badJoins = 0;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw, isBinary) => {
      // ---- flood control: fixed window per connection ----
      const now = Date.now();
      if (now - ws.rate.start >= LIMITS.rateWindowMs) { ws.rate.start = now; ws.rate.count = 0; ws.rate.warned = false; }
      ws.rate.count++;
      if (ws.rate.count > LIMITS.rateMax * 4) { ws.close(1008, 'rate limit'); return; }
      if (ws.rate.count > LIMITS.rateMax) {
        if (!ws.rate.warned) { ws.rate.warned = true; send(ws, { t: 'error', code: 'RATE_LIMITED', message: 'Slow down — messages dropped' }); }
        return;
      }

      if (isBinary) { send(ws, { t: 'error', code: 'BAD_MESSAGE', message: 'Binary frames not supported' }); return; }
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch (_) {
        send(ws, { t: 'error', code: 'BAD_JSON', message: 'Malformed JSON' });
        return;
      }
      if (!msg || typeof msg !== 'object' || Array.isArray(msg) || typeof msg.t !== 'string') {
        send(ws, { t: 'error', code: 'BAD_MESSAGE', message: 'Expected {t:string}' });
        return;
      }

      switch (msg.t) {
        case 'create': {
          // Seat reclaim: a host whose socket dropped comes back with its token.
          if (typeof msg.reclaim === 'string') {
            const code = msg.reclaim.toUpperCase();
            const room = ROOM_RE.test(code) ? rooms.get(code) : null;
            if (room && tokenEq(msg.token, room.tokens.host)) {
              if (room.host && room.host !== ws) {
                const old = room.host;
                room.host = null;
                old.room = null;
                try { old.terminate(); } catch (_) {}
              }
              if (ws.room && ws.room !== code) vacate(ws, 'left');
              room.host = ws; room.dropped.host = 0; room.emptySince = null;
              ws.room = code;
              send(ws, { t: 'created', room: code, side: 'host', lane: 'host', token: room.tokens.host, resumed: true,
                peer: !!room.guest, peerName: room.guest ? room.names.guest : null });
              if (room.guest) send(room.guest, { t: 'peerJoined', name: room.names.host, side: 'host', resumed: true });
              console.log(`[room ${code}] host reclaimed seat`);
              return;
            }
            send(ws, { t: 'error', code: 'RECLAIM_FAILED', message: 'Could not resume room ' + code });
            return;
          }
          if (ws.room) vacate(ws, 'left');
          reapRooms();
          if (rooms.size >= LIMITS.maxRooms) {
            send(ws, { t: 'error', code: 'SERVER_FULL', message: 'Too many rooms open on this server' });
            return;
          }
          const code = newRoomCode();
          const room = {
            host: ws, guest: null, createdAt: Date.now(),
            names: { host: cleanName(msg.name, 'Commander') },
            tokens: { host: newToken(), guest: null },
            dropped: { host: 0, guest: 0 },
            emptySince: null,
          };
          rooms.set(code, room);
          ws.room = code;
          send(ws, { t: 'created', room: code, side: 'host', lane: 'host', token: room.tokens.host });
          console.log(`[room ${code}] created by "${room.names.host}"  (rooms: ${rooms.size})`);
          break;
        }

        case 'join': {
          if (joinLocked(ws.ip)) {
            send(ws, { t: 'error', code: 'TOO_MANY_ATTEMPTS', message: 'Too many failed joins — wait a minute' });
            return;
          }
          const code = String(msg.room == null ? '' : msg.room).toUpperCase().trim();
          const fail = (c, m) => {
            noteJoinFail(ws.ip);
            ws.badJoins++;
            send(ws, { t: 'error', code: c, message: m });
            if (ws.badJoins >= 10) ws.close(1008, 'too many failed joins');
          };
          if (!ROOM_RE.test(code)) return fail('BAD_ROOM', 'Room codes are 4 letters/digits');
          const room = rooms.get(code);
          if (!room) return fail('NO_ROOM', 'No such room: ' + code);
          if (room.guest === ws) return; // already seated
          const now = Date.now();
          const reclaim = tokenEq(msg.token, room.tokens.guest);
          // A valid seat token may take over a seat still held by a half-dead
          // socket (network dropped, heartbeat has not noticed yet).
          if (!reclaim && room.guest && room.guest.readyState === 1) {
            return fail('ROOM_FULL', 'Room ' + code + ' already has two players');
          }
          if (!reclaim && room.tokens.guest && seatReserved(room, 'guest', now)) {
            // Seat held for the guest that dropped; only its token may take it.
            return fail('ROOM_FULL', 'Room ' + code + ' seat is reserved for the player who disconnected');
          }
          if (room.guest && room.guest !== ws) {
            const old = room.guest;
            room.guest = null;
            old.room = null; // so its close handler does not vacate the new seat
            try { old.terminate(); } catch (_) {}
          }
          if (ws.room && ws.room !== code) vacate(ws, 'left');
          if (!reclaim) room.tokens.guest = newToken();
          room.guest = ws;
          room.dropped.guest = 0;
          room.emptySince = null;
          room.names.guest = cleanName(msg.name, 'Opponent');
          ws.room = code;
          send(ws, { t: 'joined', room: code, side: 'guest', lane: 'guest', hostName: room.names.host,
            token: room.tokens.guest, resumed: reclaim, hostPresent: !!room.host });
          send(room.host, { t: 'peerJoined', name: room.names.guest, side: 'guest', resumed: reclaim });
          console.log(`[room ${code}] "${room.names.guest}" ${reclaim ? 'rejoined' : 'joined'} "${room.names.host}"`);
          break;
        }

        case 'relay': {
          const room = rooms.get(ws.room);
          if (!room) { send(ws, { t: 'error', code: 'NO_ROOM', message: 'Not in a room' }); return; }
          if (!msg.payload || typeof msg.payload !== 'object') { send(ws, { t: 'error', code: 'BAD_MESSAGE', message: 'relay needs an object payload' }); return; }
          const peer = peerOf(room, ws);
          if (!peer) { send(ws, { t: 'error', code: 'NO_PEER', message: 'Opponent not connected yet' }); return; }
          send(peer, { t: 'relay', lane: laneOf(room, ws), payload: msg.payload });
          break;
        }

        case 'leave':
          vacate(ws, 'left');
          break;

        case 'ping':
          send(ws, { t: 'pong', ts: Date.now() });
          break;

        default:
          break;
      }
    });

    ws.on('close', () => {
      const n = (ipConns.get(ip) || 1) - 1;
      if (n > 0) ipConns.set(ip, n); else ipConns.delete(ip);
      vacate(ws, 'disconnect');
    });

    ws.on('error', () => { /* swallow; close handler cleans up (incl. 1009 too-big) */ });
  });

  // Heartbeat: drop dead sockets so rooms never leak zombies. A socket that
  // misses one full interval without answering a ping is terminated, which
  // fires 'close' -> vacate -> the peer gets peerLeft.
  const hb = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      try { ws.ping(); } catch (_) {}
    });
    reapRooms();
  }, LIMITS.heartbeatMs);
  wss.on('close', () => clearInterval(hb));
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function lanAddresses() {
  const out = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const addr of ifaces[name] || []) {
      if (addr.family === 'IPv4' && !addr.internal) out.push({ name, address: addr.address });
    }
  }
  return out;
}

function shutdown() {
  try { if (wss) wss.clients.forEach((c) => c.terminate()); } catch (_) {}
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(PORT, HOST, () => {
  const addrs = lanAddresses();
  console.log('');
  console.log('  ┌────────────────────────────────────────────────────────────┐');
  console.log('  │  EUNONYMOUS-TCG  ·  LAN server running                      │');
  console.log('  └────────────────────────────────────────────────────────────┘');
  console.log(`   static root : ${ROOT}`);
  console.log(`   modes       : static host${STATIC_ONLY ? '' : ' + websocket rooms (/ws)'}`);
  console.log('');
  console.log('   Local     : http://127.0.0.1:' + PORT + '/');
  addrs.forEach((a) => console.log(`   LAN (${a.name.padEnd(8)}): http://${a.address}:${PORT}/`));
  console.log('');
  console.log('   Both players open the LAN URL above, then use the NET PLAY');
  console.log('   panel: one clicks CREATE, the other enters the 4-letter code.');
  console.log('');
});
