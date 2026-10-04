#!/usr/bin/env node
/**
 * Relay + static-host hardening tests (no browser).
 *
 * Boots its OWN server on a free port with tightened limits (env overrides),
 * so the defaults used in production are untouched and the tests stay fast:
 *
 *   payload limit · flood/rate limit · malformed JSON · bad room codes ·
 *   join brute-force lockout · room cap · seat reservation + token reclaim ·
 *   heartbeat termination of zombie sockets · Origin check ·
 *   path traversal (raw ../, %2e%2e, encoded slashes/backslashes, dotfiles,
 *   node_modules, malformed %-escapes) · security headers / Content-Type ·
 *   method allow-list.
 *
 *   node test/lan-security-test.js
 */
'use strict';

const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');
const WebSocket = require('ws');

const ROOT = path.resolve(__dirname, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  -> ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : '')); }
}

function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(port, '127.0.0.1');
  });
}
async function pickPort(start) {
  for (let p = start; p < start + 60; p++) if (await portFree(p)) return p;
  throw new Error('no free port');
}

const LIMITS = {
  LAN_MAX_PAYLOAD: String(64 * 1024),
  LAN_RATE_MAX: '20',
  LAN_RATE_WINDOW_MS: '1000',
  LAN_HEARTBEAT_MS: '250',
  LAN_MAX_ROOMS: '8',
  LAN_JOIN_FAIL_MAX: '8',
  LAN_RESERVE_MS: '4000',
};

let PORT, WS_URL, HTTP_URL;

function wsOpen(opts) {
  const ws = new WebSocket(WS_URL, opts || {});
  ws.inbox = [];
  ws.on('message', (d) => { try { ws.inbox.push(JSON.parse(d)); } catch (e) { ws.inbox.push({ raw: String(d) }); } });
  ws.on('error', () => {});
  return new Promise((res, rej) => {
    ws.once('open', () => res(ws));
    ws.once('unexpected-response', (req, r) => rej(Object.assign(new Error('HTTP ' + r.statusCode), { status: r.statusCode })));
    ws.once('error', rej);
  });
}
function waitMsg(ws, pred, ms = 3000) {
  return new Promise((res, rej) => {
    const found = ws.inbox.find(pred);
    if (found) { ws.inbox.splice(ws.inbox.indexOf(found), 1); return res(found); }
    const to = setTimeout(() => { ws.off('message', h); rej(new Error('timeout waiting for message')); }, ms);
    const h = () => {
      const m = ws.inbox.find(pred);
      if (m) { clearTimeout(to); ws.off('message', h); ws.inbox.splice(ws.inbox.indexOf(m), 1); res(m); }
    };
    ws.on('message', h);
  });
}
function waitClose(ws, ms = 3000) {
  return new Promise((res) => {
    if (ws.readyState === 3) return res({ code: ws._closeCode, early: true });
    const to = setTimeout(() => res(null), ms);
    ws.once('close', (code) => { clearTimeout(to); res({ code }); });
  });
}
function rawGet(p, method) {
  return new Promise((res) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, path: p, method: method || 'GET' }, (r) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => res({ status: r.statusCode, headers: r.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', (e) => res({ status: 0, error: e.message, body: '' }));
    req.end();
  });
}
/** Raw socket request — bypasses any client-side path normalisation. */
function rawSocketGet(p) {
  return new Promise((res) => {
    const s = net.connect(PORT, '127.0.0.1', () => {
      s.write('GET ' + p + ' HTTP/1.1\r\nHost: 127.0.0.1:' + PORT + '\r\nConnection: close\r\n\r\n');
    });
    let buf = '';
    s.on('data', (d) => { buf += d.toString('latin1'); });
    s.on('end', () => res({ status: parseInt((buf.match(/^HTTP\/1\.1 (\d+)/) || [])[1] || '0', 10), body: buf }));
    s.on('error', () => res({ status: 0, body: buf }));
    setTimeout(() => { s.destroy(); res({ status: 0, body: buf, timeout: true }); }, 3000);
  });
}
async function healthy() {
  try { const r = await fetch(HTTP_URL + '/health'); return r.ok; } catch (e) { return false; }
}

