#!/usr/bin/env bash

# 24/7 Watchdog Supervisor Daemon for Groq Dictionary Builder
# Keeps the generator running continuously; auto-restarts if it ever halts.

DIR="/home/lumen/louie/AI"
WORKER_PIDFILE="$DIR/dictionary_generator.pid"
WORKER_LOGFILE="$DIR/dictionary_generator.log"
DAEMON_PIDFILE="$DIR/daemon_24_7.pid"
DAEMON_LOGFILE="$DIR/daemon_24_7.log"

echo "$$" > "$DAEMON_PIDFILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 24/7 Watchdog Supervisor started (PID: $$)." >> "$DAEMON_LOGFILE"

while true; do
  WORKER_RUNNING=0

  if [ -f "$WORKER_PIDFILE" ]; then
    PID=$(cat "$WORKER_PIDFILE")
    if ps -p "$PID" > /dev/null 2>&1; then
      WORKER_RUNNING=1
    fi
  fi

  if [ "$WORKER_RUNNING" -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Worker not running. Launching Groq background builder now..." >> "$DAEMON_LOGFILE"
    nohup node "$DIR/scripts/background_dictionary_builder.js" >> "$WORKER_LOGFILE" 2>&1 &
    NEW_PID=$!
    echo "$NEW_PID" > "$WORKER_PIDFILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Worker started with PID: $NEW_PID." >> "$DAEMON_LOGFILE"
  fi

  # Sleep 15 seconds between health checks
  sleep 15
done
