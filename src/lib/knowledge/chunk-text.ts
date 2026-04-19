const DEFAULT_CHUNK = 900;
const OVERLAP = 120;

export function chunkText(text: string, maxLen = DEFAULT_CHUNK): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + maxLen, cleaned.length);
    chunks.push(cleaned.slice(start, end).trim());
    if (end === cleaned.length) break;
    start = Math.max(end - OVERLAP, start + 1);
  }
  return chunks.filter(Boolean);
}
