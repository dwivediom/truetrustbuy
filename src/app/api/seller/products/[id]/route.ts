import { requireRole } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { PricingRuleModel } from "@/lib/models/PricingRule";
import { ProductModel } from "@/lib/models/Product";
import { patchProductSchema } from "@/lib/schemas/product";
import { createEmbedding } from "@/lib/search/embeddings";
import { Types } from "mongoose";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requireRole(["seller", "admin"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid product id" }, { status: 400 });
  }

  await connectDb();
  const product = await ProductModel.findById(id).lean<{
    metadata?: { sellerOrgId?: string };
  } | null>();
  if (!product) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const ownerId = product.metadata?.sellerOrgId ?? "";
  const sessionId = access.session.user.id;
  const isAdmin = access.role === "admin";
  if (!isAdmin && ownerId !== sessionId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await ProductModel.deleteOne({ _id: id });
  await PricingRuleModel.deleteMany({ productId: id });

  return new Response(null, { status: 204 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireRole(["seller", "admin"]);
  if (!access.ok) return access.response;
  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid product id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchProductSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  if (Object.keys(parsed.data).length === 0) {
    return Response.json({ error: "At least one field is required" }, { status: 400 });
  }

  await connectDb();
  const doc = await ProductModel.findById(id);
  if (!doc) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const ownerId = String(doc.metadata?.sellerOrgId ?? "");
  const sessionId = access.session.user.id;
  const isAdmin = access.role === "admin";
  if (!isAdmin && ownerId !== sessionId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const p = parsed.data;
  if (p.name !== undefined) doc.name = p.name;
  if (p.description !== undefined) doc.description = p.description;
  if (p.category !== undefined) doc.category = p.category;
  if (p.tags !== undefined) doc.tags = p.tags;
  if (p.useCases !== undefined) doc.useCases = p.useCases;
  if (p.customizationAvailable !== undefined) doc.customizationAvailable = p.customizationAvailable;
  if (p.images !== undefined) doc.images = p.images;
  if (p.pricing !== undefined) {
    doc.set("pricing", p.pricing);
  }
  if (p.metadata !== undefined) {
    doc.set("metadata", { ...doc.get("metadata"), ...p.metadata });
  }

  const reindex =
    p.name !== undefined ||
    p.description !== undefined ||
    p.category !== undefined ||
    p.tags !== undefined ||
    p.useCases !== undefined;
  if (reindex) {
    const text = `${doc.name} ${doc.description} ${doc.category} ${(doc.tags ?? []).join(" ")}`;
    doc.embedding = await createEmbedding(text);
  }

  await doc.save();
  return Response.json({ product: doc.toObject() });
}
