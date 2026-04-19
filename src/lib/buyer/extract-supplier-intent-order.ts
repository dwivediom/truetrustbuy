import { generateGeminiText, hasGeminiApiKey } from "@/lib/gemini";
import { z } from "zod";

const structuredSchema = z.object({
  finalOrderQuantity: z.union([z.number(), z.null()]).optional(),
  unitPrice: z.union([z.number(), z.null()]).optional(),
  currency: z.string().max(12).optional(),
  priceIsPerUnit: z.boolean().optional(),
  /** Short bullets the supplier can scan (MOQ hints, delivery, specs). */
  keyPoints: z.array(z.string()).max(12).optional(),
  confidence: z.enum(["high", "medium", "low"]).optional(),
});

export type StructuredSupplierIntentExtract = z.infer<typeof structuredSchema>;

function stripJsonFence(raw: string): string {
  let t = raw.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/u, "");
  }
  return t.trim();
}

/**
 * Uses Gemini to turn chat + summary into structured order signals for the seller CRM.
 * Returns null when no API key or parse fails (caller falls back to list price + search qty).
 */
export async function extractSupplierIntentOrderWithGemini(input: {
  intentType: "order_confirm" | "callback_request";
  productName: string;
  listUnitPrice?: number;
  listCurrency?: string;
  searchQuantity?: number;
  summary: string;
  chatExcerpt: string;
}): Promise<StructuredSupplierIntentExtract | null> {
  if (!hasGeminiApiKey()) return null;

  const system = `You extract structured B2B sourcing data from buyer chat and summaries.
Return ONLY a single JSON object (no markdown fences, no prose) with exactly these keys:
- finalOrderQuantity: number or null — best estimate of units/pieces the buyer wants to order now; null if unclear or intent is callback-only without quantity.
- unitPrice: number or null — agreed or implied unit price in the listing currency when stated; otherwise null (do not invent).
- currency: string — ISO-like code e.g. INR, USD (match listing when unsure).
- priceIsPerUnit: boolean — true if unitPrice is per piece/unit.
- keyPoints: string[] — up to 8 short facts (MOQ, delivery window, specs, urgency).
- confidence: "high" | "medium" | "low".

Rules: Never hallucinate prices not supported by text. Prefer explicit numbers in chat.`;

  const payload = `
Intent type: ${input.intentType}
Product: ${input.productName}
Listing reference unit price: ${input.listUnitPrice ?? "unknown"} ${input.listCurrency ?? ""}
Parsed search quantity hint: ${input.searchQuantity ?? "none"}

--- Summary ---
${input.summary.slice(0, 6000)}

--- Recent chat ---
${input.chatExcerpt.slice(0, 6000)}
`;

  try {
    const raw = await generateGeminiText(`${system}\n\n${payload}`, { thinkingBudget: 0 });
    if (!raw) return null;
    const parsed = JSON.parse(stripJsonFence(raw)) as unknown;
    const ok = structuredSchema.safeParse(parsed);
    if (!ok.success) return null;
    return ok.data;
  } catch {
    return null;
  }
}
