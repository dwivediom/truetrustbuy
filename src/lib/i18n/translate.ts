import { generateGeminiText, hasGeminiApiKey } from "@/lib/gemini";
import { inferBuyerReplyLanguage, replyLanguageLabel } from "./reply-language";

export type TranslateOptions = {
  /**
   * Product/MOQ/pricing replies: keep numbers, currency codes, units, tier ranges,
   * and citation markers like [1, 2, 3] unchanged.
   */
  mode?: "plain" | "structured_product_reply";
};

export async function translateToLanguage(
  text: string,
  targetLang: string,
  options?: TranslateOptions,
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;
  const lang = targetLang.trim().toLowerCase();
  if (!lang || lang === "en" || lang === "english") return text;
  if (!hasGeminiApiKey()) return text;

  const structured =
    options?.mode === "structured_product_reply"
      ? `This is a B2B product assistant reply (pricing, MOQ, lead times).

Rules:
- Translate labels and prose into ${targetLang}.
- Keep unchanged: digits, currency codes (USD, INR, ₹, $), unit words when paired with numbers (pcs, units, MOQ), numeric ranges, and citation markers like [1, 2, 3] or [4, 5, 6].
- Do not add disclaimers about source language or missing translations.
- Output only the translated message.`
      : `Preserve meaning and B2B tone. Output only the translation, no quotes.`;

  const prompt = `Translate the following message to ${targetLang}.

${structured}

Text:
${trimmed}`;
  try {
    const out = await generateGeminiText(prompt);
    return out?.trim() || text;
  } catch {
    return text;
  }
}

/** Apply buyer language: `replyLanguageTag` wins (session), then question + preference. */
export async function localizeBuyerFacingReply(
  answer: string,
  question: string,
  buyerPreferredTag?: string | null,
  options?: { replyLanguageTag?: string | null },
): Promise<string> {
  const trimmed = answer.trim();
  if (!trimmed) return answer;
  const override = options?.replyLanguageTag?.trim().split(/[-_]/)[0]?.toLowerCase();
  const tag = override?.length
    ? override
    : inferBuyerReplyLanguage(question, { buyerPreferredTag });
  if (tag === "en" || !hasGeminiApiKey()) return answer;
  return translateToLanguage(trimmed, replyLanguageLabel(tag), {
    mode: "structured_product_reply",
  });
}
