#!/usr/bin/env bash
PIDFILE="/home/lumen/louie/AI/pipeline.pid"
STATE_FILE="/home/lumen/louie/AI/data/pipeline_state.json"
GRAMMAR_FILE="/home/lumen/louie/AI/data/grammar_sentences.jsonl"
MATH_FILE="/home/lumen/louie/AI/data/math_qna.jsonl"
GAME_FILE="/home/lumen/louie/AI/data/game_results_2000.jsonl"

echo "=========================================================="
echo "             AUTOMATED PIPELINE STATUS REPORT             "
echo "=========================================================="

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "Process: RUNNING (PID $PID)"
  else
    echo "Process: STOPPED / FINISHED"
  fi
else
  echo "Process: IDLE"
fi

if [ -f "$STATE_FILE" ]; then
  echo -e "\nCurrent Pipeline State:"
  cat "$STATE_FILE"
  echo ""
fi

echo -e "\nCurrent Dataset Progress:"
if [ -f "$GRAMMAR_FILE" ]; then
  G_COUNT=$(wc -l < "$GRAMMAR_FILE")
  echo "  - Grammar Sentences : $G_COUNT / 3000"
else
  echo "  - Grammar Sentences : 0 / 3000"
fi

if [ -f "$MATH_FILE" ]; then
  M_COUNT=$(wc -l < "$MATH_FILE")
  echo "  - Math Q&A Dataset  : $M_COUNT / 1000+"
else
  echo "  - Math Q&A Dataset  : 0 / 1000+"
fi

if [ -f "$GAME_FILE" ]; then
  GAME_COUNT=$(wc -l < "$GAME_FILE")
  echo "  - Game Rounds Played: $GAME_COUNT / 2000"
else
  echo "  - Game Rounds Played: 0 / 2000"
fi

echo "=========================================================="
