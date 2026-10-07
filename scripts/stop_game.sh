#!/usr/bin/env bash
PIDFILE="/home/lumen/louie/AI/game.pid"
if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    kill "$PID"
    echo "Stopped game process (PID $PID)."
    rm -f "$PIDFILE"
    exit 0
  fi
fi
echo "No running game found."
