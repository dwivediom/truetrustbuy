import { SiteChrome } from "@/components/layout/SiteChrome";
import type { Metadata } from "next";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; city: string }>;
}): Promise<Metadata> {
  const { category, city } = await params;
  const title = `${category.replace(/-/g, " ")} suppliers in ${city.replace(/-/g, " ")} | TrueTrustBuy`;
  const description = `Find verified ${category.replace(/-/g, " ")} manufacturers and suppliers in ${city.replace(/-/g, " ")} with MOQ and pricing filters.`;
  const url = `https://truetrustbuy.com/market/${category}/${city}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function MarketLandingPage({
  params,
}: {
  params: Promise<{ category: string; city: string }>;
}) {
  const { category, city } = await params;
  const humanCategory = category.replace(/-/g, " ");
  const humanCity = city.replace(/-/g, " ");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `What is the average MOQ for ${humanCategory} in ${humanCity}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: "MOQ varies by supplier. Use quantity filters to find suitable matches.",
        },
      },
      {
        "@type": "Question",
        name: `How to find GST verified ${humanCategory} suppliers in ${humanCity}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use verified filters on search results to shortlist compliant suppliers.",
        },
      },
    ],
  };
  const searchQ = encodeURIComponent(`${humanCategory} suppliers ${humanCity} wholesale`);

  return (
    <SiteChrome>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          {humanCategory} suppliers in {humanCity}
        </h1>
        <p className="mt-2 max-w-2xl text-lg font-medium text-slate-600">
          Long-tail programmatic page for discovery. Run agentic search with your MOQ, price cap, and
          delivery constraints—then shortlist verified suppliers.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/search?q=${searchQ}`}
            className="inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-brand-600"
          >
            Search with intent
          </Link>
          <Link
            href="/categories"
            className="inline-flex rounded-full border-2 border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-900 hover:border-brand-300"
          >
            All categories
          </Link>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </main>
    </SiteChrome>
  );
}

