// Headless test of the LAN room relay (no browser).
const WebSocket = require('/home/jetsetvideo/Desktop/Eunonymous-TCG/node_modules/ws');

const URL = 'ws://127.0.0.1:8787/ws';
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
}
function open(ws) {
  return new Promise((res) => ws.on('open', res));
}
function once(ws, pred, ms = 3000) {
  return new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error('timeout waiting for message')), ms);
    const h = (d) => {
      let m; try { m = JSON.parse(d); } catch (e) { return; }
      if (pred(m)) { clearTimeout(to); ws.off('message', h); res(m); }
    };
    ws.on('message', h);
  });
}

(async () => {
  console.log('LAN relay test');
  const host = new WebSocket(URL), guest = new WebSocket(URL);
  await Promise.all([open(host), open(guest)]);

  host.send(JSON.stringify({ t: 'create', name: 'AliceHost' }));
  const created = await once(host, (m) => m.t === 'created');
  ok('host creates room', !!created.room && created.room.length === 4, JSON.stringify(created));
  const room = created.room;

  // Joining a bad room must error
  const other = new WebSocket(URL); await open(other);
  other.send(JSON.stringify({ t: 'join', room: 'ZZZZ', name: 'Nobody' }));
  const err = await once(other, (m) => m.t === 'error');
  ok('join unknown room -> NO_ROOM', err.code === 'NO_ROOM', JSON.stringify(err));
  other.close();

  guest.send(JSON.stringify({ t: 'join', room, name: 'BobGuest' }));
  const joined = await once(guest, (m) => m.t === 'joined');
  ok('guest joins room', joined.room === room && joined.side === 'guest', JSON.stringify(joined));

  const peerJoined = await once(host, (m) => m.t === 'peerJoined');
  ok('host notified of peer', peerJoined.name === 'BobGuest', JSON.stringify(peerJoined));

  // host -> guest relay
  host.send(JSON.stringify({ t: 'relay', payload: { k: 'snap', g: { turnCount: 7 }, full: true } }));
  const gotH2G = await once(guest, (m) => m.t === 'relay');
  ok('relay host->guest', gotH2G.payload.k === 'snap' && gotH2G.payload.g.turnCount === 7, JSON.stringify(gotH2G));

  // guest -> host relay
  guest.send(JSON.stringify({ t: 'relay', payload: { k: 'act', a: { kind: 'endTurn' } } }));
  const gotG2H = await once(host, (m) => m.t === 'relay');
  ok('relay guest->host', gotG2H.payload.k === 'act' && gotG2H.payload.a.kind === 'endTurn', JSON.stringify(gotG2H));

  // third player must be rejected
  const third = new WebSocket(URL); await open(third);
  third.send(JSON.stringify({ t: 'join', room, name: 'Interloper' }));
  const full = await once(third, (m) => m.t === 'error');
  ok('third join -> ROOM_FULL', full.code === 'ROOM_FULL', JSON.stringify(full));
  third.close();

  // disconnect notice
  guest.close();
  const left = await once(host, (m) => m.t === 'peerLeft');
  ok('host told when guest leaves', !!left.reason, JSON.stringify(left));

  // health reflects the room
  const res = await fetch('http://127.0.0.1:8787/health');
  const h = await res.json();
  ok('health lists room', Array.isArray(h.rooms) && h.rooms.length >= 1, JSON.stringify(h.rooms));

  host.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('TEST ERROR:', e.message); process.exit(2); });
