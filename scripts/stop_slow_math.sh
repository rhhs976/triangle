#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$DIR/slow_math.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "Stopping Slow Math Generator (PID: $PID)..."
    kill "$PID" || kill -9 "$PID"
    rm -f "$PID_FILE"
    echo "Stopped."
    exit 0
  fi
  rm -f "$PID_FILE"
fi

pkill -f "generate_pure_math_slow.js" || true
echo "No running process found."
