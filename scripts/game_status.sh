#!/usr/bin/env bash
STATS_FILE="/home/lumen/louie/AI/data/game_summary.json"
RESULTS_FILE="/home/lumen/louie/AI/data/game_results_2000.jsonl"
PIDFILE="/home/lumen/louie/AI/game.pid"

echo "=========================================================="
echo "          GUESS THE NEXT WORD - 2,000 ROUND STATUS        "
echo "=========================================================="

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "Status: RUNNING (PID: $PID)"
  else
    echo "Status: STOPPED / IDLE"
  fi
else
  echo "Status: IDLE"
fi

if [ -f "$STATS_FILE" ]; then
  cat "$STATS_FILE"
else
  echo "No game summary file generated yet."
fi

if [ -f "$RESULTS_FILE" ]; then
  COUNT=$(wc -l < "$RESULTS_FILE")
  echo "Total rounds logged in $RESULTS_FILE: $COUNT"
fi

echo "=========================================================="
