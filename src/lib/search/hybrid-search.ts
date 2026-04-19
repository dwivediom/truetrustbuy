import { connectDb } from "@/lib/db";
import { ProductModel } from "@/lib/models/Product";
import { cosineSimilarity, createEmbedding } from "@/lib/search/embeddings";
import { parseContextQuery } from "@/lib/search/query-parser";

export async function hybridSearch(query: string) {
  await connectDb();
  const parsed = parseContextQuery(query);
  const filter: Record<string, unknown> = {};

  if (typeof parsed.maxPrice === "number") {
    filter["pricing.amount"] = { $lte: parsed.maxPrice };
  }
  if (parsed.billingPeriod) {
    filter["pricing.billingPeriod"] = parsed.billingPeriod;
  }

  const docs = await ProductModel.find(filter).limit(200).lean();
  const qEmbedding = await createEmbedding(query);

  const ranked = docs
    .map((doc) => {
      const searchText = `${doc.name} ${doc.description} ${doc.category} ${(doc.tags ?? []).join(" ")} ${(doc.useCases ?? []).join(" ")}`.toLowerCase();
      const termHits = [...parsed.useCaseTerms, ...parsed.categoryTerms].reduce(
        (acc, term) => (searchText.includes(term) ? acc + 1 : acc),
        0,
      );
      const lexical = termHits / Math.max(parsed.useCaseTerms.length + parsed.categoryTerms.length, 1);
      const vector = Array.isArray(doc.embedding) && doc.embedding.length > 0 ? cosineSimilarity(qEmbedding, doc.embedding) : 0;
      const score = 0.65 * vector + 0.35 * lexical;
      return { ...doc, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return { parsed, results: ranked };
}
