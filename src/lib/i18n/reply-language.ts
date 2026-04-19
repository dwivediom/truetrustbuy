/**
 * Infer which language the assistant reply should use (BCP-47 primary subtag).
 * Uses explicit phrases, script detection, then optional buyer account preference.
 */
const TAG_LABEL: Record<string, string> = {
  hi: "Hindi",
  gu: "Gujarati",
  mr: "Marathi",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  ml: "Malayalam",
  bn: "Bengali",
  pa: "Punjabi",
  ur: "Urdu",
};

const EXPLICIT: Array<{ re: RegExp; tag: keyof typeof TAG_LABEL }> = [
  { re: /\b(in\s+hindi|hindi\s+me|speak\s+hindi|tell\s+me\s+in\s+hindi)\b/i, tag: "hi" },
  { re: /\bहिंदी\b|\bहिन्दी\b|हिंदी\s*में|\bहिंदी में\b/i, tag: "hi" },
  { re: /\b(in\s+gujarati|gujarati\s+ma)\b/i, tag: "gu" },
  { re: /\bગુજરાતી\b/i, tag: "gu" },
  { re: /\b(in\s+marathi)\b/i, tag: "mr" },
  { re: /\bमराठी\b/i, tag: "mr" },
  { re: /\b(in\s+tamil)\b/i, tag: "ta" },
  { re: /\bதமிழ்\b/i, tag: "ta" },
  { re: /\b(in\s+telugu)\b/i, tag: "te" },
  { re: /\b(in\s+kannada)\b/i, tag: "kn" },
  { re: /\b(in\s+malayalam)\b/i, tag: "ml" },
  { re: /\b(in\s+bengali|bangla)\b/i, tag: "bn" },
  { re: /\b(in\s+punjabi)\b/i, tag: "pa" },
  { re: /\b(in\s+urdu)\b/i, tag: "ur" },
];

function normalizePreferredTag(raw?: string | null): string | undefined {
  if (!raw?.trim()) return undefined;
  const primary = raw.trim().split(/[-_]/)[0]?.toLowerCase();
  if (!primary || primary === "en") return undefined;
  return primary;
}

export function replyLanguageLabel(tag: string): string {
  return TAG_LABEL[tag] ?? tag;
}

/**
 * Returns BCP-47 primary tag (e.g. `hi`) or `"en"` if response should stay English.
 */
/**
 * If the message clearly asks to switch reply language (e.g. “reply in Hindi”), return that tag.
 * Otherwise null — caller keeps current session language.
 */
export function inferLanguageSwitchIntent(question: string): string | null {
  const q = question.trim();
  if (!q) return null;
  for (const { re, tag } of EXPLICIT) {
    if (re.test(q)) return tag;
  }
  try {
    if (/\p{Script=Devanagari}/u.test(q)) return "hi";
  } catch {
    /* noop */
  }
  if (/\b(reply|respond|answer|speak)\s+(in\s+)?english\b/i.test(q)) return "en";
  return null;
}

export function inferBuyerReplyLanguage(
  question: string,
  options?: { buyerPreferredTag?: string | null },
): string {
  const q = question.trim();
  if (!q) return normalizePreferredTag(options?.buyerPreferredTag) ?? "en";

  for (const { re, tag } of EXPLICIT) {
    if (re.test(q)) return tag;
  }

  // Buyer wrote mostly in Devanagari → Hindi (covers queries without "hindi" keyword).
  try {
    if (/\p{Script=Devanagari}/u.test(q)) return "hi";
  } catch {
    /* older runtimes without Unicode properties */
  }

  const fromAccount = normalizePreferredTag(options?.buyerPreferredTag);
  if (fromAccount) return fromAccount;

  return "en";
}
