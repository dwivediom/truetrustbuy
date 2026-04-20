import { titleCasePhrase } from "@/components/search/search-display-utils";

/** FAQ schema for supplier search landing and keyword slug pages (ItemList stays separate). */
export function buildSearchFaqJsonLd(phrase: string, resultCount: number): Record<string, unknown> {
  const title = phrase.trim() ? titleCasePhrase(phrase) : "B2B supplier search";
  const phraseLower = title.toLowerCase();

  const dynamicIntro =
    resultCount === 0
      ? `Zero listings matched your filters for now — broaden quantity, drop the price cap, or try synonyms for “${title}”. MOQs are seller-specific; verified badges indicate GST/KYC checks on TrueTrustBuy.`
      : `These ${resultCount} listing${resultCount === 1 ? "" : "s"} surface tier bands and MOQs pulled from seller catalogs. Prices are indicative — confirm freight, tooling, and taxes on the listing thread before you commit.`;

  const mainEntity = [
    {
      "@type": "Question",
      name:
        phrase.trim().length > 0
          ? `What MOQ should I expect for ${title}?`
          : `How does MOQ work on TrueTrustBuy supplier search?`,
      acceptedAnswer: {
        "@type": "Answer",
        text:
          phrase.trim().length > 0
            ? `MOQ varies by seller and SKU for ${phraseLower}. Each card shows display MOQ plus tier bands; if your quantity sits below MOQ you may still negotiate — use chat or request a quote from the listing.`
            : `Every card shows minimum order quantity (MOQ) and quantity bands. Sellers set MOQs on their pricing rules; hybrid search ranks matches but does not guarantee stock — always confirm with the seller.`,
      },
    },
    {
      "@type": "Question",
      name:
        phrase.trim().length > 0
          ? `How do I refine ${phraseLower} wholesale suppliers on TrueTrustBuy?`
          : `How do I refine wholesale suppliers on TrueTrustBuy?`,
      acceptedAnswer: {
        "@type": "Answer",
        text:
          `Use the constraints panel after your query parses: cap unit price, set quantity for tier matching, filter by city or verified-only sellers, and re-run search. Tier highlights show which band fits your volume when pricing rules exist.`,
      },
    },
    {
      "@type": "Question",
      name: `Are prices GST-inclusive for ${phrase.trim() ? phraseLower : "these"} listings?`,
      acceptedAnswer: {
        "@type": "Answer",
        text:
          `Listings aim to be GST-aware where sellers provided tax detail, but duties, freight, and tooling can change totals. Open the product page and message the seller agent for an exact quote tied to your delivery pin and timeline.`,
      },
    },
    {
      "@type": "Question",
      name:
        phrase.trim().length > 0
          ? `Why might ${title} show ${resultCount === 0 ? "no" : "these"} results?`
          : `Why might search show few or no results?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: dynamicIntro,
      },
    },
  ];

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  };
}
