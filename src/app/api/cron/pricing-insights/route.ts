import { connectDb } from "@/lib/db";
import { PricingInsightAlertModel } from "@/lib/models/PricingInsightAlert";
import { PricingRuleModel } from "@/lib/models/PricingRule";
import { ProductModel } from "@/lib/models/Product";
import { SearchLogModel } from "@/lib/models/SearchLog";
import { calculateTierPrice } from "@/lib/pricing";
import type { SearchIntent } from "@/lib/search/intent";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const { searchParams } = new URL(request.url);
  if (!secret || searchParams.get("secret") !== secret) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const since = new Date(Date.now() - 7 * 86400000);
  const logs = await SearchLogModel.find({ createdAt: { $gte: since } }).limit(1500).lean();
  const rules = await PricingRuleModel.find({}).lean<
    Array<{
      sellerUserId: string;
      productId: string;
      moq?: number;
      currency?: string;
      tiers: Array<{ minQty: number; maxQty: number | null; unitPrice: number }>;
    }>
  >();
  const products = await ProductModel.find({}).select("name category").lean<
    Array<{ _id: unknown; name: string; category: string }>
  >();
  const productById = new Map(products.map((p) => [String(p._id), p]));

  let created = 0;
  for (const log of logs) {
    const intent = log.parsedIntent as Partial<SearchIntent> | null;
    if (!intent || typeof intent.maxUnitPrice !== "number") continue;
    const qty =
      typeof intent.quantity === "number" && intent.quantity > 0 ? intent.quantity : 1000;
    const hint = String(intent.productType || intent.category || log.query || "").toLowerCase();
    const tokens = hint.split(/\s+/).filter((t) => t.length > 2);

    for (const rule of rules) {
      const prod = productById.get(String(rule.productId));
      if (!prod) continue;
      const hay = `${prod.name} ${prod.category}`.toLowerCase();
      const match = tokens.some((t) => hay.includes(t));
      if (!match) continue;
      const moq = rule.moq ?? 1;
      const calc = calculateTierPrice(Math.max(qty, moq), rule.tiers);
      if (calc.unitPrice <= intent.maxUnitPrice) continue;

      const cur = rule.currency ?? "INR";
      const message = `Market signal: buyers searched near ${cur} ${intent.maxUnitPrice}/unit (qty ~${qty}) for "${intent.productType || hint}". Your ${calc.unitPrice} ${cur}/unit at that volume on "${prod.name}" is above that ceiling. Consider RFQs or a time-bound discount.`;

      const recent = await PricingInsightAlertModel.findOne({
        sellerUserId: rule.sellerUserId,
        productId: rule.productId,
        createdAt: { $gte: new Date(Date.now() - 24 * 3600000) },
      });
      if (recent) continue;

      await PricingInsightAlertModel.create({
        sellerUserId: rule.sellerUserId,
        productId: rule.productId,
        message,
        typicalSearchMaxPrice: intent.maxUnitPrice,
        yourTierUnitPrice: calc.unitPrice,
      });
      created += 1;
    }
  }

  return Response.json({ ok: true, alertsCreated: created });
}
