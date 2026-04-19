import type { TierMatchMeta } from "@/lib/search/match-suppliers";

/** Lean product fields used when shaping search/browse API responses. */
export type SearchProductLean = {
  _id: { toString(): string };
  name: string;
  description: string;
  category: string;
  images?: string[];
  pricing: { amount: number; currency: string; billingPeriod: string };
  metadata?: { sellerOrgId?: string };
  tags?: string[];
  useCases?: string[];
  customizationAvailable?: boolean;
};

export type SearchSellerSnapshot = {
  userId: string;
  name: string;
  isVerified: boolean;
  location?: string;
};

export type TierBand = {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
};

export type SearchResultItem = SearchProductLean & {
  tierMatch: TierMatchMeta | null;
  missingPricingRule: boolean;
  tierBands: TierBand[];
  displayMoq: number;
  pricingCurrency: string;
  seller: SearchSellerSnapshot | null;
};
