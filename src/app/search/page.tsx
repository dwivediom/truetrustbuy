import { Suspense } from "react";
import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { SearchIndexSsrHeader, SearchResultsListing } from "@/components/search/SearchResultsListing";
import { browseCatalogProducts } from "@/lib/search/browse-catalog";
import { buildSearchFaqJsonLd } from "@/lib/seo/search-faq-jsonld";
import { getPublicSiteOrigin } from "@/lib/site-url";
import { SearchViewInner } from "./search-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const siteOrigin = getPublicSiteOrigin();
  const canonical = `${siteOrigin}/search`;
  const title = "Supplier search — B2B catalogs & MOQ-aware pricing | TrueTrustBuy";
  const description =
    "Browse wholesale listings and run natural-language supplier search with tier pricing, MOQ filters, and verified sellers on TrueTrustBuy.";
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
    robots: { index: true, follow: true },
  };
}

export default async function SearchPage() {
  const browse = await browseCatalogProducts(10);
  const snapshot = {
    results: JSON.parse(JSON.stringify(browse)),
    intent: null,
  };
  const faqLd = buildSearchFaqJsonLd("", browse.length);

  return (
    <>
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
            initialSearchSnapshot={snapshot}
            headerSlot={<SearchIndexSsrHeader />}
            resultsSlot={<SearchResultsListing variant="browse" results={browse} />}
          />
        </SiteChrome>
      </Suspense>
    </>
  );
}
