export type ParsedQuery = {
  original: string;
  maxPrice?: number;
  billingPeriod?: "month" | "year" | "one_time";
  useCaseTerms: string[];
  categoryTerms: string[];
};

export function parseContextQuery(query: string): ParsedQuery {
  const normalized = query.toLowerCase().trim();
  const inrUnder =
    normalized.match(/(?:under|below|max|<=?)\s*₹\s*(\d+(?:\.\d+)?)/i) ??
    normalized.match(/(?:under|below|max|<=?)\s*(?:rs\.?|inr|rupees?)\s*(\d+(?:\.\d+)?)/i) ??
    normalized.match(/₹\s*(\d+(?:\.\d+)?)\s*(?:\/unit|per unit|each)?/i);
  const usdUnder = normalized.match(/under\s*\$?\s*(\d+)/i);
  const priceMatch = inrUnder ?? usdUnder;
  const month = /\b(month|mo|monthly)\b/i.test(normalized);
  const year = /\b(year|yr|yearly|annual)\b/i.test(normalized);
  const oneTime = /\b(one[- ]?time|lifetime)\b/i.test(normalized);
  const forIdx = normalized.indexOf("for ");
  const useCase = forIdx >= 0 ? normalized.slice(forIdx + 4).trim() : "";

  return {
    original: query,
    maxPrice: priceMatch ? Number(priceMatch[1]) : undefined,
    billingPeriod: month ? "month" : year ? "year" : oneTime ? "one_time" : undefined,
    useCaseTerms: useCase ? useCase.split(/\s+/).filter(Boolean) : [],
    categoryTerms: normalized
      .replace(/for .*$/i, "")
      .split(/\s+/)
      .filter(
        (t) =>
          t.length > 2 &&
          ![
            "under",
            "below",
            "max",
            "month",
            "monthly",
            "year",
            "yearly",
            "rs",
            "inr",
            "rupees",
          ].includes(t),
      ),
  };
}
