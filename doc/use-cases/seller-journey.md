# Seller journey

## Goals

- Onboard catalog with tiered pricing and MOQ.
- Configure agent rules and knowledge so buyers get accurate answers.
- Respond in inbox; optionally pause AI or hand off to human.

## Current pages

| Step | Page | Status |
|------|------|--------|
| Hub | `/seller/dashboard` | Functional — conversation counts, AI vs human messages, handoffs, top RFQ intent tokens vs catalog |
| Catalog | `/seller/products` | Functional — list, create, delete (`DELETE /api/seller/products/[id]` cascades pricing rules) |
| Tiers | `/seller/pricing-rules` | Functional |
| Agent FAQ | `/seller/agent-rules` | Functional |
| Knowledge | `/seller/chatbot-knowledge` | Functional — upload + optional “Test my agent” via `POST /api/seller/bot/respond` |
| Settings | `/seller/settings` | Functional |
| Verification | `/seller/verification` | Functional — org id from `GET /api/seller/profile-bundle` |
| Inbox | `/seller/inbox` | Functional |
| Insights | `/seller/market-insights` | Functional |
| Profile JSON | `/seller/profile-export` | Functional |
| Leads | `/seller/leads` | Functional — `GET /api/seller/leads` scores open RFQs vs your categories/tags |
| Storefront | `/seller/[slug]` | Functional — public id = user id, metadata + verified badge |

## Routing

- **Middleware** protects `/seller/*` for signed-in users with role **seller** or **admin**.
- **Public** storefront stays open: `/seller/[24-character Mongo ObjectId]` only.

## Frontend gaps

- ~~Leads API~~ addressed with category/tag overlap scoring on open RFQs.

## Backend / API gaps

- **Registration** for sellers same as buyers (optional parity work).

## Acceptance criteria

1. Seller can CRUD products and pricing rules; search results reflect tiers where data exists.
2. Seller can submit verification and manage agent rules / uploads.
3. Public `/seller/[userId]` lists that seller’s products for sharing.
