#!/bin/bash
# Test contract update on production

# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dg@trackyugps.com","password":"admin"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('token','NO_TOKEN'))" 2>/dev/null)

echo "Token: ${TOKEN:0:30}..."

# 2. Test contract update with minimal payload
RESULT=$(curl -s -w "\n%{http_code}" -X PUT \
  "http://localhost:3001/api/contracts/0fcd30d2-9da1-4644-b33c-fcd2e7f8c550" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"EXPIRED","monthly_fee":80000}')

HTTP_CODE=$(echo "$RESULT" | tail -1)
BODY=$(echo "$RESULT" | head -n -1)

echo "HTTP Status: $HTTP_CODE"
echo "Response: ${BODY:0:500}"
