import { connectDb } from "@/lib/db";
import { ProductModel } from "@/lib/models/Product";
import { productSchema } from "@/lib/schemas/product";
import { createEmbedding } from "@/lib/search/embeddings";
import { requireAdmin } from "@/lib/authz";

export async function GET() {
  await connectDb();
  const products = await ProductModel.find().sort({ createdAt: -1 }).limit(100).lean();
  return Response.json({ products });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const body = await request.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectDb();
  const text = `${parsed.data.name} ${parsed.data.description} ${parsed.data.category} ${parsed.data.tags.join(" ")} ${parsed.data.useCases.join(" ")}`;
  const embedding = await createEmbedding(text);
  const created = await ProductModel.create({ ...parsed.data, embedding });
  return Response.json({ product: created }, { status: 201 });
}
