#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$DIR/slow_math.pid"
DATA_FILE="$DIR/data/math_multiplication_division.jsonl"
LOG_FILE="$DIR/slow_math.log"

echo "=========================================================="
echo "          PURE MATH SLOW GENERATOR STATUS                 "
echo "=========================================================="

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "• Process Status: RUNNING (PID: $PID)"
  else
    echo "• Process Status: STOPPED (Stale PID file)"
  fi
else
  echo "• Process Status: STOPPED"
fi

if [ -f "$DATA_FILE" ]; then
  COUNT=$(wc -l < "$DATA_FILE" | tr -d ' ')
  echo "• Total Pure Math Questions Saved: $COUNT"
else
  echo "• Total Pure Math Questions Saved: 0"
fi

if [ -f "$LOG_FILE" ]; then
  echo ""
  echo "--- Recent Activity Log ---"
  tail -n 8 "$LOG_FILE"
fi
echo "=========================================================="
