#!/usr/bin/env bash
PIDFILE="/home/lumen/louie/AI/pipeline.pid"
if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    kill "$PID"
    echo "Stopped pipeline process (PID $PID)."
    rm -f "$PIDFILE"
    exit 0
  fi
fi
echo "No running pipeline found."
