import { connectDb } from "@/lib/db";
import { browseCatalogProducts } from "@/lib/search/browse-catalog";

export async function GET(request: Request) {
  await connectDb();
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("limit");
  const limit = raw ? Number.parseInt(raw, 10) : 10;
  const safe = Number.isFinite(limit) ? limit : 10;
  const results = await browseCatalogProducts(safe);
  return Response.json({ results });
}
