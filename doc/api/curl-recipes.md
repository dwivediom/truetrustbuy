# API curl recipes

Base URL examples use `http://localhost:3000`. Run `npm run dev` first.

## Environment

- `MONGO_URI` — required for most routes (otherwise handlers throw or return 500).
- `GEMINI_API_KEY` — intent parsing, embeddings, bot, translation.
- `ADMIN_BOOTSTRAP_SECRET` — `POST /api/admin/seed` header.
- `CRON_SECRET` — `GET /api/cron/pricing-insights?secret=...`

## Authenticated requests (session cookie)

NextAuth v5 uses HTTP-only cookies. After logging in via the browser:

1. Open DevTools → Application → Cookies → copy `authjs.session-token` (name may be `__Secure-authjs.session-token` in production).
2. Pass: `-H "Cookie: authjs.session-token=YOUR_VALUE"`

Or use **Safari/WebKit export** / browser extension. Replace `COOKIE` below.

---

## Seller self-registration

Creates a **seller** user, organization row, and password hash (same scheme as NextAuth credentials).

```bash
curl -sS -X POST "http://localhost:3000/api/register/seller" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"factory@example.com",
    "password":"your-long-password",
    "businessName":"Demo Glass Pvt Ltd",
    "industryCategory":"Glass & ceramics",
    "gstin":"",
    "phone":"+919876543210",
    "phoneNotifyConsent":true,
    "preferredLanguage":"en",
    "agentMode":"negotiate"
  }'
```

Expect `201` and `{ "ok": true }`, or `409` if the email exists.

---

## Public / low-friction

### Hybrid search (embeddings + intent)

```bash
curl -sS "http://localhost:3000/api/search?q=glass%20bottles%20under%2020%20rupees"
```

Expect `200` + JSON with search results. Fails if DB/embeddings unavailable.

### Tier-aware search results (Mongo + intent)

```bash
curl -sS "http://localhost:3000/api/search/results?q=pharma%20PET%20jars%20Gujarat"
```

`POST` variant:

```bash
curl -sS -X POST "http://localhost:3000/api/search/results" \
  -H "Content-Type: application/json" \
  -d '{"q":"500 glass bottles Mumbai","overrides":{"quantity":500}}'
```

### Parse intent only

```bash
curl -sS -X POST "http://localhost:3000/api/search/parse" \
  -H "Content-Type: application/json" \
  -d '{"query":"organic cotton MOQ 100 under 500 rupees"}'
```

### List products (public GET)

```bash
curl -sS "http://localhost:3000/api/products"
```

---

## Admin bootstrap (no session)

Create first admin (one-time):

```bash
curl -sS -X POST "http://localhost:3000/api/admin/seed" \
  -H "Content-Type: application/json" \
  -H "x-seed-secret: $ADMIN_BOOTSTRAP_SECRET" \
  -d '{"email":"admin@example.com","password":"your-secure-password","name":"Admin"}'
```

### Admin ping (session)

```bash
curl -sS "http://localhost:3000/api/admin/seed" \
  -H "Cookie: COOKIE"
```

---

## Cron

```bash
curl -sS "http://localhost:3000/api/cron/pricing-insights?secret=$CRON_SECRET"
```

---

## Buyer / seller / admin (Cookie required)

### RFQs

List:

```bash
curl -sS "http://localhost:3000/api/rfqs" -H "Cookie: COOKIE"
```

Create:

```bash
curl -sS -X POST "http://localhost:3000/api/rfqs" \
  -H "Content-Type: application/json" \
  -H "Cookie: COOKIE" \
  -d '{"productQuery":"5000 amber glass bottles","quantity":5000,"budget":50000,"currency":"INR"}'
```

### Conversations

List:

```bash
curl -sS "http://localhost:3000/api/conversations" -H "Cookie: COOKIE"
```

Create (buyer; `productId` must exist and carry `metadata.sellerOrgId`):

```bash
curl -sS -X POST "http://localhost:3000/api/conversations" \
  -H "Content-Type: application/json" \
  -H "Cookie: COOKIE" \
  -d '{"productId":"PRODUCT_OBJECT_ID"}'
```

### Messages

```bash
curl -sS "http://localhost:3000/api/conversations/CONV_ID/messages" \
  -H "Cookie: COOKIE"
```

```bash
curl -sS -X POST "http://localhost:3000/api/conversations/CONV_ID/messages" \
  -H "Content-Type: application/json" \
  -H "Cookie: COOKIE" \
  -d '{"content":"What is MOQ for 2000 units?"}'
```

### Conversation settings (seller)

```bash
curl -sS -X PATCH "http://localhost:3000/api/conversations/CONV_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: COOKIE" \
  -d '{"aiAssistantEnabled":false,"handoffToHuman":true}'
```

### Seller products

```bash
curl -sS "http://localhost:3000/api/seller/products" -H "Cookie: COOKIE"
```

Create (shape must match `productSchema`):

