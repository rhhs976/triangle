#!/usr/bin/env bash
PIDFILE="/home/lumen/louie/AI/dictionary_generator.pid"

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "Stopping Dictionary Generator (PID: $PID)..."
    kill "$PID"
    rm -f "$PIDFILE"
    echo "✓ Dictionary generator stopped."
    exit 0
  fi
  rm -f "$PIDFILE"
fi

echo "Dictionary generator is not currently running."
