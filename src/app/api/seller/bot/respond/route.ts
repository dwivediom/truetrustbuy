import { auth } from "@/auth";
import { ASSISTANT_NAME, MAX_GUEST_PRODUCT_CHAT_TURNS } from "@/lib/brand/assistant";
import { getGuestTokenFromCookie } from "@/lib/buyer-intake-cookie";
import { getSellerAgentPromptContext } from "@/lib/agent/prompt-context";
import { connectDb } from "@/lib/db";
import { generateGeminiText, hasGeminiApiKey } from "@/lib/gemini";
import { inferLanguageSwitchIntent } from "@/lib/i18n/reply-language";
import { localizeBuyerFacingReply } from "@/lib/i18n/translate";
import { buildBotReplyWithoutGemini } from "@/lib/knowledge/bot-offline-reply";
import { buildKnowledgeRetrievalQuery, retrieveKnowledgeChunks } from "@/lib/knowledge/retrieve";
import { notifySellerEscalation } from "@/lib/notify/seller-escalation";
import { BuyerIntakeModel } from "@/lib/models/BuyerIntake";
import { PricingRuleModel } from "@/lib/models/PricingRule";
import { ProductModel } from "@/lib/models/Product";
import { UserModel } from "@/lib/models/User";
import { calculateTierPrice } from "@/lib/pricing";
import type { Session } from "next-auth";
import { z } from "zod";

const bodySchema = z.object({
  productId: z.string().min(1),
  question: z.string().min(2),
  quantity: z.number().int().min(1).optional(),
  /** Session reply language (BCP-47 primary subtag); wins over stored buyer preference for this turn. */
  replyLanguage: z.string().max(24).optional(),
});

function normalizeReplyPrimary(tag?: string | null): string | undefined {
  const t = tag?.trim().split(/[-_]/)[0]?.toLowerCase();
  return t && t.length ? t : undefined;
}

async function persistLanguageSwitchFromQuestion(opts: {
  session: Session | null;
  guestToken: string | null;
  switchTag: string | null;
}) {
  const tag = opts.switchTag?.trim().toLowerCase();
  if (!tag) return;
  const now = new Date();
  if (opts.session?.user?.role === "buyer") {
    await UserModel.findByIdAndUpdate(opts.session.user.id, {
      $set: { preferredLanguage: tag, languageExplicitAt: now },
    });
    return;
  }
  if (opts.guestToken) {
    await BuyerIntakeModel.findOneAndUpdate(
      { guestToken: opts.guestToken },
      {
        $set: { preferredLanguage: tag, explicitLanguageAt: now },
        $setOnInsert: { guestToken: opts.guestToken },
      },
      { upsert: true },
    );
  }
}

async function localizeReply(
  answer: string,
  question: string,
  buyerPreferredTag: string | undefined,
  effectiveReplyTag: string | undefined,
) {
  const opts = effectiveReplyTag !== undefined ? { replyLanguageTag: effectiveReplyTag } : undefined;
  return localizeBuyerFacingReply(answer, question, buyerPreferredTag, opts);
}

type PricingRuleLean = {
  sellerUserId: string;
  moq?: number;
  currency: string;
  tiers: Array<{
    minQty: number;
    maxQty: number | null;
    unitPrice: number;
    leadTimeDays?: number;
  }>;
};

async function bumpGuestTurn(guestToken: string | null) {
  if (!guestToken) return;
  await BuyerIntakeModel.findOneAndUpdate(
    { guestToken },
    {
      $inc: { guestProductChatTurns: 1 },
      $setOnInsert: { guestToken, preferredLanguage: "en" },
    },
    { upsert: true },
  );
}

function guestMeta(guestToken: string | null, session: boolean) {
  if (session || !guestToken) return {};
  return { guestChat: true as const };
}

