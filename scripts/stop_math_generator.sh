#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDFILE="$DIR/math_generator.pid"

if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Stopping Math generator process $PID..."
        kill "$PID"
        sleep 1
        kill -9 "$PID" 2>/dev/null || true
        rm -f "$PIDFILE"
        echo "Math generator stopped."
        exit 0
    else
        echo "PID file found but process $PID was not running. Cleaning up."
        rm -f "$PIDFILE"
    fi
else
    echo "No math generator PID file found."
fi

# Fallback kill by command name
pkill -f "scripts/generate_math_mul_div.js" 2>/dev/null && echo "Terminated any leftover math generation processes." || echo "No active processes found."
