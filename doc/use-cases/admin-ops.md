# Admin operations

## Goals

- Seed or bootstrap admins safely.
- Import catalog; create products with validation.
- Moderate taxonomy and listings; approve seller verification.

## Current pages

| Page | Status |
|------|--------|
| `/admin` | Functional (product form) |
| `/admin/import` | Functional |
| `/admin/listings/moderation` | Stub |
| `/admin/taxonomy` | Stub |
| `/admin/sellers/pending-verification` | Stub (APIs exist) |

## APIs

- `POST /api/admin/seed` — header `x-seed-secret: $ADMIN_BOOTSTRAP_SECRET`, body `{ email, password, name }`.
- `GET /api/admin/seed` — admin session check.
- `POST /api/admin/verification/[id]/approve` | `reject` — admin session.

## Frontend gaps

- Pending verification UI should list `SellerVerification` documents and call approve/reject.
- Moderation and taxonomy: define models and wire lists.

## Acceptance criteria

1. Admin can log in and create products via UI or bulk import.
2. Stub admin pages either gain minimal lists or link to external process until models exist.
