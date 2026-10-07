#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$DIR/slow_math.pid"
LOG_FILE="$DIR/slow_math.log"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "Slow Math Generator is already running (PID: $PID)."
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

echo "Starting Polite Pure Math Generator in background..."
nohup node "$DIR/scripts/generate_pure_math_slow.js" 500 > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
echo "Started (PID: $(cat "$PID_FILE")). Logging to $LOG_FILE"
