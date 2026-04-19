import { PricingRuleModel } from "@/lib/models/PricingRule";
import { ProductModel } from "@/lib/models/Product";
import {
  computeTierMatch,
  type TierMatchMeta,
} from "@/lib/search/match-suppliers";
import { attachSellerSnapshots } from "@/lib/search/seller-snapshot-attach";
import type { SearchProductLean, SearchResultItem, TierBand } from "@/lib/search/search-result-types";

type RuleLean = {
  productId: string;
  moq?: number;
  currency: string;
  tiers: Array<{
    minQty: number;
    maxQty: number | null;
    unitPrice: number;
    leadTimeDays?: number;
  }>;
};

/**
 * Recent catalog listings with tier/MOQ + seller snapshots (same card shape as search results).
 * Does not apply query filters or search logging.
 */
export async function browseCatalogProducts(limit: number): Promise<SearchResultItem[]> {
  const cap = Math.min(Math.max(1, limit), 50);
  const products = (await ProductModel.find({})
    .sort({ updatedAt: -1 })
    .limit(cap)
    .lean()) as unknown as SearchProductLean[];

  if (products.length === 0) return [];

  const productIds = products.map((p) => String(p._id));
  const rules = await PricingRuleModel.find({ productId: { $in: productIds } }).lean();
  const ruleByProduct = new Map<string, RuleLean>();
  for (const r of rules) {
    const row = r as unknown as RuleLean;
    ruleByProduct.set(String(row.productId), row);
  }

  const enriched: SearchResultItem[] = [];

  for (const p of products) {
    const id = String(p._id);
    const rule = ruleByProduct.get(id);
    let tierMatch: TierMatchMeta | null = null;
    const missingPricingRule = !rule;

    if (rule?.tiers?.length) {
      const moq = rule.moq ?? 1;
      tierMatch = {
        ...computeTierMatch(undefined, moq, rule.tiers),
        missingPricingRule: false,
      };
    } else {
      tierMatch = {
        effectiveQuantity: 1,
        unitPrice: p.pricing.amount,
        total: p.pricing.amount,
        tier: null,
        moq: 1,
        belowMoq: false,
        missingPricingRule: true,
        fallbackListPrice: p.pricing.amount,
      };
    }

    const tierBands: TierBand[] =
      rule?.tiers?.slice(0, 3).map((t) => ({
        minQty: t.minQty,
        maxQty: t.maxQty ?? null,
        unitPrice: t.unitPrice,
      })) ?? [];

    enriched.push({
      ...p,
      tierMatch,
      missingPricingRule,
      tierBands,
      displayMoq: rule?.moq ?? tierMatch?.moq ?? 1,
      pricingCurrency: rule?.currency ?? p.pricing.currency,
      seller: null,
    });
  }

  return attachSellerSnapshots(enriched);
}
