import { z } from "zod";
import { generateGeminiText, hasGeminiApiKey } from "@/lib/gemini";
import { parseContextQuery } from "@/lib/search/query-parser";

export const searchIntentSchema = z.object({
  productType: z.string(),
  category: z.string().optional(),
  maxUnitPrice: z.number().optional(),
  /** Alias for maxUnitPrice (PRD / API). */
  unit_price_max: z.number().optional(),
  currency: z.enum(["INR", "USD"]).optional(),
  quantity: z.number().optional(),
  location: z.string().optional(),
  verifiedOnly: z.boolean().optional(),
  delivery_by: z.string().nullable().optional(),
  searchIntent: z.enum(["discovery", "rfq"]).optional(),
  intent: z.enum(["discovery", "rfq"]).optional(),
  customizations: z.array(z.string()).optional(),
  raw: z.string(),
});

export type SearchIntent = z.infer<typeof searchIntentSchema>;

function normalizeIntent(raw: unknown, query: string): SearchIntent {
  const base =
    typeof raw === "object" && raw !== null ? { ...(raw as Record<string, unknown>) } : {};
  const productType =
    typeof base.productType === "string" && base.productType.trim()
      ? base.productType
      : query;
  const parsed = searchIntentSchema.safeParse({ ...base, productType, raw: query });
  if (!parsed.success) {
    return {
      productType: query,
      raw: query,
      searchIntent: "discovery",
    };
  }
  const d = parsed.data;
  const maxFromAlias = d.unit_price_max ?? d.maxUnitPrice;
  return {
    ...d,
    maxUnitPrice: maxFromAlias,
    searchIntent: d.searchIntent ?? d.intent ?? "discovery",
    delivery_by: d.delivery_by ?? undefined,
  };
}

export async function parseSearchIntent(query: string): Promise<SearchIntent> {
  const fallback = parseContextQuery(query);
  if (!hasGeminiApiKey()) {
    return normalizeIntent(
      {
        productType: fallback.categoryTerms.join(" ") || query,
        maxUnitPrice: fallback.maxPrice,
        currency: /\brupee|inr|₹/i.test(query) ? "INR" : /\$|usd/i.test(query) ? "USD" : undefined,
        quantity:
          Number(query.match(/(\d+)\s*(piece|pcs|units|qty|bottles?|crates?)/i)?.[1] ?? 0) ||
          undefined,
        location: query.match(/\b(?:in|to|near)\s+([a-zA-Z][a-zA-Z\s]+)$/i)?.[1]?.trim(),
        verifiedOnly: /gst\s*verified|verified/i.test(query),
        customizations: [],
      },
      query,
    );
  }

  const prompt = `Extract structured B2B procurement intent as strict JSON only (no markdown):
Keys: productType (string), category (optional slug string, snake_case if possible),
maxUnitPrice (number|null), unit_price_max (number|null, same as max if buyer says "under X per unit"),
currency ("INR"|"USD"|null), quantity (number|null), location (string|null),
verifiedOnly (boolean), delivery_by (ISO date string|null if buyer mentions deadline),
searchIntent ("discovery"|"rfq"), customizations (string array, e.g. colors).
Query: ${query}
Return only JSON.`;
  try {
    const textRaw = await generateGeminiText(prompt);
    if (!textRaw) throw new Error("empty_gemini_response");
    const text = textRaw.trim();
    const normalized = text.replace(/^```json|```$/g, "").trim();
    const json = JSON.parse(normalized) as Record<string, unknown>;
    return normalizeIntent(json, query);
  } catch {
    return normalizeIntent(
      {
        productType: fallback.categoryTerms.join(" ") || query,
        maxUnitPrice: fallback.maxPrice,
        currency: /\brupee|inr|₹/i.test(query) ? "INR" : /\$|usd/i.test(query) ? "USD" : undefined,
        quantity:
          Number(query.match(/(\d+)\s*(piece|pcs|units|qty|bottles?|crates?)/i)?.[1] ?? 0) ||
          undefined,
        location: query.match(/\b(?:in|to|near)\s+([a-zA-Z][a-zA-Z\s]+)$/i)?.[1]?.trim(),
        verifiedOnly: /gst\s*verified|verified/i.test(query),
      },
      query,
    );
  }
}
