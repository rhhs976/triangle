#!/usr/bin/env bash
PIDFILE="/home/lumen/louie/AI/dictionary_generator.pid"
LOGFILE="/home/lumen/louie/AI/dictionary_generator.log"
STATEFILE="/home/lumen/louie/AI/dictionary_generator_state.json"
DAEMON_PIDFILE="/home/lumen/louie/AI/daemon_24_7.pid"

echo "=========================================================="
echo "          GROQ 24/7 DICTIONARY SYSTEM STATUS              "
echo "=========================================================="

if [ -f "$DAEMON_PIDFILE" ]; then
  DPID=$(cat "$DAEMON_PIDFILE")
  if ps -p "$DPID" > /dev/null 2>&1; then
    echo "• 24/7 Supervisor:  ACTIVE (PID: $DPID) [Keeps running 24/7]"
  else
    echo "• 24/7 Supervisor:  STOPPED (Stale PID)"
  fi
else
  echo "• 24/7 Supervisor:  STOPPED"
fi

if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "• Worker Process:   RUNNING (PID: $PID)"
  else
    echo "• Worker Process:   STOPPED"
  fi
else
  echo "• Worker Process:   STOPPED"
fi

if [ -f "$STATEFILE" ]; then
  node -e "
  import fs from 'node:fs';
  try {
    const s = JSON.parse(fs.readFileSync('$STATEFILE', 'utf-8'));
    console.log('• Monitor State:    ' + (s.state || 'N/A'));
    console.log('• Rate Limit Hits:  ' + (s.rateLimitsInLast2Min ?? 0) + ' / 10 in last 2 minutes');
    if (s.tokenPct !== undefined) {
      console.log('• Quota Status:     Tokens ' + s.tokenPct + '% free | Requests ' + s.reqPct + '% free');
    }
  } catch (_) {}
  "
fi

echo ""
node -e "
import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('./data/my_dictionary.db', { readOnly: true });
const count = db.prepare('SELECT count(*) as c FROM my_dictionary').get().c;
console.log('• Total Defined Words in Database: ' + count);
const recent = db.prepare('SELECT word, created_at FROM my_dictionary ORDER BY created_at DESC LIMIT 5').all();
console.log('• 5 Most Recently Generated Words:');
recent.forEach(r => console.log('   - ' + r.word + ' (' + r.created_at + ')'));
"

echo ""
echo "--- Recent Worker Log Output ($LOGFILE) ---"
if [ -f "$LOGFILE" ]; then
  tail -n 8 "$LOGFILE"
else
  echo "No log file found."
fi
echo "=========================================================="
