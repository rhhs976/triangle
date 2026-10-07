#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDFILE="$DIR/math_generator.pid"
LOGFILE="$DIR/math_generator.log"

if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Math generator is already running with PID $PID"
        exit 0
    else
        rm -f "$PIDFILE"
    fi
fi

echo "Starting Groq Multiplication & Division Generator (Target: 2,000)..."
nohup node "$DIR/scripts/generate_math_mul_div.js" >> "$LOGFILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PIDFILE"

echo "Started background process with PID $NEW_PID"
echo "Logging output to: $LOGFILE"
echo "Monitor status with: bash scripts/math_status.sh"
