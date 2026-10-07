#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PID_FILE="$DIR/web.pid"
LOG_FILE="$DIR/web.log"
PORT="${PORT:-3000}"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "Web server is already running (PID: $PID) at http://localhost:$PORT"
    exit 0
  else
    rm -f "$PID_FILE"
  fi
fi

echo "Starting Unified AI Web Server on port $PORT..."
PORT="$PORT" nohup node "$DIR/src/server.js" >> "$LOG_FILE" 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"
disown "$SERVER_PID" 2>/dev/null || true
sleep 1

if ps -p "$(cat "$PID_FILE")" > /dev/null 2>&1; then
  echo "✓ Web server successfully started (PID: $(cat "$PID_FILE"))!"
  echo "✓ Open your browser at: http://localhost:$PORT"
else
  echo "Failed to start web server. Check $LOG_FILE"
  cat "$LOG_FILE"
  exit 1
fi
