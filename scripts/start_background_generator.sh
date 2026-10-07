#!/usr/bin/env bash
TARGET=${1:-2000}
BATCH=${2:-8}
LOGFILE="/home/lumen/louie/AI/generator.log"
PIDFILE="/home/lumen/louie/AI/generator.pid"

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "Generator is already running in background (PID $PID)."
    echo "View logs with: tail -f $LOGFILE"
    exit 0
  fi
fi

echo "Starting background sentence generator: Target=$TARGET, Batch=$BATCH..."
nohup node /home/lumen/louie/AI/scripts/generate_grammar.js "$TARGET" "$BATCH" > "$LOGFILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PIDFILE"

echo "Generator is running in the background with PID $NEW_PID."
echo "Log file: $LOGFILE"
echo "To monitor: tail -f $LOGFILE"
echo "To check count: wc -l /home/lumen/louie/AI/data/grammar_sentences.jsonl"
