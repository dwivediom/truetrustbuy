import { requireRole } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { canSellerAccessRfq } from "@/lib/seller/leads";
import { SellerLeadDispositionModel } from "@/lib/models/SellerLeadDisposition";
import mongoose from "mongoose";
import { z } from "zod";

const patchSchema = z.object({
  pipelineStage: z
    .enum(["new", "contacted", "qualified", "quoted", "converted", "lost", "other"])
    .optional(),
  assignee: z.string().max(200).optional(),
  sellerNotes: z.string().max(8000).optional(),
});

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ rfqId: string }> },
) {
  const access = await requireRole(["seller"]);
  if (!access.ok) return access.response;

  const { rfqId } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(rfqId)) {
    return Response.json({ error: "Invalid RFQ id" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  if (Object.keys(parsed.data).length === 0) {
    return Response.json({ error: "No fields to update" }, { status: 400 });
  }

  const sellerUserId = access.session.user.id;
  const allowed = await canSellerAccessRfq(sellerUserId, rfqId);
  if (!allowed) return Response.json({ error: "Forbidden" }, { status: 403 });

  await connectDb();

  const rfqObjectId = new mongoose.Types.ObjectId(rfqId);
  const $set: Record<string, unknown> = { lastUpdatedBy: sellerUserId };
  if (parsed.data.pipelineStage !== undefined) $set.pipelineStage = parsed.data.pipelineStage;
  if (parsed.data.assignee !== undefined) $set.assignee = parsed.data.assignee;
  if (parsed.data.sellerNotes !== undefined) $set.sellerNotes = parsed.data.sellerNotes;

  await SellerLeadDispositionModel.findOneAndUpdate(
    { sellerUserId, rfqId: rfqObjectId },
    { $set },
    { upsert: true, new: true },
  );

  return Response.json({ ok: true });
}
