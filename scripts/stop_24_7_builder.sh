#!/usr/bin/env bash
DIR="/home/lumen/louie/AI"
DAEMON_PIDFILE="$DIR/daemon_24_7.pid"
WORKER_PIDFILE="$DIR/dictionary_generator.pid"

echo "Stopping 24/7 Watchdog Supervisor and Worker..."

if [ -f "$DAEMON_PIDFILE" ]; then
  DPID=$(cat "$DAEMON_PIDFILE")
  if ps -p "$DPID" > /dev/null 2>&1; then
    kill "$DPID"
    echo "✓ Stopped Watchdog Supervisor (PID: $DPID)."
  fi
  rm -f "$DAEMON_PIDFILE"
fi

if [ -f "$WORKER_PIDFILE" ]; then
  WPID=$(cat "$WORKER_PIDFILE")
  if ps -p "$WPID" > /dev/null 2>&1; then
    kill "$WPID"
    echo "✓ Stopped Dictionary Generator Worker (PID: $WPID)."
  fi
  rm -f "$WORKER_PIDFILE"
fi

echo "All 24/7 dictionary generator processes have been stopped."
