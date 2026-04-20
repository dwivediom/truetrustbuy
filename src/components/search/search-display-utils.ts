import type { TierBand } from "@/lib/search/search-result-types";

export function titleCasePhrase(seed: string): string {
  const t = seed.trim();
  if (!t) return "";
  return t
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function tierLabel(min: number, max: number | null): string {
  if (max == null) return `≥ ${min} pcs`;
  return `${min} – ${max} pcs`;
}

export type TierIntentHint = {
  quantity?: number;
  maxUnitPrice?: number;
};

/** Mirrors client `tierHighlight` so SSR listing highlights stay aligned with filters. */
export function tierHighlightFor(tier: TierBand, intent?: TierIntentHint | null): boolean {
  const qty = intent?.quantity;
  const maxP = intent?.maxUnitPrice;
  if (maxP != null && tier.unitPrice > maxP) return false;
  if (qty == null) return maxP != null && tier.unitPrice <= maxP;
  if (tier.minQty > qty) return false;
  if (tier.maxQty != null && tier.maxQty < qty) return false;
  return true;
}

export function searchHeadlineForSeed(resolvedSeed: string): string {
  if (!resolvedSeed.trim()) {
    return "Browse B2B suppliers & wholesale catalogs";
  }
  return `${titleCasePhrase(resolvedSeed)} suppliers & wholesale pricing`;
}

export function seoIntroForSeed(resolvedSeed: string): string {
  const phrase = titleCasePhrase(resolvedSeed.trim() ? resolvedSeed : "");
  if (!phrase) {
    return "Explore recent listings from verified sellers. Compare MOQs, tier-based unit pricing, and chat directly with supplier agents when you narrow your requirement.";
  }
  return `Discover wholesale ${phrase.toLowerCase()} suppliers on TrueTrustBuy — compare GST-aware listings, tier pricing for volume bands, and verified MOQs. Narrow by city, price cap, and quantity using the constraints panel, then contact sellers or open the full listing. Typical categories include industrial packaging, HDPE bottles, drums, agrochemical bottles, bulk bags, and custom OEM runs where noted.`;
}
