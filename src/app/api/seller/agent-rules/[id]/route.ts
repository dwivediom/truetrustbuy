import { requireRole } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { SellerAgentRuleModel } from "@/lib/models/SellerAgentRule";
import { z } from "zod";

const patchSchema = z.object({
  label: z.string().max(120).optional(),
  statement: z.string().min(1).max(4000).optional(),
  priority: z.number().int().optional(),
  enabled: z.boolean().optional(),
  productId: z.string().nullable().optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireRole(["seller", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const update: Record<string, unknown> = { ...parsed.data };
  if ("productId" in parsed.data) {
    const pid = parsed.data.productId;
    update.productId = pid?.trim() ? pid.trim() : null;
  }
  const res = await SellerAgentRuleModel.findOneAndUpdate(
    { _id: id, sellerUserId: access.session.user.id },
    { $set: update },
    { new: true },
  );
  if (!res) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ rule: res });
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireRole(["seller", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const { id } = await ctx.params;
  const res = await SellerAgentRuleModel.deleteOne({ _id: id, sellerUserId: access.session.user.id });
  if (res.deletedCount === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
