import {
  seoIntroForSeed,
  searchHeadlineForSeed,
  tierHighlightFor,
  tierLabel,
  titleCasePhrase,
  type TierIntentHint,
} from "@/components/search/search-display-utils";
import type { SearchResultItem } from "@/lib/search/search-result-types";
import { absoluteUrl } from "@/lib/site-url";
import {
  Building2,
  IndianRupee,
  MapPin,
  Package,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

export type SearchResultsListingProps = {
  results: SearchResultItem[];
  /** Optional filters for tier band highlighting (matches parsed intent when present). */
  intentHint?: TierIntentHint | null;
  /** Browse mode empty copy vs keyword search empty copy. */
  variant?: "browse" | "search";
};

export function SearchResultsListing({
  results,
  intentHint,
  variant = "search",
}: SearchResultsListingProps) {
  if (results.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white py-16 text-center shadow-sm">
        <Package className="mx-auto mb-4 h-16 w-16 text-slate-300" aria-hidden />
        <h3 className="text-lg font-bold text-slate-900">
          {variant === "browse" ? "No listings yet" : "No matches"}
        </h3>
        <p className="mt-2 text-sm font-medium text-slate-600">
          {variant === "browse"
            ? "Check back soon — sellers are adding catalog items."
            : "Loosen price, quantity, or location — or try different keywords."}
        </p>
      </div>
    );
  }

  return (
    <ul className="m-0 list-none space-y-6 p-0">
      {results.map((product) => {
        const id = String(product._id);
        const seller = product.seller;
        const chips = [...(product.tags ?? []).slice(0, 5), ...(product.useCases ?? []).slice(0, 2)];
        const cur = product.pricingCurrency || product.pricing.currency;

        const productAbsUrl = absoluteUrl(`/product/${id}`);
        const storefrontAbsUrl = seller?.userId ? absoluteUrl(`/seller/${seller.userId}`) : "";

        return (
          <li key={id}>
            <article
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              aria-labelledby={`product-title-ssr-${id}`}
            >
              <div className="flex flex-col md:flex-row">
                <div
                  className={`shrink-0 overflow-hidden border-b border-slate-100 md:w-64 md:border-b-0 md:border-r md:border-slate-100 ${
                    product.images?.[0]
                      ? "relative h-52 md:h-[280px]"
                      : "relative flex h-52 flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-brand-50 md:h-auto md:min-h-[280px]"
                  }`}
                >
                  {product.images?.[0] ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element -- remote seller URLs */}
                      <img
                        src={product.images[0]}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 text-center text-xs font-bold uppercase tracking-wide text-white">
                        {product.category}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/80 ring-1 ring-slate-200/80 shadow-sm">
                        <Package className="h-10 w-10 text-slate-400" aria-hidden />
                      </div>
                      <p className="mt-3 max-w-[14rem] text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                        {product.category}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5 md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        id={`product-title-ssr-${id}`}
                        href={productAbsUrl}
                        className="text-xl font-bold tracking-tight text-slate-900 hover:text-brand-600"
                      >
                        {product.name}
                      </Link>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                        <span className="text-sm font-semibold text-slate-800">{seller?.name ?? "Supplier"}</span>
                        {seller?.isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-900">
                            <ShieldCheck className="h-3 w-3" aria-hidden />
                            Verified
                          </span>
                        ) : null}
                      </div>
                      {seller?.location ? (
                        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                          {seller.location}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm font-medium text-slate-600">{product.description}</p>

                  <dl className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div>
                        <dt className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                          <Package className="h-3 w-3" aria-hidden />
                          MOQ
                        </dt>
                        <dd
                          className="font-bold text-slate-900"
                          aria-label={`Minimum order quantity ${product.displayMoq} pieces`}
                        >
                          {product.displayMoq} pcs
                        </dd>
                      </div>
                      {product.tierBands.length > 0 ? (
                        product.tierBands.map((tier, idx) => (
                          <div
                            key={`${tier.minQty}-${idx}`}
                            className={
                              tierHighlightFor(tier, intentHint)
                                ? "rounded-xl border border-emerald-200 bg-emerald-50 p-2 -m-1 sm:m-0"
                                : ""
                            }
                          >
                            <dt className="mb-1 text-xs font-semibold text-slate-500">
                              Unit price ({tierLabel(tier.minQty, tier.maxQty)})
                            </dt>
                            <dd
                              className="flex items-center font-bold text-slate-900"
                              aria-label={`Unit price ${tier.unitPrice} ${cur} per piece for quantity band ${tierLabel(
                                tier.minQty,
                                tier.maxQty,
                              )}`}
                            >
                              {cur === "INR" ? (
                                <IndianRupee className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden />
                              ) : (
                                <span className="mr-0.5 text-xs">{cur}</span>
                              )}
                              {tier.unitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              <span className="ml-1 text-xs font-medium text-slate-500">/pc</span>
                            </dd>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 sm:col-span-3">
                          <dt className="mb-1 text-xs font-semibold text-slate-500">List price</dt>
                          <dd className="flex items-center font-bold text-slate-900">
                            <IndianRupee className="h-3.5 w-3.5 text-slate-600" aria-hidden />
                            {product.pricing.amount.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}
                            <span className="ml-1 text-xs font-medium text-slate-500">/ unit</span>
                          </dd>
                        </div>
                      )}
                    </div>
                  </dl>
                  {product.tierMatch?.belowMoq ? (
                    <p className="mt-2 text-xs font-semibold text-amber-800">
                      Below MOQ at your quantity — tiers show reference bands.
                    </p>
                  ) : null}

                  {chips.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {chips.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                    <Link
                      href={productAbsUrl}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 sm:flex-none"
                    >
                      View listing & contact
                    </Link>
                    {seller?.userId && storefrontAbsUrl ? (
                      <Link
                        href={storefrontAbsUrl}
                        className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-brand-200 sm:flex-none"
                      >
                        Supplier storefront
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

/** SEO header block for slug routes (server-rendered). */
export function SearchSlugSsrHeader({
  phraseSeed,
  resultCount,
  categoryHints,
}: {
  phraseSeed: string;
  resultCount: number;
  categoryHints: string[];
}) {
  const headline = searchHeadlineForSeed(phraseSeed);
  const intro = seoIntroForSeed(phraseSeed);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">{headline}</h1>
      <section aria-labelledby="search-seo-intro-heading" className="mt-4 max-w-3xl">
        <h2 id="search-seo-intro-heading" className="sr-only">
          About this search
        </h2>
        <p className="text-sm font-medium leading-relaxed text-slate-700">{intro}</p>
        {categoryHints.length > 0 ? (
          <p className="mt-3 text-xs font-medium text-slate-600">
            Sample categories in results:{" "}
            <span className="font-semibold text-slate-800">{categoryHints.join(" · ")}</span>
          </p>
        ) : null}
        <p className="mt-3 text-xs font-medium text-slate-600">
          {resultCount === 0
            ? `No supplier listings matched “${titleCasePhrase(phraseSeed)}” with the current index — refine MOQ, location, or keywords in the panel.`
            : `Showing ${resultCount} listing${resultCount === 1 ? "" : "s"} relevant to “${titleCasePhrase(phraseSeed)}”. MOQs and tiers vary by seller; open a listing for full specs.`}
        </p>
      </section>
      <Link href="/" className="mt-2 inline-block text-sm font-semibold text-brand-600 hover:underline">
        ← Back to home
      </Link>
    </div>
  );
}

/** SEO intro for base `/search` browse mode. */
export function SearchIndexSsrHeader() {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
        {searchHeadlineForSeed("")}
      </h1>
      <section aria-labelledby="search-index-intro" className="mt-4 max-w-3xl">
        <h2 id="search-index-intro" className="sr-only">
          About supplier search
        </h2>
        <p className="text-sm font-medium leading-relaxed text-slate-700">{seoIntroForSeed("")}</p>
        <p className="mt-3 max-w-2xl text-sm font-medium text-slate-600">
          Recent listings load below — enter a query above to filter by product, MOQ, price, or location.
        </p>
      </section>
      <Link href="/" className="mt-2 inline-block text-sm font-semibold text-brand-600 hover:underline">
        ← Back to home
      </Link>
    </div>
  );
}
