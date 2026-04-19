# Programmatic SEO

## Goals

- Capture **long-tail intent** (product + constraint + geo) vs generic directory terms.
- Internal links from homepage “trending” and footer to `/search?q=...`.
- Programmatic **market** URLs: `/market/[category]/[city]` with strong metadata and FAQ schema.

## Current state

- Landing: trending + footer links → `/search?q=...`.
- `/market/[category]/[city]`: **metadata + FAQ JSON-LD**; body links to search.
- `/categories`, `/category/[slug]`: category hubs (distinct categories + listings).
- **Path-based search** (see `src/app/search/[slug]/page.tsx`; e.g. `/search/glass-bottle`): one URL segment; hyphens map to spaces in the search box. `generateMetadata` sets title, description, **Open Graph**, and a **self-referential canonical** (base URL from `AUTH_URL` or `https://truetrustbuy.com`). This is **separate** from `?q=` URLs; pick a single canonical style in internal links to avoid duplicate-indexing the same intent.

## How large orgs think about it (and how we use that here)

- **Don’t index every possible string** at infinite scale. Favor **curated** or **high-demand** programmatic routes in the XML sitemap; arbitrary `/search/[slug]` URLs are discoverable via internal links but need **non-thin** copy signals (counts, facets, editorial intro) before broad indexing.
- **Canonical policy**: Prefer **one winner** per intent — either slug URLs or query URLs — and consolidate with `alternates.canonical` (already on `/search/[slug]`).
- **`noindex,follow`**: Reasonable for **user-generated** or **long-tail filter** combinations without unique value; pair with **follow** so PageRank still flows.
- **Sitemap**: Keep [`src/app/sitemap.ts`](../src/app/sitemap.ts) focused on **stable** hubs (categories, markets); add slug-based search URLs only when you maintain a **whitelist** (e.g. top categories from DB).

## Frontend gaps

- Category and market pages: richer copy, breadcrumbs, related links.
- PDP: unique titles/descriptions per product (server `generateMetadata`).

## Backend / future

- **Gemini-generated meta** per manufacturer/product: batch job + stored fields on Product/Organization.
- **Sitemap**: ensure dynamic routes appear in [`src/app/sitemap.ts`](../src/app/sitemap.ts) when stable slugs exist.

## Acceptance criteria

1. Every programmatic page has a clear CTA to search with encoded intent.
2. No duplicate thin content: pair template text with at least one dynamic signal (category name, counts if available).
