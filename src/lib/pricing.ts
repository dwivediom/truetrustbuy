export type Tier = {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
  /** Optional lead time in days for this quantity band (seller PRD). */
  leadTimeDays?: number;
};

export function calculateTierPrice(quantity: number, tiers: Tier[]) {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  const match =
    sorted.find((tier) => quantity >= tier.minQty && (tier.maxQty == null || quantity <= tier.maxQty)) ??
    sorted[sorted.length - 1];

  if (!match) {
    return { unitPrice: 0, total: 0, tier: null as Tier | null };
  }

  const unitPrice = match.unitPrice;
  return {
    unitPrice,
    total: Number((unitPrice * quantity).toFixed(2)),
    tier: match,
  };
}

