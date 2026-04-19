import { ASSISTANT_NAME } from "@/lib/brand/assistant";
import type { RetrievedChunk } from "@/lib/knowledge/retrieve";

function formatExcerpts(chunks: RetrievedChunk[], maxLen = 520): string {
  return chunks
    .map((c, i) => {
      const body = c.text.length > maxLen ? `${c.text.slice(0, maxLen)}…` : c.text;
      return `[${i + 1}] (${c.sourceFilename})\n${body}`;
    })
    .join("\n\n---\n\n");
}

function formatPricingHint(base: Record<string, unknown>): string {
  const unit = base.unitPrice;
  const cur = base.currency;
  const qty = base.quantity;
  if (typeof unit === "number" && typeof cur === "string") {
    return `Catalog pricing reference for this SKU: ${unit} ${cur} per unit (quantity context: ${typeof qty === "number" ? qty : 1}).`;
  }
  return "";
}

function extractMoqFromText(text: string): string | null {
  const patterns = [
    /(?:MOQ|M\.?O\.?Q\.?)\s*[:\s]*(?:Rs\.?|₹|INR)?\s*([\d][\d,\s]*)/i,
    /minimum\s*(?:order\s*)?(?:quantity)?\s*[:\s]*([\d][\d,\s]*)/i,
    /(?:min\.?\s*)?(?:order\s*)?(?:qty|quantity)\s*[:\s]*([\d][\d,\s]*)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const n = m[1].replace(/[\s,]/g, "");
      if (/^\d+$/.test(n)) return n;
    }
  }
  return null;
}

/**
 * When Gemini is unavailable, still produce useful answers grounded in retrieved chunks
 * (and pricing metadata), not generic listing-price boilerplate alone.
 */
export function buildBotReplyWithoutGemini(
  question: string,
  chunks: RetrievedChunk[],
  sellerName: string,
  baseAnswer: Record<string, unknown>,
  listingFallback: string,
): string {
  const trimmed = question.trim();
  const qLower = trimmed.toLowerCase();
  const isGreeting =
    /^(hi|hey|hello|namaste|good\s+(morning|afternoon|evening))\b/i.test(trimmed) ||
    qLower === "hey" ||
    qLower === "hi";

  if (chunks.length === 0) {
    return listingFallback;
  }

  const combined = chunks.map((c) => c.text).join("\n\n");
  const asksMoq = /\b(moq|minimum\s*order|min\.?\s*qty|minimum\s*quantity)\b/i.test(question);
  const moqFromDocs = asksMoq ? extractMoqFromText(combined) : null;

  const intro = `Hi — I'm ${ASSISTANT_NAME}, sourcing support for ${sellerName}.`;

  if (asksMoq && moqFromDocs) {
    return `${intro} From your uploaded documents, minimum order quantity appears to be ${moqFromDocs} units (parsed from knowledge-base text; verify on your PDF).\n\n${formatExcerpts(chunks.slice(0, 2))}\n\n${formatPricingHint(baseAnswer)}`;
  }

  if (asksMoq && !moqFromDocs) {
    return `${intro} I searched your uploaded files for MOQ but couldn't reliably extract one number. Here are the closest excerpts — look for MOQ / minimum order in the text:\n\n${formatExcerpts(chunks.slice(0, 3))}\n\n${formatPricingHint(baseAnswer)}`;
  }

  if (isGreeting) {
    return `${intro} Ask about MOQ, pricing, materials, certifications, or lead times — I'll pull answers from your uploaded brochures and catalog pricing.\n\nQuick context from your docs:\n${formatExcerpts(chunks.slice(0, 1), 380)}\n\n${formatPricingHint(baseAnswer)}`;
  }

  return `${intro} Here are the most relevant passages from your knowledge base:\n\n${formatExcerpts(chunks.slice(0, 3))}\n\n${formatPricingHint(baseAnswer)}`;
}
