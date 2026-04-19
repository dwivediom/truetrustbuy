import { parseSearchIntent } from "@/lib/search/intent";

export async function POST(request: Request) {
  const body = (await request.json()) as { query?: string };
  const query = body.query?.trim() ?? "";
  if (!query) return Response.json({ error: "query is required" }, { status: 400 });
  const intent = await parseSearchIntent(query);
  return Response.json({ intent });
}

