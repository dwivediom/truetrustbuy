import { connectDb } from "@/lib/db";
import { SellerKnowledgeChunkModel } from "@/lib/models/SellerKnowledgeChunk";
import { cosineSimilarity, createEmbedding } from "@/lib/search/embeddings";

export type RetrievedChunk = {
  text: string;
  sourceFilename: string;
  score: number;
};

const MIN_SCORE = 0.22;

/** Small lexical boost — does not override semantic rank (avoids irrelevant MOQ mentions). */
const MOQ_KEYWORD_BOOST = 0.055;

function mentionsMoqOrOrder(text: string): boolean {
  return /\b(moq|minimum\s*order|M\.?O\.?Q\.?|min\.?\s*qty|minimum\s*quantity)\b/i.test(text);
}

function asksMoqLike(question: string): boolean {
  return /\b(moq|minimum\s*order|min\.?\s*qty|minimum\s*quantity)\b/i.test(question);
}

/** Embed this string for retrieval — ties chunks to the active product + question. */
export function buildKnowledgeRetrievalQuery(productName: string, buyerQuestion: string): string {
  const q = buyerQuestion.trim();
  const pn = productName.trim();
  if (!pn) return q;
  return `${pn}. ${q}`;
}

export async function retrieveKnowledgeChunks(
  sellerUserId: string,
  retrievalQuery: string,
  k = 6,
): Promise<RetrievedChunk[]> {
  await connectDb();
  const chunks = await SellerKnowledgeChunkModel.find({ sellerUserId }).limit(400).lean<
    Array<{ text: string; sourceFilename: string; embedding?: number[] }>
  >();
  if (!chunks.length) return [];
  const qEmb = await createEmbedding(retrievalQuery);
  const moqQuestion = asksMoqLike(retrievalQuery);

  const ranked = chunks
    .map((c) => {
      const emb = Array.isArray(c.embedding) && c.embedding.length ? c.embedding : [];
      let score = emb.length ? cosineSimilarity(qEmb, emb) : 0;
      if (moqQuestion && mentionsMoqOrOrder(c.text)) {
        score += MOQ_KEYWORD_BOOST;
      }
      return { text: c.text, sourceFilename: c.sourceFilename, score };
    })
    .sort((a, b) => b.score - a.score);

  const strong = ranked.filter((r) => r.score >= MIN_SCORE).slice(0, k);
  if (strong.length > 0) return strong;

  return ranked.slice(0, Math.min(k, ranked.length));
}
