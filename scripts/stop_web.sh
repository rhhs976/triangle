#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$DIR/web.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "Stopping Web server (PID: $PID)..."
    kill "$PID" || kill -9 "$PID"
    rm -f "$PID_FILE"
    echo "Stopped."
    exit 0
  fi
  rm -f "$PID_FILE"
fi

pkill -f "src/server.js" || true
echo "Web server stopped."
