import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import {
  SearchResultsListing,
  SearchSlugSsrHeader,
} from "@/components/search/SearchResultsListing";
import { parseSearchIntent } from "@/lib/search/intent";
import { buildSearchFaqJsonLd } from "@/lib/seo/search-faq-jsonld";
import { buildSearchItemListJsonLd } from "@/lib/seo/search-item-list-jsonld";
import { runTierAwareSearch } from "@/lib/search/tier-aware-search";
import { getPublicSiteOrigin } from "@/lib/site-url";
import { SearchViewInner } from "../search-view";

export const dynamic = "force-dynamic";

/** Path segment → natural-language query (`glass-bottle` → `glass bottle`). */
export function slugToSearchQuery(slug: string): string {
  try {
    return decodeURIComponent(slug).replace(/-/g, " ").trim();
  } catch {
    return slug.replace(/-/g, " ").trim();
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const phrase = slugToSearchQuery(slug);
  const siteOrigin = getPublicSiteOrigin();
  const title =
    phrase.length > 0
      ? `${phrase} — suppliers & wholesale pricing | TrueTrustBuy`
      : "Supplier search | TrueTrustBuy";
  const description =
    phrase.length > 0
      ? `Find B2B suppliers for ${phrase}. Compare MOQ, tier pricing, and verified manufacturers on TrueTrustBuy.`
      : "B2B supplier discovery with MOQ-aware pricing.";
  const pathSegment = encodeURIComponent(slug).replace(/%2F/gi, "/");
  const canonical = `${siteOrigin}/search/${pathSegment}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function SearchSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const prefilledQuery = slugToSearchQuery(slug);

  const intent = await parseSearchIntent(prefilledQuery);
  const searchOut = await runTierAwareSearch(prefilledQuery, intent, { skipSearchLog: true });

  const jsonLd = buildSearchItemListJsonLd(searchOut.results);
  const faqLd = buildSearchFaqJsonLd(prefilledQuery, searchOut.results.length);

  const snapshot = {
    results: JSON.parse(JSON.stringify(searchOut.results)),
    intent: JSON.parse(JSON.stringify(searchOut.intent)),
  };

  const categoryHints = [...new Set(searchOut.results.map((r) => r.category).filter(Boolean))].slice(
    0,
    3,
  ) as string[];

  const intentHint = searchOut.intent
    ? {
        quantity: searchOut.intent.quantity ?? undefined,
        maxUnitPrice: searchOut.intent.maxUnitPrice ?? undefined,
      }
    : undefined;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Suspense
        fallback={
          <main className="min-h-screen bg-slate-50 px-6 py-12 text-center text-sm font-medium text-slate-500">
            Loading search…
          </main>
        }
      >
        <SiteChrome>
          <SearchViewInner
            prefilledQuery={prefilledQuery}
            initialSearchSnapshot={snapshot}
            headerSlot={
              <SearchSlugSsrHeader
                phraseSeed={prefilledQuery}
                resultCount={searchOut.results.length}
                categoryHints={categoryHints}
              />
            }
            resultsSlot={
              <SearchResultsListing
                variant="search"
                intentHint={intentHint}
                results={searchOut.results}
              />
            }
          />
        </SiteChrome>
      </Suspense>
    </>
  );
}
