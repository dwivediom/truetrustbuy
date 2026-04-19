import { requireRole } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { ProductModel } from "@/lib/models/Product";
import { SupplierBuyerIntentModel } from "@/lib/models/SupplierBuyerIntent";

export async function GET() {
  const access = await requireRole(["seller"]);
  if (!access.ok) return access.response;

  await connectDb();

  const rows = await SupplierBuyerIntentModel.find({ sellerUserId: access.session.user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean<
      Array<{
        _id: unknown;
        intentType: string;
        productId: unknown;
        replyLanguage: string;
        contactEmail?: string;
        contactPhone?: string;
        summary: string;
        status: string;
        createdAt?: Date;
      }>
    >();

  const productIds = [...new Set(rows.map((r) => String(r.productId)))];
  const products = await ProductModel.find({ _id: { $in: productIds } })
    .select("name")
    .lean<Array<{ _id: unknown; name: string }>>();
  const nameById = new Map(products.map((p) => [String(p._id), p.name]));

  const intents = rows.map((r) => ({
    id: String(r._id),
    intentType: r.intentType,
    productId: String(r.productId),
    productName: nameById.get(String(r.productId)) ?? "Product",
    replyLanguage: r.replyLanguage,
    contactEmail: r.contactEmail ?? "",
    contactPhone: r.contactPhone ?? "",
    summaryPreview: r.summary.slice(0, 280),
    summaryFull: r.summary,
    status: r.status,
    createdAt: r.createdAt?.toISOString(),
  }));

  return Response.json({ intents });
}
