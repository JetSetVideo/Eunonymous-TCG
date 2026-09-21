#!/usr/bin/env bash
# Eunonymous-TCG — one-command LAN launcher.
#
#   ./scripts/start-lan.sh              # start the room server (default :8787)
#   ./scripts/start-lan.sh --port 9000
#   ./scripts/start-lan.sh --stop       # stop a server started by this script
#   ./scripts/start-lan.sh --status     # is it up? who is connected?
#
# Starts `server/lan-server.js` in the background and writes a pidfile so it can
# be stopped and queried cleanly.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDFILE="$ROOT/.lan-server.pid"
LOGFILE="$ROOT/.lan-server.log"
PORT=8787

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --stop) STOP=1; shift ;;
    --status) STATUS=1; shift ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

lan_ip() {
  # first non-internal IPv4
  if command -v ip >/dev/null 2>&1; then
    ip -4 addr show 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1 | grep -v '^127\.' | head -1
  else
    ipconfig getifaddr en0 2>/dev/null || echo "127.0.0.1"
  fi
}

is_running() {
  [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null
}

if [[ "${STOP:-0}" == "1" ]]; then
  if is_running; then
    kill "$(cat "$PIDFILE")" && echo "stopped LAN server (pid $(cat "$PIDFILE"))"
    rm -f "$PIDFILE"
  else
    echo "no LAN server running (or pidfile is stale)"
    rm -f "$PIDFILE"
  fi
  exit 0
fi

if [[ "${STATUS:-0}" == "1" ]]; then
  if is_running; then
    echo "LAN server running (pid $(cat "$PIDFILE"))"
  else
    echo "LAN server NOT running"
  fi
  echo "--- health ---"
  curl -s --max-time 3 "http://127.0.0.1:$PORT/health" || echo "(no response on :$PORT)"
  echo
  exit 0
fi

if is_running; then
  echo "already running (pid $(cat "$PIDFILE")) — use --stop first"
  exit 0
fi

cd "$ROOT"
node server/lan-server.js --port "$PORT" >"$LOGFILE" 2>&1 &
echo $! > "$PIDFILE"
sleep 1

if is_running; then
  IP="$(lan_ip)"
  echo "LAN server started (pid $(cat "$PIDFILE")), port $PORT"
  echo "  log : $LOGFILE"
  echo "  here: http://127.0.0.1:$PORT/"
  [[ -n "${IP:-}" ]] && echo "  LAN : http://$IP:$PORT/"
else
  echo "failed to start — see $LOGFILE" >&2
  tail -20 "$LOGFILE" >&2 || true
  rm -f "$PIDFILE"
  exit 1
fi
