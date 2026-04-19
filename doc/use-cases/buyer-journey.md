# Buyer journey

## Goals

- Describe intent in natural language (price, MOQ, city, spec).
- Get a shortlist that respects tiers and verification.
- Chat or raise RFQ with context.

## Current pages

| Step | Page | Status |
|------|------|--------|
| Discover | `/`, `/search` | Functional |
| Browse taxonomy | `/categories`, `/category/[slug]` | Shell (data-backed) |
| PDP | `/product/[slug]` | Shell (Mongo product by id) |
| Seller surface | `/seller/[slug]` | Shell (seller id + listings) |
| Chats | `/buyer/chats` | Functional |
| RFQ create | `/rfq/new` | Functional |
| RFQ list | `/buyer/rfqs` | Functional |
| Dashboard | `/buyer/dashboard` | Shell (hub) |

## Frontend gaps

- Dashboard: surface recent RFQs, link to chats, saved searches (no backend for “saved” yet).
- PDP: quote CTA wired to RFQ prefill or `POST /api/conversations` (future).
- Registration: no self-serve signup UI until API exists.

## Backend / API gaps

- **Registration**: `POST` signup + org creation (buyer) not implemented; use seed/scripts today.
- **RFQ → seller routing**: RFQs are stored per buyer; no automatic seller notification list (sellers use inbox/product threads).

## Acceptance criteria (incremental)

1. Buyer can complete search → open product → copy id into chat flow (or link from product page).
2. Buyer can submit RFQ with `productQuery`, `quantity`, `budget` and see it on `/buyer/rfqs`.
3. Buyer login lands on `/buyer/dashboard` (not admin/seller).
