import { requireRole } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { SellerAgentRuleModel } from "@/lib/models/SellerAgentRule";
import { z } from "zod";

const createSchema = z.object({
  productId: z.string().nullable().optional(),
  label: z.string().max(120).optional().default(""),
  statement: z.string().min(1).max(4000),
  priority: z.number().int().default(0),
  enabled: z.boolean().optional().default(true),
});

export async function GET() {
  const access = await requireRole(["seller", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const rules = await SellerAgentRuleModel.find({ sellerUserId: access.session.user.id })
    .sort({ priority: -1, updatedAt: -1 })
    .limit(200)
    .lean();
  return Response.json({ rules });
}

export async function POST(request: Request) {
  const access = await requireRole(["seller", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const productId = parsed.data.productId?.trim() ? parsed.data.productId.trim() : null;
  const rule = await SellerAgentRuleModel.create({
    sellerUserId: access.session.user.id,
    productId,
    label: parsed.data.label ?? "",
    statement: parsed.data.statement,
    priority: parsed.data.priority,
    enabled: parsed.data.enabled ?? true,
  });
  return Response.json({ rule }, { status: 201 });
}
