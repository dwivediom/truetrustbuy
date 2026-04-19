import { requireRole } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { SupplierBuyerIntentModel } from "@/lib/models/SupplierBuyerIntent";
import mongoose from "mongoose";
import { z } from "zod";

const patchSchema = z.object({
  orderQuantity: z.union([z.number().int().min(1).max(1e9), z.null()]).optional(),
  unitPrice: z.union([z.number().nonnegative().max(1e14), z.null()]).optional(),
  priceCurrency: z.string().max(12).optional(),
  connectionStatus: z.enum(["not_connected", "connected", "in_negotiation"]).optional(),
  contactOwner: z.string().max(200).optional(),
  sellerNotes: z.string().max(8000).optional(),
  status: z.enum(["new", "seen"]).optional(),
});

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const access = await requireRole(["seller"]);
  if (!access.ok) return access.response;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  await connectDb();

  const doc = await SupplierBuyerIntentModel.findOne({
    _id: id,
    sellerUserId: access.session.user.id,
  }).lean<{ _id: unknown } | null>();

  if (!doc) return Response.json({ error: "Not found" }, { status: 404 });

  const $set: Record<string, unknown> = {};

  const d = parsed.data;
  if (d.orderQuantity !== undefined) {
    $set.orderQuantity = d.orderQuantity === null ? null : d.orderQuantity;
  }
  if (d.unitPrice !== undefined) {
    $set.unitPrice = d.unitPrice === null ? null : d.unitPrice;
  }
  if (d.priceCurrency !== undefined) $set.priceCurrency = d.priceCurrency.trim().slice(0, 12);
  if (d.connectionStatus !== undefined) $set.connectionStatus = d.connectionStatus;
  if (d.contactOwner !== undefined) $set.contactOwner = d.contactOwner.trim().slice(0, 200);
  if (d.sellerNotes !== undefined) $set.sellerNotes = d.sellerNotes.trim().slice(0, 8000);
  if (d.status !== undefined) $set.status = d.status;

  if (Object.keys($set).length === 0) {
    return Response.json({ ok: true });
  }

  await SupplierBuyerIntentModel.updateOne({ _id: id }, { $set });

  return Response.json({ ok: true });
}
