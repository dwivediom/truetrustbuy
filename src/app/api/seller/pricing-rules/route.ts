import { requireRole } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { PricingRuleModel } from "@/lib/models/PricingRule";
import { validateTierRanges } from "@/lib/search/match-suppliers";
import { z } from "zod";

const ruleSchema = z.object({
  productId: z.string().min(1),
  currency: z.string().default("INR"),
  moq: z.number().int().min(1).default(1),
  tiers: z
    .array(
      z.object({
        minQty: z.number().int().min(1),
        maxQty: z.number().int().nullable().optional(),
        unitPrice: z.number().positive(),
        leadTimeDays: z.number().int().min(1).max(730).optional(),
      }),
    )
    .min(1),
});

export async function GET() {
  const access = await requireRole(["seller", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const rules = await PricingRuleModel.find({ sellerUserId: access.session.user.id }).lean();
  return Response.json({ rules });
}

export async function POST(request: Request) {
  const access = await requireRole(["seller", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const body = await request.json();
  const parsed = ruleSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const tiersNorm = parsed.data.tiers.map((t) => ({
    minQty: t.minQty,
    maxQty: t.maxQty ?? null,
    unitPrice: t.unitPrice,
    ...(typeof t.leadTimeDays === "number" ? { leadTimeDays: t.leadTimeDays } : {}),
  }));
  const tierCheck = validateTierRanges(tiersNorm);
  if (!tierCheck.ok) {
    return Response.json({ error: tierCheck.error }, { status: 400 });
  }
  const sellerUserId = access.session.user.id;
  const rule = await PricingRuleModel.findOneAndUpdate(
    { sellerUserId, productId: parsed.data.productId },
    {
      $set: {
        ...parsed.data,
        tiers: tiersNorm,
        sellerUserId,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
  return Response.json({ rule }, { status: 201 });
}

