#!/usr/bin/env bash
# Smoke-test public API routes. Requires dev server: npm run dev
set -euo pipefail
BASE="${BASE_URL:-http://localhost:3000}"

code() {
  curl -sS -o /tmp/smoke-body.txt -w "%{http_code}" "$@" || echo "000"
}

echo "== GET /api/search?q=test =="
c=$(code "$BASE/api/search?q=test")
echo "HTTP $c"
head -c 200 /tmp/smoke-body.txt; echo; echo

echo "== GET /api/search/results?q=test =="
c=$(code "$BASE/api/search/results?q=test")
echo "HTTP $c"
head -c 200 /tmp/smoke-body.txt; echo; echo

echo "== POST /api/search/parse (empty) =="
c=$(code -X POST "$BASE/api/search/parse" -H "Content-Type: application/json" -d '{}')
echo "HTTP $c"
cat /tmp/smoke-body.txt; echo; echo

echo "== GET /api/products =="
c=$(code "$BASE/api/products")
echo "HTTP $c"
head -c 200 /tmp/smoke-body.txt; echo; echo

echo "== GET /api/rfqs (no cookie) =="
c=$(code "$BASE/api/rfqs")
echo "HTTP $c"
cat /tmp/smoke-body.txt; echo
