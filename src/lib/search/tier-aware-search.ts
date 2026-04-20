import { connectDb } from "@/lib/db";
import { OrganizationModel } from "@/lib/models/Organization";
import { PricingRuleModel } from "@/lib/models/PricingRule";
import { ProductModel } from "@/lib/models/Product";
import { SearchLogModel } from "@/lib/models/SearchLog";
import type { SearchIntent } from "@/lib/search/intent";
import {
  computeTierMatch,
  passesMaxUnitPrice,
  type TierMatchMeta,
} from "@/lib/search/match-suppliers";
import { attachSellerSnapshots } from "@/lib/search/seller-snapshot-attach";
import type { SearchProductLean, SearchResultItem, TierBand } from "@/lib/search/search-result-types";

export type RunTierAwareSearchOptions = {
  /** Skip SearchLog insert (e.g. SSR JSON-LD path to avoid duplicate log rows per bot hit). */
  skipSearchLog?: boolean;
};

export async function runTierAwareSearch(
  query: string,
  intent: SearchIntent,
  opts?: RunTierAwareSearchOptions,
): Promise<{ intent: SearchIntent; results: SearchResultItem[] }> {
  await connectDb();

  const filter: Record<string, unknown> = {};

  const term = intent.productType?.trim() || query;
  if (term) {
    const or: Record<string, RegExp>[] = [
      { name: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
      { description: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
      { category: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
    ];
    if (intent.category?.trim()) {
      or.push({
        category: new RegExp(intent.category.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      });
    }
    filter.$or = or;
  }

  let orgIds: string[] | undefined;
  if (intent.verifiedOnly || intent.location) {
    const orgFilter: Record<string, unknown> = {};
    if (intent.verifiedOnly) orgFilter.isVerified = true;
    if (intent.location) orgFilter.city = new RegExp(intent.location, "i");
    const orgs = await OrganizationModel.find(orgFilter).select("_id").lean<Array<{ _id: string }>>();
    orgIds = orgs.map((o) => String(o._id));
  }
  if (orgIds) filter["metadata.sellerOrgId"] = { $in: orgIds };

  const candidates = (await ProductModel.find(filter).limit(200).lean()) as unknown as SearchProductLean[];

  const productIds = candidates.map((p) => String(p._id));
  const rules = await PricingRuleModel.find({ productId: { $in: productIds } }).lean();
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
  const ruleByProduct = new Map<string, RuleLean>();
  for (const r of rules) {
    const row = r as unknown as RuleLean;
    ruleByProduct.set(String(row.productId), row);
  }

  const enriched: SearchResultItem[] = [];

  for (const p of candidates) {
    const id = String(p._id);
    const rule = ruleByProduct.get(id);
    let tierMatch: TierMatchMeta | null = null;
    const missingPricingRule = !rule;

    if (rule?.tiers?.length) {
      const moq = rule.moq ?? 1;
      tierMatch = {
        ...computeTierMatch(intent.quantity, moq, rule.tiers),
        missingPricingRule: false,
      };
      const okPrice = passesMaxUnitPrice(intent.maxUnitPrice, tierMatch.unitPrice);
      if (!okPrice) continue;
    } else {
      if (intent.maxUnitPrice != null && p.pricing.amount > intent.maxUnitPrice) {
        continue;
      }
      tierMatch = {
        effectiveQuantity: intent.quantity ?? 1,
        unitPrice: p.pricing.amount,
        total: p.pricing.amount * (intent.quantity ?? 1),
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

  const top = enriched.slice(0, 50);
  const withSellers = await attachSellerSnapshots(top);

  if (!opts?.skipSearchLog) {
    await SearchLogModel.create({
      query,
      parsedIntent: intent,
      resultCount: enriched.length,
    });
  }

  return { intent, results: withSellers };
}
