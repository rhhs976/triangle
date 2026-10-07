#!/usr/bin/env bash
ROUNDS=${1:-2000}
DELAY=${2:-1200}
LOGFILE="/home/lumen/louie/AI/game.log"
PIDFILE="/home/lumen/louie/AI/game.pid"

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "Game is already running in background (PID $PID)."
    echo "View logs with: tail -f $LOGFILE"
    exit 0
  fi
fi

echo "Starting 'Guess the Next Word' game in background (Target: $ROUNDS rounds)..."
nohup node /home/lumen/louie/AI/scripts/play_next_word_game.js "$ROUNDS" "$DELAY" > "$LOGFILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PIDFILE"

echo "Game started with PID $NEW_PID."
echo "Log file: $LOGFILE"
echo "To monitor: tail -f $LOGFILE"
