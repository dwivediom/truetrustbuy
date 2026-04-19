import { env } from "process";

type Extractor = (text: string, options?: Record<string, unknown>) => Promise<unknown>;
let extractorPromise: Promise<Extractor | null> | null = null;

async function getExtractor() {
  if (extractorPromise) return extractorPromise;
  extractorPromise = (async () => {
    try {
      const mod = await import("@xenova/transformers");
      env.TRANSFORMERS_CACHE ??= ".cache/transformers";
      const pipe = await mod.pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
      return pipe as unknown as Extractor;
    } catch {
      return null;
    }
  })();
  return extractorPromise;
}

function fallbackEmbedding(text: string, dim = 64): number[] {
  const vector = new Array<number>(dim).fill(0);
  const chars = Array.from(text.toLowerCase());
  for (let i = 0; i < chars.length; i++) {
    const code = chars[i].charCodeAt(0);
    vector[i % dim] += (code % 31) / 31;
  }
  const norm = Math.hypot(...vector) || 1;
  return vector.map((v) => v / norm);
}

export async function createEmbedding(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  if (!extractor) return fallbackEmbedding(text);

  try {
    const output = (await extractor(text, { pooling: "mean", normalize: true })) as {
      data: Float32Array;
    };
    return Array.from(output.data);
  } catch {
    return fallbackEmbedding(text);
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const size = Math.min(a.length, b.length);
  if (size === 0) return 0;
  let dot = 0;
  let an = 0;
  let bn = 0;
  for (let i = 0; i < size; i++) {
    dot += a[i] * b[i];
    an += a[i] * a[i];
    bn += b[i] * b[i];
  }
  const denom = Math.sqrt(an) * Math.sqrt(bn);
  return denom ? dot / denom : 0;
}
