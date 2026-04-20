import type { SearchResultItem } from "@/lib/search/search-result-types";
import { absoluteUrl } from "@/lib/site-url";

/** ItemList + Product + AggregateOffer for SERP / LLM consumption. */
export function buildSearchItemListJsonLd(results: SearchResultItem[]): Record<string, unknown> {
  const items = results.slice(0, 50).map((r, i) => {
    const prices =
      r.tierBands.length > 0 ? r.tierBands.map((t) => t.unitPrice) : [r.pricing.amount];
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const productUrl = absoluteUrl(`/product/${String(r._id)}`);
    const brandName = r.seller?.name?.trim() || "Supplier";
    return {
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: r.name,
        url: productUrl,
        brand: { "@type": "Organization", name: brandName },
        offers: {
          "@type": "AggregateOffer",
          lowPrice: String(low),
          highPrice: String(high),
          priceCurrency: r.pricingCurrency || r.pricing.currency || "INR",
        },
      },
    };
  });

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: items.length,
    itemListElement: items,
  };
}
