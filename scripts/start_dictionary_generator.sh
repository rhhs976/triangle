#!/usr/bin/env bash
LOGFILE="/home/lumen/louie/AI/dictionary_generator.log"
PIDFILE="/home/lumen/louie/AI/dictionary_generator.pid"

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "Dictionary generator is already actively running (PID: $PID)."
    echo "Monitor progress with: tail -f $LOGFILE"
    exit 0
  fi
fi

echo "Starting Continuous Groq Dictionary Background Generator..."
nohup node /home/lumen/louie/AI/scripts/background_dictionary_builder.js > "$LOGFILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PIDFILE"

echo "✓ Dictionary generator started in background (PID: $NEW_PID)."
echo "✓ Logs: $LOGFILE"
echo "Check status anytime with: bash scripts/dictionary_status.sh"
