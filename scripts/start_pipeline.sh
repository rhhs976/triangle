#!/usr/bin/env bash
LOGFILE="/home/lumen/louie/AI/pipeline.log"
PIDFILE="/home/lumen/louie/AI/pipeline.pid"

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "Automated pipeline is already running (PID $PID)."
    echo "Monitor with: tail -f $LOGFILE"
    exit 0
  fi
fi

echo "Starting Automated AI Training Pipeline in the background..."
nohup node /home/lumen/louie/AI/scripts/auto_pipeline.js > "$LOGFILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PIDFILE"

echo "Pipeline started with PID $NEW_PID."
echo "Log file: $LOGFILE"
echo "To monitor: tail -f $LOGFILE"
echo "To check pipeline status: ./scripts/pipeline_status.sh"