(async () => {
  PORT = await pickPort(parseInt(process.env.SEC_TEST_PORT || '8970', 10));
  WS_URL = 'ws://127.0.0.1:' + PORT + '/ws';
  HTTP_URL = 'http://127.0.0.1:' + PORT;
  console.log('LAN hardening test  (own server on :' + PORT + ')');

  const srv = spawn(process.execPath, ['server/lan-server.js', '--port', String(PORT), '--bind', '127.0.0.1'], {
    cwd: ROOT, env: Object.assign({}, process.env, LIMITS), stdio: ['ignore', 'pipe', 'pipe'],
  });
  const srvLog = [];
  srv.stdout.on('data', (d) => srvLog.push(String(d)));
  srv.stderr.on('data', (d) => srvLog.push(String(d)));
  let srvExited = false;
  srv.on('exit', () => { srvExited = true; });

  const sentinelDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eun-sec-'));
  const sentinel = path.join(sentinelDir, 'secret.txt');
  fs.writeFileSync(sentinel, 'TOP-SECRET-SENTINEL');

  try {
    for (let i = 0; i < 80 && !(await healthy()); i++) await sleep(100);
    if (!(await healthy())) throw new Error('server did not start:\n' + srvLog.join(''));

    // ---------------------------------------------------------------- static
    console.log('\n[static host]');
    const outside = path.relative(ROOT, sentinel).split(path.sep).join('/'); // ../../..../tmp/x/secret.txt
    const traversal = [
      '/../package.json',
      '/../../../../../../etc/passwd',
      '/' + outside,
      '/%2e%2e/%2e%2e/%2e%2e/%2e%2e/etc/passwd',
      '/%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '/..%5c..%5c..%5cetc%5cpasswd',
      '/' + outside.split('/').map(encodeURIComponent).join('%2f'),
      '/' + outside.replace(/\./g, '%2e'),
      '/%2F' + sentinel.split(path.sep).filter(Boolean).map(encodeURIComponent).join('%2F'),
      '/js/..%2f..%2f..%2f' + outside.replace(/^(\.\.\/)+/, ''),
    ];
    let escaped = [];
    for (const p of traversal) {
      const r = await rawSocketGet(p);
      if (r.status === 200 || /TOP-SECRET-SENTINEL|root:x?:/.test(r.body)) escaped.push(p + ' -> ' + r.status);
    }
    ok('traversal (../, %2e%2e, %2f, %5c, absolute) never escapes the repo root', escaped.length === 0, escaped);
    const t1 = await rawSocketGet('/%2e%2e/%2e%2e/etc/passwd');
    ok('encoded %2e%2e traversal -> 403', t1.status === 403, t1.status);
    const t2 = await rawSocketGet('/../../etc/passwd');
    ok('raw ../ traversal -> 403', t2.status === 403, t2.status);

    const dot = await rawGet('/.git/config');
    ok('dotfiles (.git/config) are not served', dot.status === 403, dot.status);
    const nm = await rawGet('/node_modules/ws/package.json');
    ok('node_modules is not served', nm.status === 403, nm.status);

    const bad = await rawGet('/%E0%A4%A');
    ok('malformed %-escape -> 4xx, no crash', bad.status >= 400 && bad.status < 500, bad.status);
    const nul = await rawGet('/index.html%00.png');
    ok('NUL byte in path -> 403', nul.status === 403, nul.status);
    ok('server still alive after hostile URLs', !srvExited && await healthy());

    const idx = await rawGet('/index.html');
    ok('index.html served as text/html', idx.status === 200 && /^text\/html/.test(idx.headers['content-type']), idx.headers['content-type']);
    ok('X-Content-Type-Options: nosniff on static', idx.headers['x-content-type-options'] === 'nosniff');
    ok('X-Frame-Options set', !!idx.headers['x-frame-options']);
    ok('no wildcard CORS on static files', idx.headers['access-control-allow-origin'] === undefined, idx.headers['access-control-allow-origin']);
    const js = await rawGet('/js/net.js');
    ok('js served as text/javascript', /^text\/javascript/.test(js.headers['content-type'] || ''), js.headers['content-type']);
    const nf = await rawGet('/no/such/file.js');
    ok('404 has nosniff + text/plain and does not echo the URL', nf.status === 404 && nf.headers['x-content-type-options'] === 'nosniff' &&
      /^text\/plain/.test(nf.headers['content-type']) && nf.body.indexOf('file.js') === -1, [nf.status, nf.body]);
    const post = await rawGet('/index.html', 'POST');
    ok('POST -> 405', post.status === 405, post.status);
    const h = await rawGet('/health');
    ok('/health has nosniff + json', h.headers['x-content-type-options'] === 'nosniff' && /json/.test(h.headers['content-type']));

    // ---------------------------------------------------------------- relay
    console.log('\n[relay]');
    // malformed JSON
    const a = await wsOpen();
    a.send('{this is not json');
    const bj = await waitMsg(a, (m) => m.t === 'error');
    ok('malformed JSON -> BAD_JSON error (socket stays open)', bj.code === 'BAD_JSON' && a.readyState === 1, bj);
    a.send('[1,2,3]');
    const bm = await waitMsg(a, (m) => m.t === 'error');
    ok('non-object message -> BAD_MESSAGE', bm.code === 'BAD_MESSAGE', bm);
    a.send('null');
    const bn = await waitMsg(a, (m) => m.t === 'error');
    ok('null message -> BAD_MESSAGE', bn.code === 'BAD_MESSAGE', bn);
    a.send(JSON.stringify({ t: 'ping' }));
    ok('socket still usable after bad input', !!(await waitMsg(a, (m) => m.t === 'pong')));

    // bad room code formats
    a.send(JSON.stringify({ t: 'join', room: '../../etc', name: 'x' }));
    const br = await waitMsg(a, (m) => m.t === 'error');
    ok('non-4-letter room code -> BAD_ROOM', br.code === 'BAD_ROOM', br);
    a.send(JSON.stringify({ t: 'join', room: { $gt: '' }, name: 'x' }));
    const bo = await waitMsg(a, (m) => m.t === 'error');
    ok('object room code -> BAD_ROOM', bo.code === 'BAD_ROOM', bo);
    a.close();
    await sleep(50);

    // payload limit
    const big = await wsOpen();
    const closeP = waitClose(big, 3000);
    big.send(JSON.stringify({ t: 'relay', payload: { k: 'chat', text: 'x'.repeat(100 * 1024) } }));
    const bc = await closeP;
    ok('frame over maxPayload -> socket closed 1009', !!bc && bc.code === 1009, bc);

    // flood: a burst above the per-window budget is dropped with one warning
    const fl = await wsOpen();
    for (let i = 0; i < 40; i++) fl.send(JSON.stringify({ t: 'ping' }));
    await sleep(400);
    const pongs = fl.inbox.filter((m) => m.t === 'pong').length;
    const rl = fl.inbox.filter((m) => m.t === 'error' && m.code === 'RATE_LIMITED').length;
    ok('flood: messages beyond rate budget are dropped', pongs <= 20 && pongs >= 15, pongs);
    ok('flood: exactly one RATE_LIMITED warning per window', rl === 1, rl);
    await sleep(1100);
    fl.inbox.length = 0;
    fl.send(JSON.stringify({ t: 'ping' }));
    ok('flood: budget refills after the window', !!(await waitMsg(fl, (m) => m.t === 'pong')));
    // sustained flood (>4x budget) gets the socket closed
    const flClose = waitClose(fl, 3000);
    for (let i = 0; i < 120; i++) { try { fl.send(JSON.stringify({ t: 'ping' })); } catch (e) {} }
    const fc = await flClose;
    ok('flood: >4x budget in one window -> closed 1008', !!fc && fc.code === 1008, fc);

    // Origin check (cross-site WebSocket hijacking)
    let originStatus = 0;
    try { const w = await wsOpen({ origin: 'http://evil.example' }); w.close(); } catch (e) { originStatus = e.status; }
    ok('foreign Origin rejected (403)', originStatus === 403, originStatus);
    const sameOrigin = await wsOpen({ origin: HTTP_URL });
    ok('same Origin accepted', sameOrigin.readyState === 1);
    sameOrigin.close();

    // relay payload must be an object
    const host = await wsOpen();
    host.send(JSON.stringify({ t: 'create', name: '<b>Al\u0000ice</b>' }));
    const created = await waitMsg(host, (m) => m.t === 'created');
    ok('create returns a seat token', typeof created.token === 'string' && created.token.length >= 32);
    const guest = await wsOpen();
    guest.send(JSON.stringify({ t: 'join', room: created.room.toLowerCase(), name: 'Bob' }));
    const joined = await waitMsg(guest, (m) => m.t === 'joined');
    ok('join is case-insensitive and returns a token', joined.room === created.room && typeof joined.token === 'string');
    ok('names are sanitised (no markup / control chars)', joined.hostName === 'bAlice/b', joined.hostName);
    await waitMsg(host, (m) => m.t === 'peerJoined');
    guest.send(JSON.stringify({ t: 'relay', payload: 'not-an-object' }));
    const bp = await waitMsg(guest, (m) => m.t === 'error');
    ok('relay with non-object payload -> BAD_MESSAGE', bp.code === 'BAD_MESSAGE', bp);

    // seat reservation + token reclaim after an unclean drop
    guest.terminate();
    const pl = await waitMsg(host, (m) => m.t === 'peerLeft');
    ok('host told guest dropped, seat reserved', pl.reason === 'disconnect' && pl.reserved === true, pl);
    const thief = await wsOpen();
    thief.send(JSON.stringify({ t: 'join', room: created.room, name: 'Thief' }));
    const te = await waitMsg(thief, (m) => m.t === 'error');
    ok('stranger cannot take a reserved seat', te.code === 'ROOM_FULL', te);
    thief.send(JSON.stringify({ t: 'join', room: created.room, name: 'Thief', token: 'f'.repeat(32) }));
    const te2 = await waitMsg(thief, (m) => m.t === 'error');
    ok('wrong token cannot take a reserved seat', te2.code === 'ROOM_FULL', te2);
    thief.close();
    const back = await wsOpen();
    back.send(JSON.stringify({ t: 'join', room: created.room, name: 'Bob', token: joined.token }));
    const rj = await waitMsg(back, (m) => m.t === 'joined');
    ok('guest reclaims its seat with its token', rj.resumed === true && rj.room === created.room, rj);
    const pj = await waitMsg(host, (m) => m.t === 'peerJoined');
    ok('host told the guest resumed', pj.resumed === true, pj);
    host.send(JSON.stringify({ t: 'relay', payload: { k: 'snap', seq: 9 } }));
    const rr = await waitMsg(back, (m) => m.t === 'relay');
    ok('relay works after reclaim', rr.payload.seq === 9);

    // host drop + reclaim
    host.terminate();
    await waitMsg(back, (m) => m.t === 'peerLeft' && m.reserved === true);
    const host2 = await wsOpen();
    host2.send(JSON.stringify({ t: 'create', reclaim: created.room, token: 'nope' }));
    const hrf = await waitMsg(host2, (m) => m.t === 'error');
    ok('host reclaim with wrong token -> RECLAIM_FAILED', hrf.code === 'RECLAIM_FAILED', hrf);
    host2.send(JSON.stringify({ t: 'create', reclaim: created.room, token: created.token }));
    const hr = await waitMsg(host2, (m) => m.t === 'created');
    ok('host reclaims its room with its token', hr.resumed === true && hr.room === created.room && hr.peer === true, hr);
    ok('guest told the host resumed', (await waitMsg(back, (m) => m.t === 'peerJoined')).resumed === true);

    // explicit LEAVE frees the seat immediately (no reservation)
    back.send(JSON.stringify({ t: 'leave' }));
    const lv = await waitMsg(host2, (m) => m.t === 'peerLeft');
    ok('explicit leave -> not reserved', lv.reason === 'left' && !lv.reserved, lv);
    const newcomer = await wsOpen();
    newcomer.send(JSON.stringify({ t: 'join', room: created.room, name: 'Carol' }));
    ok('freed seat can be joined by someone new', (await waitMsg(newcomer, (m) => m.t === 'joined')).resumed === false);
    newcomer.close(); host2.close(); back.close();

    // heartbeat: a client that never answers pings is terminated
    const zombie = await wsOpen({ autoPong: false });
    zombie.send(JSON.stringify({ t: 'create', name: 'Zombie' }));
    await waitMsg(zombie, (m) => m.t === 'created');
    const zc = await waitClose(zombie, 3000);
    ok('heartbeat terminates a socket that ignores pings', !!zc, zc);
    const live = await wsOpen();
    await sleep(900);
    ok('heartbeat keeps a responsive socket alive', live.readyState === 1);
    live.close();

    // room cap
    await sleep(50);
    const h0 = await (await fetch(HTTP_URL + '/health')).json();
    ok('/health shows room codes to loopback callers', h0.rooms.every((r) => r.code === null || typeof r.code === 'string'));
    const creators = [];
    let full = null;
    for (let i = 0; i < 12 && !full; i++) {
      const c = await wsOpen();
      creators.push(c);
      c.send(JSON.stringify({ t: 'create', name: 'R' + i }));
      const m = await waitMsg(c, (x) => x.t === 'created' || x.t === 'error');
      if (m.t === 'error') full = m;
    }
    ok('room cap -> SERVER_FULL', !!full && full.code === 'SERVER_FULL', full);
    const hc = await (await fetch(HTTP_URL + '/health')).json();
    ok('room count never exceeds LAN_MAX_ROOMS', hc.roomCount <= parseInt(LIMITS.LAN_MAX_ROOMS, 10), hc.roomCount);
    creators.forEach((c) => c.close());

    // brute force lockout (last: it locks out 127.0.0.1 for a minute)
    const bf = await wsOpen();
    const codes = ['ZZZZ', 'ZZZY', 'ZZZX', 'ZZZW', 'ZZZV', 'ZZZU', 'ZZZT', 'ZZZS'];
    for (const code of codes) {
      bf.send(JSON.stringify({ t: 'join', room: code, name: 'guess' }));
      await waitMsg(bf, (m) => m.t === 'error');
    }
    bf.send(JSON.stringify({ t: 'join', room: 'ZZZR', name: 'guess' }));
    const lock = await waitMsg(bf, (m) => m.t === 'error');
    ok('room-code brute force -> TOO_MANY_ATTEMPTS lockout', lock.code === 'TOO_MANY_ATTEMPTS', lock);
    const bf2 = await wsOpen();
    bf2.send(JSON.stringify({ t: 'join', room: 'ZZZQ', name: 'guess' }));
    ok('lockout is per-IP (new socket also locked)', (await waitMsg(bf2, (m) => m.t === 'error')).code === 'TOO_MANY_ATTEMPTS');
    bf.close(); bf2.close();

    ok('server never crashed', !srvExited && await healthy());
  } catch (e) {
    fail++;
    console.log('  FAIL  test error: ' + (e && e.stack || e));
    console.log(srvLog.join('').slice(-2000));
  } finally {
    srv.kill('SIGTERM');
    try { fs.rmSync(sentinelDir, { recursive: true, force: true }); } catch (e) {}
    await sleep(150);
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('TEST ERROR:', e.message); process.exit(2); });
