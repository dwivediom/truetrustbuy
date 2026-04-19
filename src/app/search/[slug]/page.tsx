import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchView } from "../search-view";

const SITE = process.env.AUTH_URL?.replace(/\/$/, "") ?? "https://truetrustbuy.com";

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
  const title =
    phrase.length > 0
      ? `${phrase} — suppliers & wholesale pricing | TrueTrustBuy`
      : "Supplier search | TrueTrustBuy";
  const description =
    phrase.length > 0
      ? `Find B2B suppliers for ${phrase}. Compare MOQ, tier pricing, and verified manufacturers on TrueTrustBuy.`
      : "B2B supplier discovery with MOQ-aware pricing.";
  const pathSegment = encodeURIComponent(slug).replace(/%2F/gi, "/");
  const canonical = `${SITE}/search/${pathSegment}`;

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

  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-6 py-12 text-center text-sm font-medium text-slate-500">
          Loading search…
        </main>
      }
    >
      <SearchView prefilledQuery={prefilledQuery} />
    </Suspense>
  );
}