```bash
curl -sS -X POST "http://localhost:3000/api/seller/products" \
  -H "Content-Type: application/json" \
  -H "Cookie: COOKIE" \
  -d '{
    "name":"Sample SKU",
    "description":"Long enough description here for validation.",
    "category":"Packaging",
    "useCases":["retail"],
    "tags":["bottle"],
    "pricing":{"amount":12,"currency":"INR","billingPeriod":"one_time"}
  }'
```

### Pricing rules

```bash
curl -sS "http://localhost:3000/api/seller/pricing-rules" -H "Cookie: COOKIE"
```

```bash
curl -sS -X POST "http://localhost:3000/api/seller/pricing-rules" \
  -H "Content-Type: application/json" \
  -H "Cookie: COOKIE" \
  -d '{
    "productId":"PRODUCT_ID",
    "currency":"INR",
    "moq":500,
    "tiers":[{"minQty":500,"maxQty":1999,"unitPrice":11.5,"leadTimeDays":14},{"minQty":2000,"maxQty":null,"unitPrice":9.25,"leadTimeDays":21}]
  }'
```

### Agent rules

```bash
curl -sS "http://localhost:3000/api/seller/agent-rules" -H "Cookie: COOKIE"
```

```bash
curl -sS -X POST "http://localhost:3000/api/seller/agent-rules" \
  -H "Content-Type: application/json" \
  -H "Cookie: COOKIE" \
  -d '{"statement":"We ship only prepaid for first orders.","priority":10}'
```

### Bot respond (Gemini)

```bash
curl -sS -X POST "http://localhost:3000/api/seller/bot/respond" \
  -H "Content-Type: application/json" \
  -H "Cookie: COOKIE" \
  -d '{"productId":"PRODUCT_ID","question":"What is price for 1200 pieces?","quantity":1200}'
```

### Knowledge upload (multipart)

```bash
curl -sS -X POST "http://localhost:3000/api/seller/knowledge/upload" \
  -H "Cookie: COOKIE" \
  -F "file=@./sample.txt"
```

### Verification submit

```bash
curl -sS -X POST "http://localhost:3000/api/seller/verification/submit" \
  -H "Content-Type: application/json" \
  -H "Cookie: COOKIE" \
  -d '{"orgId":"ORG_OBJECT_ID","gstin":"22AAAAA0000A1Z5","documents":[]}'
```

### Profile bundle

```bash
curl -sS "http://localhost:3000/api/seller/profile-bundle" -H "Cookie: COOKIE"
```

### Pricing insights

```bash
curl -sS "http://localhost:3000/api/seller/pricing-insights" -H "Cookie: COOKIE"
```

Dismiss alert:

```bash
curl -sS -X PATCH "http://localhost:3000/api/seller/pricing-insights" \
  -H "Content-Type: application/json" \
  -H "Cookie: COOKIE" \
  -d '{"id":"ALERT_ID","dismissed":true}'
```

### User preferences

```bash
curl -sS -X PATCH "http://localhost:3000/api/user/preferences" \
  -H "Content-Type: application/json" \
  -H "Cookie: COOKIE" \
  -d '{"preferredLanguage":"hi","agentInstructions":"Mention factory location when asked."}'
```

### Admin: create product

```bash
curl -sS -X POST "http://localhost:3000/api/products" \
  -H "Content-Type: application/json" \
  -H "Cookie: COOKIE" \
  -d '{ ... productSchema JSON ... }'
```

### Admin: bulk import

```bash
curl -sS -X POST "http://localhost:3000/api/products/bulk" \
  -H "Content-Type: application/json" \
  -H "Cookie: COOKIE" \
  -d '{"items":[{ ... },{ ... }]}'
```

### Admin: approve verification

```bash
curl -sS -X POST "http://localhost:3000/api/admin/verification/VERIFICATION_ID/approve" \
  -H "Cookie: COOKIE"
```

```bash
curl -sS -X POST "http://localhost:3000/api/admin/verification/VERIFICATION_ID/reject" \
  -H "Cookie: COOKIE"
```

---

## Smoke test results (local)

With `npm run dev` running and a valid `.env` (this repo was verified on a machine with Mongo available):

```bash
./scripts/smoke-api.sh
# or BASE_URL=http://127.0.0.1:3000 ./scripts/smoke-api.sh
```

| Endpoint | Expected without auth | Notes |
|----------|----------------------|--------|
| `GET /api/search?q=test` | 200 | JSON with `parsed` + `results` |
| `GET /api/search/results?q=test` | 200 | JSON with `intent` + `results` |
| `POST /api/search/parse` with `{}` | 400 | `{ "error": "query is required" }` |
| `GET /api/rfqs` | 401 | `{ "error": "Unauthorized" }` |
| `GET /api/products` | 200 | `{ "products": [...] }` |

If `MONGO_URI` is missing, routes that call `connectDb()` may return **500** — fix env before re-running.
