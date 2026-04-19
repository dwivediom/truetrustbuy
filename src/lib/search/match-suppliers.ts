import { calculateTierPrice } from "@/lib/pricing";

export type PricingTier = {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
  leadTimeDays?: number;
};

export type TierMatchMeta = {
  effectiveQuantity: number;
  unitPrice: number;
  total: number;
  tier: PricingTier | null;
  /** Lead time in days from matched tier when configured. */
  leadTimeDays?: number;
  moq: number;
  belowMoq: boolean;
  missingPricingRule: boolean;
  /** Listing price from Product when no PricingRule exists (legacy). */
  fallbackListPrice?: number;
};

/**
 * Product.pricing.amount is listing/display only when a PricingRule exists;
 * tier + MOQ are the source of truth for B2B unit economics.
 */
export function computeTierMatch(
  intentQuantity: number | undefined,
  moq: number,
  tiers: PricingTier[],
): TierMatchMeta {
  const moqSafe = Math.max(1, moq);
  const requested = intentQuantity ?? moqSafe;
  const belowMoq = requested < moqSafe;
  const qtyForTier = belowMoq ? moqSafe : requested;
  const calc = calculateTierPrice(qtyForTier, tiers);
  const lt = calc.tier && typeof calc.tier.leadTimeDays === "number" ? calc.tier.leadTimeDays : undefined;
  return {
    effectiveQuantity: qtyForTier,
    unitPrice: calc.unitPrice,
    total: calc.total,
    tier: calc.tier,
    leadTimeDays: lt,
    moq: moqSafe,
    belowMoq,
    missingPricingRule: false,
  };
}

export function passesMaxUnitPrice(
  maxUnitPrice: number | undefined,
  unitPrice: number,
): boolean {
  if (maxUnitPrice == null || Number.isNaN(maxUnitPrice)) return true;
  return unitPrice <= maxUnitPrice;
}

export function validateTierRanges(tiers: PricingTier[]): { ok: true } | { ok: false; error: string } {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (t.minQty < 1) return { ok: false, error: "Each tier must have minQty >= 1" };
    if (t.maxQty != null && t.maxQty < t.minQty) {
      return { ok: false, error: "Tier maxQty must be >= minQty" };
    }
    if (i > 0) {
      const prev = sorted[i - 1];
      const prevMax = prev.maxQty;
      if (prevMax == null) {
        return { ok: false, error: "Only the last tier may have unlimited maxQty" };
      }
      if (t.minQty <= prevMax) {
        return { ok: false, error: "Tiers must not overlap; next minQty must be > previous maxQty" };
      }
      if (t.minQty > prevMax + 1) {
        /* gap allowed — buyer falls through to nearest tier by calculateTierPrice */
      }
    }
  }
  return { ok: true };
}
