#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDFILE="$DIR/math_generator.pid"
LOGFILE="$DIR/math_generator.log"
OUTPUT_FILE="$DIR/data/math_multiplication_division.jsonl"
STATE_FILE="$DIR/data/math_mul_div_state.json"

echo "=========================================================="
echo "      GROQ MATH GENERATOR STATUS (MULTIPLICATION & DIVISION)"
echo "=========================================================="

if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE")
    if kill -0 "$PID" 2>/dev/null; then
        echo "Process Status:   RUNNING (PID: $PID)"
    else
        echo "Process Status:   STOPPED (Stale PID: $PID)"
    fi
else
    echo "Process Status:   NOT RUNNING"
fi

if [ -f "$OUTPUT_FILE" ]; then
    TOTAL=$(wc -l < "$OUTPUT_FILE")
    echo "Questions Ready:  $TOTAL / 2,000"
    PERCENT=$(awk "BEGIN {printf \"%.1f\", ($TOTAL/2000)*100}")
    echo "Progress:         $PERCENT%"
else
    echo "Questions Ready:  0 / 2,000 (0.0%)"
fi

if [ -f "$STATE_FILE" ]; then
    echo "Last State:"
    cat "$STATE_FILE"
fi

if [ -f "$LOGFILE" ]; then
    echo -e "\nLast 15 log lines:"
    tail -n 15 "$LOGFILE"
fi
echo "=========================================================="
