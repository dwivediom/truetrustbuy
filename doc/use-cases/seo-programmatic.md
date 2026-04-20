# Programmatic SEO

## Goals

- Capture **long-tail intent** (product + constraint + geo) vs generic directory terms.
- Internal links from homepage “trending” and footer to `/search?q=...`.
- Programmatic **market** URLs: `/market/[category]/[city]` with strong metadata and FAQ schema.

## Site URL (canonicals, OG, sitemap, robots, manifest)

- Use **`NEXT_PUBLIC_SITE_URL`** (e.g. `https://www.truetrustbuy.in`) as the primary public origin. Resolved in [`src/lib/site-url.ts`](../../src/lib/site-url.ts) with fallbacks: `SITE_URL`, `AUTH_URL`, then dev `http://localhost:3000` or a hardcoded prod fallback.
- [`src/app/layout.tsx`](../../src/app/layout.tsx) `metadataBase`, [`src/app/robots.ts`](../../src/app/robots.ts) sitemap URL, [`src/app/sitemap.ts`](../../src/app/sitemap.ts), homepage JSON-LD in [`src/app/page.tsx`](../../src/app/page.tsx), market/search/product/category/seller metadata all use this origin so **canonical and Open Graph match the deployed host**.

## Current state

- Landing: trending + footer links → `/search?q=...`.
- [`src/app/manifest.ts`](../../src/app/manifest.ts): Web App Manifest with dynamic `start_url`.
- `/market/[category]/[city]`: **metadata + FAQ JSON-LD**; body links to search.
- `/categories`, `/category/[slug]`: category hubs (distinct categories + listings); **`generateMetadata`** + canonical on category hub.
- **Path-based search** (`src/app/search/[slug]/page.tsx`; e.g. `/search/glass-bottle`): hyphens → spaces in the UI; **`ItemList` JSON-LD** (products + `AggregateOffer` bands) emitted on the server; **slug pages** pass an initial search snapshot into `SearchView` to avoid a duplicate API round-trip. Dynamic **H1** and an **intro paragraph** support crawlers and LLMs. Listing cards use **`article`**, **`dl`/`dt`/`dd`**, and **absolute** product/seller URLs via `absoluteUrl()`.
- **PDP** (`src/app/product/[slug]/page.tsx`): `generateMetadata` + **Product** JSON-LD script.

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
