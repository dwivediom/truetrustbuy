import { hybridSearch } from "@/lib/search/hybrid-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return Response.json({ error: "Missing q parameter." }, { status: 400 });
  }
  const output = await hybridSearch(q);
  return Response.json(output);
}
