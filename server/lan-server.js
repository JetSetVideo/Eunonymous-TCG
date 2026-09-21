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
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
function argVal(flag, fallback) {
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
}
const PORT = parseInt(argVal('--port', process.env.PORT || '8787'), 10);
const STATIC_ONLY = argv.includes('--static-only');
const HOST = argVal('--bind', '0.0.0.0');

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
};

// ---------------------------------------------------------------------------
// Room registry
// ---------------------------------------------------------------------------
/** roomCode -> { host: ws|null, guest: ws|null, createdAt, names:{} } */
const rooms = new Map();
const ROOM_TTL_MS = 6 * 60 * 60 * 1000; // 6h — reap stale rooms

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 ambiguity
function newRoomCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) {
      code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
  } while (rooms.has(code));
  return code;
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

function reapRooms() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const empty = !room.host && !room.guest;
    const stale = now - room.createdAt > ROOM_TTL_MS;
    if (empty || stale) rooms.delete(code);
  }
}

// ---------------------------------------------------------------------------
// HTTP: static host + /health
// ---------------------------------------------------------------------------
function safeJoin(root, urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const rel = clean.replace(/^\/+/, '');
  const target = path.resolve(root, rel);
  if (target !== root && !target.startsWith(root + path.sep)) return null; // traversal guard
  return target;
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';

  if (url === '/health' || url === '/healthz') {
    const body = JSON.stringify({
      ok: true,
      service: 'eunonymous-tcg-lan',
      staticOnly: STATIC_ONLY,
      rooms: [...rooms.entries()].map(([code, r]) => ({
        code,
        host: !!r.host,
        guest: !!r.guest,
        names: r.names,
        ageSec: Math.round((Date.now() - r.createdAt) / 1000),
      })),
      uptimeSec: Math.round(process.uptime()),
      ts: new Date().toISOString(),
    }, null, 2);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(body);
  }

  let filePath = safeJoin(ROOT, url);
  if (!filePath) { res.writeHead(403); return res.end('Forbidden'); }

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
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found: ' + url);
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(data);
  });
});

// ---------------------------------------------------------------------------
// WebSocket: dumb room relay
// ---------------------------------------------------------------------------
if (!STATIC_ONLY) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.room = null;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch (_) { return; }
      if (!msg || typeof msg.t !== 'string') return;

      switch (msg.t) {
        case 'create': {
          // Leave any previous room first
          if (ws.room && rooms.has(ws.room)) {
            const old = rooms.get(ws.room);
            broadcastRoom(old, { t: 'peerLeft', reason: 'left' }, ws);
            if (old.host === ws) old.host = null;
            if (old.guest === ws) old.guest = null;
          }
          reapRooms();
          const code = newRoomCode();
          const room = { host: ws, guest: null, createdAt: Date.now(), names: { host: msg.name || 'Commander' } };
          rooms.set(code, room);
          ws.room = code;
          send(ws, { t: 'created', room: code, side: 'host', lane: 'host' });
          console.log(`[room ${code}] created by "${room.names.host}"  (rooms: ${rooms.size})`);
          break;
        }

        case 'join': {
          const code = String(msg.room || '').toUpperCase().trim();
          const room = rooms.get(code);
          if (!room) { send(ws, { t: 'error', code: 'NO_ROOM', message: 'No such room: ' + code }); return; }
          if (room.guest && room.guest.readyState === 1) {
            send(ws, { t: 'error', code: 'ROOM_FULL', message: 'Room ' + code + ' already has two players' });
            return;
          }
          room.guest = ws;
          room.names.guest = msg.name || 'Opponent';
          ws.room = code;
          send(ws, { t: 'joined', room: code, side: 'guest', lane: 'guest', hostName: room.names.host });
          send(room.host, { t: 'peerJoined', name: room.names.guest, side: 'guest' });
          console.log(`[room ${code}] "${room.names.guest}" joined "${room.names.host}"`);
          break;
        }

        case 'relay': {
          const room = rooms.get(ws.room);
          if (!room) { send(ws, { t: 'error', code: 'NO_ROOM', message: 'Not in a room' }); return; }
          const peer = peerOf(room, ws);
          if (!peer) { send(ws, { t: 'error', code: 'NO_PEER', message: 'Opponent not connected yet' }); return; }
          send(peer, { t: 'relay', lane: laneOf(room, ws), payload: msg.payload });
          break;
        }

        case 'leave': {
          const room = rooms.get(ws.room);
          if (room) {
            broadcastRoom(room, { t: 'peerLeft', reason: 'left' }, ws);
            if (room.host === ws) room.host = null;
            if (room.guest === ws) room.guest = null;
          }
          ws.room = null;
          break;
        }

        case 'ping':
          send(ws, { t: 'pong', ts: Date.now() });
          break;

        default:
          break;
      }
    });

    ws.on('close', () => {
      const room = rooms.get(ws.room);
      if (room) {
        broadcastRoom(room, { t: 'peerLeft', reason: 'disconnect' }, ws);
        if (room.host === ws) room.host = null;
        if (room.guest === ws) room.guest = null;
        if (!room.host && !room.guest) rooms.delete(ws.room);
        console.log(`[room ${ws.room}] a player disconnected  (rooms: ${rooms.size})`);
      }
    });

    ws.on('error', () => { /* swallow; close handler cleans up */ });
  });

  // Heartbeat: drop dead sockets so rooms never leak zombies.
  const hb = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      try { ws.ping(); } catch (_) {}
    });
    reapRooms();
  }, 30000);
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
