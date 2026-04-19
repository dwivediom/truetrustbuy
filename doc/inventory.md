# Route inventory

All **App Router** pages under `src/app/**/page.tsx`. Status: **Stub** (static / placeholder), **Shell** (metadata or partial UX, little data), **Functional** (real data or API-backed flows).

| Route | Status | Auth / role | Primary APIs (if any) |
|-------|--------|-------------|------------------------|
| `/` | Functional | Public | — (marketing) |
| `/login` | Functional | Public | `POST /api/auth/callback` (via `signIn`) |
| `/adminlogin` | Functional | Public | same |
| `/register/buyer` | Stub → Shell | Public | *None* (no registration API) |
| `/register/seller` | Stub → Shell | Public | *None* |
| `/search` | Functional | Public | `GET /api/search`, `GET /api/search/results` (via view) |
| `/categories` | Shell | Public | Mongo: `Product.distinct("category")` → hub |
| `/category/[slug]` | Shell | Public | Mongo: products by category slug |
| `/product/[slug]` | Shell | Public | Mongo: `Product` by id (`slug` = 24-char ObjectId) |
| `/market/[category]/[city]` | Shell | Public | SEO + deep link to `/search` |
| `/seller/[slug]` | Functional | Public | Mongo: seller user + products (`slug` = seller user id), `generateMetadata` |
| `/buyer/dashboard` | Shell | Buyer* | — |
| `/buyer/chats` | Functional | Buyer* | `GET/POST /api/conversations`, messages routes |
| `/buyer/rfqs` | Functional | Buyer* | `GET /api/rfqs` (client list) |
| `/rfq/new` | Functional | Buyer* | `POST /api/rfqs` + `?prefill=` |
| `/seller/dashboard` | Functional | Seller* / Admin* | `computeSellerMetrics` (conversations, handoffs, intents) |
| `/seller/products` | Functional | Seller* | `GET/POST /api/seller/products`, `DELETE /api/seller/products/[id]` |
| `/seller/pricing-rules` | Functional | Seller* | `GET/POST/PATCH/DELETE /api/seller/pricing-rules` |
| `/seller/agent-rules` | Functional | Seller* | `GET/POST /api/seller/agent-rules`, `PATCH/DELETE .../[id]` |
| `/seller/chatbot-knowledge` | Functional | Seller* | `POST /api/seller/knowledge/upload` |
| `/seller/settings` | Functional | Seller* | `PATCH /api/user/preferences` |
| `/seller/verification` | Functional | Seller* | `POST /api/seller/verification/submit` |
| `/seller/inbox` | Functional | Seller* | conversations + messages |
| `/seller/leads` | Functional | Seller* | `GET /api/seller/leads` (RFQ match) |
| `/seller/market-insights` | Functional | Seller* | `GET/PATCH /api/seller/pricing-insights` |
| `/seller/profile-export` | Functional | Seller* | `GET /api/seller/profile-bundle` |
| `/admin` | Functional | Admin | `GET/POST /api/products`, forms |
| `/admin/import` | Functional | Admin | bulk import API via form |
| `/admin/listings/moderation` | Stub | Admin | — |
| `/admin/taxonomy` | Stub | Admin | — |
| `/admin/sellers/pending-verification` | Stub | Admin | `POST .../approve`, `.../reject` (not wired in UI) |

- *Expected role* for full UX; unauthenticated users hit flows that redirect or show errors.
- **Seller tools** (`/seller/*` except public storefront `[24-hex-id]`) require NextAuth session with role **seller** or **admin** (middleware).

## API route index

| Path | Methods | Auth |
|------|---------|------|
| `/api/auth/[...nextauth]` | `GET`, `POST` | — |
| `/api/search` | `GET` | Public |
| `/api/search/parse` | `POST` | Public |
| `/api/search/results` | `GET`, `POST` | Public |
| `/api/products` | `GET` public list; `POST` admin | Admin for POST |
| `/api/products/bulk` | `POST` | Admin |
| `/api/rfqs` | `GET`, `POST` | Buyer or Admin |
| `/api/conversations` | `GET`, `POST` | Buyer/Seller/Admin (role-scoped) |
| `/api/conversations/[id]` | `PATCH` | Seller or Admin |
| `/api/conversations/[id]/messages` | `GET`, `POST` | Buyer/Seller/Admin |
| `/api/seller/products` | `GET`, `POST` | Seller or Admin |
| `/api/seller/products/[id]` | `DELETE` | Seller or Admin (seller owns SKU) |
| `/api/seller/metrics` | `GET` | Seller or Admin |
| `/api/seller/leads` | `GET` | Seller or Admin |
| `/api/seller/pricing-rules` | `GET`, `POST`, … | Seller or Admin |
| `/api/seller/agent-rules` | `GET`, `POST` | Seller or Admin |
| `/api/seller/agent-rules/[id]` | `PATCH`, `DELETE` | Seller or Admin |
| `/api/seller/bot/respond` | `POST` | Seller or Admin |
| `/api/seller/knowledge/upload` | `POST` | Seller or Admin |
| `/api/seller/verification/submit` | `POST` | Seller or Admin |
| `/api/seller/profile-bundle` | `GET` | Seller or Admin |
| `/api/seller/pricing-insights` | `GET`, `PATCH` | Seller or Admin |
| `/api/user/preferences` | `PATCH` | Buyer/Seller/Admin |
| `/api/register/seller` | `POST` | Public (creates seller + org) |
| `/api/admin/seed` | `POST` (bootstrap secret), `GET` (admin check) | Mixed |
| `/api/admin/verification/[id]/approve` | `POST` | Admin |
| `/api/admin/verification/[id]/reject` | `POST` | Admin |
| `/api/cron/pricing-insights` | `GET` | `?secret=` must match `CRON_SECRET` |

## Environment dependencies

- **MongoDB**: `MONGO_URI` — required for most APIs.
- **Gemini**: `GEMINI_API_KEY` / model env — intent parsing, embeddings, bot, translation.
- **Auth**: NextAuth `AUTH_SECRET`, etc. (see project env samples).
- **Bootstrap**: `ADMIN_BOOTSTRAP_SECRET` for `POST /api/admin/seed`.
- **Cron**: `CRON_SECRET` for pricing-insights cron URL.
