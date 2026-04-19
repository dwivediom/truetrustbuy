import { GoogleGenAI } from "@google/genai";

export function getGeminiApiKey(): string | undefined {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  );
}

export function hasGeminiApiKey(): boolean {
  return Boolean(getGeminiApiKey());
}

/** Default aligned with Google AI Studio; override with `GEMINI_MODEL`. */
export const DEFAULT_GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash-lite";

export function createGoogleGenAI(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export type GenerateGeminiOptions = {
  model?: string;
  /** 0 disables extended thinking (matches common Studio samples). */
  thinkingBudget?: number;
  /**
   * Grounding with Google Search. Off by default so seller/buyer bots stay anchored
   * on your knowledge base + pricing JSON. Set env `GEMINI_GOOGLE_SEARCH=true` to enable.
   */
  googleSearch?: boolean;
};

/**
 * Single-call text generation via `@google/genai` (current Google Generative Language API).
 */
export async function generateGeminiText(
  prompt: string,
  options?: GenerateGeminiOptions,
): Promise<string | null> {
  const ai = createGoogleGenAI();
  if (!ai) return null;

  const model = options?.model ?? DEFAULT_GEMINI_MODEL;
  const thinkingBudget = options?.thinkingBudget ?? 0;
  const useSearch =
    Boolean(options?.googleSearch) ||
    process.env.GEMINI_GOOGLE_SEARCH?.trim().toLowerCase() === "true";

  const config = {
    thinkingConfig: { thinkingBudget },
    ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}),
  };

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config,
  });

  const text = response.text?.trim();
  return text || null;
}
