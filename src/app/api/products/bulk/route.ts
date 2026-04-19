import { requireAdmin } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { ImportJobModel } from "@/lib/models/ImportJob";
import { ProductModel } from "@/lib/models/Product";
import { productSchema } from "@/lib/schemas/product";
import { createEmbedding } from "@/lib/search/embeddings";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const body = await request.json();
  const items = Array.isArray(body) ? body : body.items;
  if (!Array.isArray(items)) {
    return Response.json({ error: "Expected an array of products." }, { status: 400 });
  }

  await connectDb();
  let succeeded = 0;
  let failed = 0;
  const errors: Array<{ row: number; reason: string }> = [];

  for (let idx = 0; idx < items.length; idx++) {
    const parsed = productSchema.safeParse(items[idx]);
    if (!parsed.success) {
      failed++;
      errors.push({ row: idx + 1, reason: parsed.error.issues.map((i) => i.message).join("; ") });
      continue;
    }
    try {
      const text = `${parsed.data.name} ${parsed.data.description} ${parsed.data.category} ${parsed.data.tags.join(" ")} ${parsed.data.useCases.join(" ")}`;
      const embedding = await createEmbedding(text);
      await ProductModel.create({ ...parsed.data, embedding });
      succeeded++;
    } catch (error) {
      failed++;
      errors.push({ row: idx + 1, reason: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  const job = await ImportJobModel.create({
    createdBy: admin.session.user.id,
    total: items.length,
    succeeded,
    failed,
    errorRows: errors,
  });

  return Response.json({ importJob: job, succeeded, failed, errors });
}
