import { requireRole } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { ProductModel } from "@/lib/models/Product";
import { productSchema } from "@/lib/schemas/product";
import { createEmbedding } from "@/lib/search/embeddings";

export async function GET() {
  const access = await requireRole(["seller", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const sellerOrgId = access.session.user.id;
  const products = await ProductModel.find({
    "metadata.sellerOrgId": sellerOrgId,
  })
    .sort({ createdAt: -1 })
    .lean();
  return Response.json({ products });
}

export async function POST(request: Request) {
  const access = await requireRole(["seller", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const body = await request.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const text = `${parsed.data.name} ${parsed.data.description} ${parsed.data.category} ${parsed.data.tags.join(" ")}`;
  const embedding = await createEmbedding(text);
  const product = await ProductModel.create({
    ...parsed.data,
    embedding,
    metadata: { ...parsed.data.metadata, sellerOrgId: access.session.user.id },
  });
  return Response.json({ product }, { status: 201 });
}

