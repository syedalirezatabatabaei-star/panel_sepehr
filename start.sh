#!/usr/bin/env bash
set -Eeuo pipefail

cd /app
uvicorn API.main:app --host 0.0.0.0 --port 8005 &
API_PID=$!
python -m http.server 8085 --directory /app/Frontend &
WEB_PID=$!

cleanup() {
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

set +e
wait -n "$API_PID" "$WEB_PID"
EXIT_CODE=$?
set -e
exit "$EXIT_CODE"
