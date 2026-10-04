#!/usr/bin/env node
/**
 * Test runner — `npm test`.
 *
 * Boots the LAN server on a free port, runs the suites against it, tears it
 * down. Self-contained: no manual server startup, no port assumptions, no
 * leftovers. Exits non-zero if anything fails.
 *
 *   1. test/lan-server-test.js    relay protocol                    (9 assertions)
 *   2. test/lan-security-test.js  relay + static hardening          (52 assertions)
 *                                 boots its OWN server with tightened limits
 *   3. test/lan-browser-test.js   two-browser mirror, reconnect,
 *                                 resync, seq ordering, hidden info  (41 assertions)
 */
'use strict';

const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

const ROOT = path.resolve(__dirname, '..');
const START_PORT = parseInt(process.env.TEST_PORT || '8934', 10);

const c = { dim: '\x1b[2m', b: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m', cyan: '\x1b[36m', off: '\x1b[0m' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function portFree(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => s.close(() => resolve(true)));
    s.listen(port, '127.0.0.1');
  });
}

async function pickPort() {
  for (let p = START_PORT; p < START_PORT + 40; p++) {
    if (await portFree(p)) return p;
  }
  throw new Error('no free port in range ' + START_PORT + '..' + (START_PORT + 40));
}

async function waitForHealth(url, ms = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url + '/health');
      if (r.ok) return true;
    } catch (e) { /* not up yet */ }
    await sleep(150);
  }
  return false;
}

function runSuite(label, args, env) {
  return new Promise((resolve) => {
    console.log('\n' + c.cyan + c.b + '▶ ' + label + c.off + c.dim + '  (node ' + args.join(' ') + ')' + c.off);
    const p = spawn(process.execPath, args, {
      cwd: ROOT,
      env: Object.assign({}, process.env, env),
      stdio: ['ignore', 'inherit', 'inherit']
    });
    p.on('close', (code) => resolve(code === 0));
  });
}

(async () => {
  const port = await pickPort();
  console.log(c.b + 'Eunonymous-TCG — test suite' + c.off + c.dim + '  (server port ' + port + ')' + c.off);

  const server = spawn(process.execPath, ['server/lan-server.js', '--port', String(port)], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe']
  });
  const serverLog = [];
  server.stdout.on('data', (d) => serverLog.push(d.toString()));
  server.stderr.on('data', (d) => serverLog.push(d.toString()));

  let results = [];
  try {
    const up = await waitForHealth('http://127.0.0.1:' + port);
    if (!up) {
      console.error(c.red + '\n LAN server never came up on :' + port + c.off);
      console.error(serverLog.join(''));
      process.exitCode = 1;
      return;
    }

    const env = {
      LAN_URL: 'ws://127.0.0.1:' + port + '/ws',
      LAN_HTTP: 'http://127.0.0.1:' + port,
      GAME_URL: 'http://127.0.0.1:' + port + '/'
    };

    results.push(['relay protocol  ', await runSuite('relay protocol', ['test/lan-server-test.js'], env)]);
    results.push(['relay hardening ', await runSuite('relay + static hardening', ['test/lan-security-test.js'],
      { SEC_TEST_PORT: String(port + 1) })]);
    results.push(['browser mirror  ', await runSuite('two-browser mirror', ['test/lan-browser-test.js'], env)]);
    results.push(['engine regress  ', await runSuite('engine regression', ['test/engine-regression-test.js'], {})]);
  } finally {
    server.kill('SIGTERM');
    await sleep(200);
  }

  const width = Math.max(...results.map(([n]) => n.length));
  console.log('\n' + c.b + '─── summary ───' + c.off);
  results.forEach(([name, ok]) => {
    console.log('  ' + name.padEnd(width) + '  ' + (ok ? c.green + 'PASS' : c.red + 'FAIL') + c.off);
  });

  const failed = results.filter(([, ok]) => !ok).length;
  console.log('\n' + (failed ? c.red + failed + ' suite(s) failed' : c.green + 'all suites passed') + c.off);
  process.exitCode = failed ? 1 : 0;
})().catch((e) => { console.error('RUNNER ERROR:', e.message); process.exitCode = 2; });