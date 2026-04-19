import { connectDb } from "@/lib/db";
import { ConversationModel } from "@/lib/models/Conversation";
import { MessageModel } from "@/lib/models/Message";
import { ProductModel } from "@/lib/models/Product";
import { RFQModel } from "@/lib/models/RFQ";
import { UserModel } from "@/lib/models/User";

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "have",
  "need",
  "want",
  "looking",
  "qty",
]);

export type SellerMetrics = {
  conversationCount: number;
  handoffOpen: number;
  aiMessagesCount: number;
  sellerHumanMessagesCount: number;
  threadsWithAiActivity: number;
  topBuyerIntents: Array<{ phrase: string; count: number }>;
};

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function buildSellerKeywordSet(
  industryCategory: string,
  categories: string[],
  tags: string[],
): Set<string> {
  const s = new Set<string>();
  for (const part of industryCategory.split(/[^a-z0-9]+/i)) {
    const t = part.toLowerCase().trim();
    if (t.length > 2) s.add(t);
  }
  for (const c of categories) {
    const low = c.toLowerCase().trim();
    if (low.length > 2) s.add(low);
    for (const w of low.split(/\s+/)) {
      if (w.length > 2) s.add(w);
    }
  }
  for (const tag of tags) {
    const t = tag.toLowerCase().trim();
    if (t.length > 2) s.add(t);
  }
  return s;
}

function rfqMatchesSeller(query: string, keywords: Set<string>): boolean {
  const low = query.toLowerCase();
  for (const k of keywords) {
    if (k.length >= 3 && low.includes(k)) return true;
  }
  return false;
}

export async function computeSellerMetrics(sellerUserId: string): Promise<SellerMetrics> {
  await connectDb();

  const conversationCount = await ConversationModel.countDocuments({ sellerUserId });

  const handoffOpen = await ConversationModel.countDocuments({
    sellerUserId,
    handoffToHuman: true,
  });

  const convDocs = await ConversationModel.find({ sellerUserId }).select("_id").lean();
  const convIds = convDocs.map((c) => String(c._id));

  let aiMessagesCount = 0;
  let sellerHumanMessagesCount = 0;
  let threadsWithAiActivity = 0;

  if (convIds.length > 0) {
    aiMessagesCount = await MessageModel.countDocuments({
      conversationId: { $in: convIds },
      role: "assistant",
      isAi: true,
    });

    sellerHumanMessagesCount = await MessageModel.countDocuments({
      conversationId: { $in: convIds },
      role: "seller",
    });

    const dist = await MessageModel.aggregate<{ _id: string }>([
      {
        $match: {
          conversationId: { $in: convIds },
          role: "assistant",
          isAi: true,
        },
      },
      { $group: { _id: "$conversationId" } },
    ]);
    threadsWithAiActivity = dist.length;
  }

  const user = await UserModel.findById(sellerUserId)
    .select("industryCategory")
    .lean<{ industryCategory?: string } | null>();

  const products = await ProductModel.find({ "metadata.sellerOrgId": sellerUserId })
    .select("category tags")
    .lean<Array<{ category?: string; tags?: string[] }>>();

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];
  const tags = products.flatMap((p) => p.tags ?? []);
  const keywords = buildSellerKeywordSet(user?.industryCategory ?? "", categories, tags);

  const openRfqs = await RFQModel.find({ status: "open" })
    .select("productQuery")
    .sort({ createdAt: -1 })
    .limit(80)
    .lean<Array<{ productQuery: string }>>();

  const relevant = openRfqs.filter((r) => rfqMatchesSeller(r.productQuery, keywords));

  const counts = new Map<string, number>();
  for (const r of relevant) {
    for (const tok of tokenize(r.productQuery)) {
      counts.set(tok, (counts.get(tok) ?? 0) + 1);
    }
  }

  const topBuyerIntents = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase, count]) => ({ phrase, count }));

  return {
    conversationCount,
    handoffOpen,
    aiMessagesCount,
    sellerHumanMessagesCount,
    threadsWithAiActivity,
    topBuyerIntents,
  };
}