export async function POST(request: Request) {
  await connectDb();
  const session = await auth();
  const guestToken = session?.user?.id ? null : await getGuestTokenFromCookie();

  if (!session?.user?.id && !guestToken) {
    return Response.json(
      {
        error: "Enable cookies or sign in to continue.",
        code: "AUTH_OR_COOKIE",
      },
      { status: 401 },
    );
  }

  let buyerPreferredTag: string | undefined;
  if (session?.user?.id && session.user.role === "buyer") {
    const pref = await UserModel.findById(session.user.id)
      .select("preferredLanguage")
      .lean<{ preferredLanguage?: string } | null>();
    buyerPreferredTag = pref?.preferredLanguage?.trim();
  } else if (guestToken) {
    const intake = await BuyerIntakeModel.findOne({ guestToken }).lean<{
      preferredLanguage?: string;
      guestProductChatTurns?: number;
    }>();
    buyerPreferredTag = intake?.preferredLanguage?.trim();
    const turns = intake?.guestProductChatTurns ?? 0;
    if (turns >= MAX_GUEST_PRODUCT_CHAT_TURNS) {
      return Response.json(
        {
          error: "Sign in to continue your conversation with Jiya.",
          code: "LOGIN_REQUIRED",
          callbackUrl: "/buyer/dashboard",
        },
        { status: 403 },
      );
    }
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const switchTag = inferLanguageSwitchIntent(parsed.data.question);
  if (switchTag) {
    await persistLanguageSwitchFromQuestion({ session, guestToken, switchTag });
  }
  const effectiveReplyTag =
    normalizeReplyPrimary(parsed.data.replyLanguage) ?? (switchTag ?? undefined);

  const extractedQty = Number(
    parsed.data.question.match(/(\d+)\s*(pcs|pieces|units|qty)?/i)?.[1] ?? 0,
  );
  const quantity = parsed.data.quantity ?? (extractedQty || 1);

  const product = await ProductModel.findById(parsed.data.productId).lean<{
    name: string;
    pricing: { amount: number; currency: string; billingPeriod?: string };
    metadata?: { sellerOrgId?: string };
  } | null>();

  if (!product) {
    return Response.json({ error: "Product not found." }, { status: 404 });
  }

  const pricingRule = await PricingRuleModel.findOne({ productId: parsed.data.productId }).lean<PricingRuleLean | null>();

  const sellerUserId = pricingRule?.sellerUserId ?? product.metadata?.sellerOrgId ?? "";
  if (!sellerUserId) {
    return Response.json(
      { error: "This product is not linked to a seller catalog (missing seller reference)." },
      { status: 400 },
    );
  }

  if (session?.user?.role === "seller" && product.metadata?.sellerOrgId !== session.user.id) {
    return Response.json({ error: "You can only test your own products." }, { status: 403 });
  }

  const hasTiers = Boolean(pricingRule?.tiers?.length);

  if (hasTiers && pricingRule && quantity < (pricingRule.moq ?? 1)) {
    let answer = `Minimum MOQ is ${pricingRule.moq ?? 1}. Please increase quantity.`;
    answer = await localizeReply(answer, parsed.data.question, buyerPreferredTag, effectiveReplyTag);
    await bumpGuestTurn(guestToken);
    return Response.json({
      answer,
      breakdown: null,
      knowledgeChunksUsed: 0,
      ...guestMeta(guestToken, Boolean(session?.user)),
    });
  }

  let baseAnswer: Record<string, unknown>;
  let fallbackAnswer: string;

  if (hasTiers && pricingRule) {
    const calc = calculateTierPrice(quantity, pricingRule.tiers);
    baseAnswer = {
      product: product.name,
      currency: pricingRule.currency,
      quantity,
      unitPrice: calc.unitPrice,
      total: calc.total,
      tier: calc.tier,
      leadTimeDays:
        calc.tier && typeof calc.tier.leadTimeDays === "number" ? calc.tier.leadTimeDays : undefined,
      pricingSource: "tiered_rules",
    };
    fallbackAnswer = `Hi — I'm ${ASSISTANT_NAME}. For ${quantity} units, unit price is ${calc.unitPrice} ${pricingRule.currency}. Total is ${calc.total} ${pricingRule.currency}.`;
  } else {
    const unitPrice = product.pricing.amount;
    const total = unitPrice * quantity;
    baseAnswer = {
      product: product.name,
      currency: product.pricing.currency,
      quantity,
      unitPrice,
      total,
      tier: null,
      pricingSource: "listing_price",
      note:
        "No tiered pricing rule saved — using catalog list price only. Add MOQ bands under Tiered pricing for buyer-accurate quotes.",
    };
    fallbackAnswer = `Hi — I'm ${ASSISTANT_NAME}. Using your catalog list price of ${unitPrice} ${product.pricing.currency} per unit (${total} ${product.pricing.currency} for ${quantity} units). Add tiered pricing when you're ready for quantity bands.`;
  }

  const agentCtx = await getSellerAgentPromptContext(sellerUserId, parsed.data.productId);
  const sellerRuleBlock = [
    agentCtx.agentInstructions ? `Seller instructions:\n${agentCtx.agentInstructions}` : "",
    agentCtx.rulesBlock ? `Seller rules (priority):\n${agentCtx.rulesBlock}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const retrievalQuery = buildKnowledgeRetrievalQuery(product.name, parsed.data.question);
  const chunks = await retrieveKnowledgeChunks(sellerUserId, retrievalQuery, 6);

  const kbBlock = chunks.length
    ? chunks
        .map((c, i) => `[${i + 1}] (source: ${c.sourceFilename})\n${c.text}`)
        .join("\n\n---\n\n")
    : "";

  const factualSpec =
    /\b(certif|material|eco|glass|color|ship|custom|warranty|iso|organic|blue|amber|clear)\b/i.test(
      parsed.data.question,
    );
  const priceish = /\b(price|cost|quote|moq|budget|rupee|inr|₹|unit)\b/i.test(parsed.data.question);

  const weakKbForSpecs = factualSpec && chunks.length === 0 && !priceish;

  if (!hasGeminiApiKey()) {
    let answer = buildBotReplyWithoutGemini(
      parsed.data.question,
      chunks,
      agentCtx.sellerName,
      baseAnswer,
      fallbackAnswer,
    );
    answer = await localizeReply(answer, parsed.data.question, buyerPreferredTag, effectiveReplyTag);
    await bumpGuestTurn(guestToken);
    return Response.json({
      answer,
      breakdown: baseAnswer,
      isAi: false,
      assistantName: ASSISTANT_NAME,
      knowledgeChunksUsed: chunks.length,
      pricingMode: hasTiers ? "tiers" : "listing_fallback",
      groundedInKb: chunks.length > 0,
      geminiConfigured: false,
      ...guestMeta(guestToken, Boolean(session?.user)),
    });
  }

  if (weakKbForSpecs) {
    void notifySellerEscalation({
      sellerUserId,
      summary: `Weak KB retrieval for factual question: ${parsed.data.question.slice(0, 200)}`,
      source: "seller_bot",
    });
  }

  const pricingHint = hasTiers
    ? "Official quantity pricing comes from tiered rules in Pricing breakdown."
    : "Listing unit price is in Pricing breakdown; if documents contain different MOQ or tiers, prefer the numbered excerpts.";

  const excerptRules = chunks.length
    ? `Knowledge excerpts (only these passages may be cited for specs, MOQ in docs, materials, shipping policy — quote numbers exactly as written):
${kbBlock}`
    : `NO knowledge excerpts were retrieved for this query (embedding mismatch or empty index). Do NOT invent brochure facts. Answer from seller rules + pricing breakdown only, and say clearly when something is not in the documents.`;

  const activeLangLine =
    effectiveReplyTag != null
      ? `ACTIVE SESSION REPLY LANGUAGE (primary tag): "${effectiveReplyTag}". Write the full reply in this language (translate excerpts and pricing faithfully); when it is English, reply in English.\n`
      : "";

  const prompt = `You are ${ASSISTANT_NAME}, a knowledgeable sourcing specialist helping buyers on behalf of "${agentCtx.sellerName}". You reply on TrueTrustBuy — sound human, warm, and professional (like a trusted colleague at a desk), not like a bot.

PRODUCT CONTEXT (this thread): "${product.name}"

RULES — follow strictly:
1. Open with a short, natural greeting in your own voice as ${ASSISTANT_NAME} (one brief line). Never say you are an AI, chatbot, automated system, or "assistant" in the robotic sense—buyers should feel they are messaging a real person who knows the catalog.
2. For facts about MOQ in documents, materials, certifications, lead times, shipping: ONLY use information supported by the Knowledge excerpts below. Quote or paraphrase closely; never invent.
3. For unit price / totals at the buyer quantity: use the Pricing breakdown JSON (tiered rules take precedence over listing price).
4. If excerpts do not contain the answer, say so plainly — then you may still give pricing from Pricing breakdown if relevant.
5. Do not paste raw JSON. Do not repeat filler about "listing price of X" unless the buyer asked about price.
6. Keep the answer concise and scoped to this product.
7. LANGUAGE: Reply in the same language as the buyer’s question when they write in that language OR explicitly ask for it (e.g. “in Hindi”, Hindi script). Translate facts from excerpts and pricing JSON into that language. Never refuse because documents are English — translate accurately. Never claim “pricing is not available in Hindi/other language”; give numbers and units in every language.
${activeLangLine}
${pricingHint}

${sellerRuleBlock ? `Seller / agent rules:\n${sellerRuleBlock}\n\n` : ""}

Pricing breakdown (structured): ${JSON.stringify(baseAnswer)}

${excerptRules}

Buyer question: ${parsed.data.question}`;

  try {
    let answer = (await generateGeminiText(prompt))?.trim() ?? "";

    if (!answer) {
      answer = buildBotReplyWithoutGemini(
        parsed.data.question,
        chunks,
        agentCtx.sellerName,
        baseAnswer,
        fallbackAnswer,
      );
      answer = await localizeReply(answer, parsed.data.question, buyerPreferredTag, effectiveReplyTag);
      await bumpGuestTurn(guestToken);
      return Response.json({
        answer,
        breakdown: baseAnswer,
        isAi: false,
        assistantName: ASSISTANT_NAME,
        knowledgeChunksUsed: chunks.length,
        pricingMode: hasTiers ? "tiers" : "listing_fallback",
        groundedInKb: chunks.length > 0,
        geminiEmptyBody: true,
        ...guestMeta(guestToken, Boolean(session?.user)),
      });
    }

    answer = await localizeReply(answer, parsed.data.question, buyerPreferredTag, effectiveReplyTag);

    await bumpGuestTurn(guestToken);
    return Response.json({
      answer,
      breakdown: baseAnswer,
      isAi: false,
      assistantName: ASSISTANT_NAME,
      knowledgeChunksUsed: chunks.length,
      pricingMode: hasTiers ? "tiers" : "listing_fallback",
      groundedInKb: chunks.length > 0,
      geminiConfigured: true,
      ...guestMeta(guestToken, Boolean(session?.user)),
    });
  } catch (err) {
    console.error("[api/seller/bot/respond] Gemini generateContent failed:", err);
    let answer = buildBotReplyWithoutGemini(
      parsed.data.question,
      chunks,
      agentCtx.sellerName,
      baseAnswer,
      fallbackAnswer,
    );
    answer = await localizeReply(answer, parsed.data.question, buyerPreferredTag, effectiveReplyTag);
    await bumpGuestTurn(guestToken);
    return Response.json({
      answer,
      breakdown: baseAnswer,
      isAi: false,
      assistantName: ASSISTANT_NAME,
      knowledgeChunksUsed: chunks.length,
      pricingMode: hasTiers ? "tiers" : "listing_fallback",
      groundedInKb: chunks.length > 0,
      geminiErrorFallback: true,
      geminiConfigured: true,
      ...guestMeta(guestToken, Boolean(session?.user)),
    });
  }
}
