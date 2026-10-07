#!/usr/bin/env bash
DIR="/home/lumen/louie/AI"
DAEMON_PIDFILE="$DIR/daemon_24_7.pid"
DAEMON_LOGFILE="$DIR/daemon_24_7.log"

if [ -f "$DAEMON_PIDFILE" ]; then
  PID=$(cat "$DAEMON_PIDFILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "24/7 Watchdog Supervisor is already running (PID: $PID)."
    echo "Check status anytime with: bash scripts/dictionary_status.sh"
    exit 0
  fi
fi

echo "=========================================================="
echo "    STARTING 24/7 GROQ DICTIONARY BUILDER & SUPERVISOR    "
echo "=========================================================="
echo "• Will run continuously 24/7 until the computer is powered off."
echo "• Automatically restarts if interrupted or after network drops."
echo "• Auto-pauses at 10 rate limits / 2 min and resumes when quota is half free."

nohup bash "$DIR/scripts/daemon_24_7.sh" >> "$DAEMON_LOGFILE" 2>&1 &
DAEMON_PID=$!
echo "$DAEMON_PID" > "$DAEMON_PIDFILE"

echo "✓ Supervisor launched in background (PID: $DAEMON_PID)."
sleep 2

# Check status
bash "$DIR/scripts/dictionary_status.sh"
