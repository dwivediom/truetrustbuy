import { connectDb } from "@/lib/db";
import { parseSearchIntent, type SearchIntent } from "@/lib/search/intent";
import {
  applyIntentQueryOverrides,
  mergeIntentBodyOverrides,
} from "@/lib/search/intent-overrides";
import { runTierAwareSearch } from "@/lib/search/tier-aware-search";

export type {
  SearchResultItem,
  SearchSellerSnapshot,
  TierBand,
} from "@/lib/search/search-result-types";

export async function GET(request: Request) {
  await connectDb();
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  if (!query) return Response.json({ error: "q is required" }, { status: 400 });

  let intent = await parseSearchIntent(query);
  intent = applyIntentQueryOverrides(intent, searchParams);

  const out = await runTierAwareSearch(query, intent);
  return Response.json(out);
}

export async function POST(request: Request) {
  await connectDb();
  const body = (await request.json()) as {
    q?: string;
    overrides?: Record<string, unknown>;
  };
  const query = body.q?.trim() ?? "";
  if (!query) return Response.json({ error: "q is required" }, { status: 400 });

  let intent = await parseSearchIntent(query);
  intent = mergeIntentBodyOverrides(intent, body.overrides as never);
  const out = await runTierAwareSearch(query, intent);
  return Response.json(out);
}
