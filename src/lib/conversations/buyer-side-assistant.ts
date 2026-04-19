import { ASSISTANT_NAME } from "@/lib/brand/assistant";
import { getSellerAgentPromptContext } from "@/lib/agent/prompt-context";
import { localizeBuyerFacingReply } from "@/lib/i18n/translate";
import { generateGeminiText, hasGeminiApiKey } from "@/lib/gemini";
import { retrieveKnowledgeChunks } from "@/lib/knowledge/retrieve";
import { PricingRuleModel } from "@/lib/models/PricingRule";
import { ProductModel } from "@/lib/models/Product";
import { calculateTierPrice } from "@/lib/pricing";

export type BuyerAssistantResult = {
  reply: string;
  needsHuman: boolean;
  isAi: true;
};

const HANDOFF_RE =
  /\b(place\s+order|purchase\s+order|invoice|payment|pay\s+now|contract|sign\s+agreement|legal|lawsuit)\b/i;

export function shouldHandoffToHuman(buyerText: string): boolean {
  return HANDOFF_RE.test(buyerText);
}

export async function generateBuyerSideAssistantReply(input: {
  sellerUserId: string;
  productId: string;
  buyerQuestion: string;
  /** Account default (BCP-47), e.g. hi — used when the message is not clearly English-only. */
  buyerPreferredLanguage?: string | null;
}): Promise<BuyerAssistantResult> {
  const wrap = async (reply: string, needsHuman: boolean): Promise<BuyerAssistantResult> => ({
    reply: await localizeBuyerFacingReply(
      reply,
      input.buyerQuestion,
      input.buyerPreferredLanguage,
    ),
    needsHuman,
    isAi: true,
  });

  const product = await ProductModel.findById(input.productId).lean<{ name: string } | null>();
  if (!product) {
    return wrap(
      `Hi — I’m ${ASSISTANT_NAME}. This product could not be loaded, so someone on the supplier side may need to fix the listing.`,
      true,
    );
  }
  const rule = await PricingRuleModel.findOne({ productId: input.productId }).lean<{
    moq?: number;
    currency: string;
    tiers: Array<{ minQty: number; maxQty: number | null; unitPrice: number; leadTimeDays?: number }>;
  } | null>();

  const qtyMatch = input.buyerQuestion.match(/(\d+)\s*(pcs|pieces|units|qty)?/i);
  const quantity = qtyMatch ? Number(qtyMatch[1]) : undefined;
  const moq = rule?.moq ?? 1;
  const qty = quantity != null && quantity > 0 ? Math.max(quantity, moq) : moq;

  const agentCtx = await getSellerAgentPromptContext(input.sellerUserId, input.productId);
  const rulesPrefix = [
    agentCtx.agentInstructions ? `Seller instructions:\n${agentCtx.agentInstructions}` : "",
    agentCtx.rulesBlock ? `Seller rules:\n${agentCtx.rulesBlock}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  let pricingLine = "";
  if (rule?.tiers?.length && product) {
    const calc = calculateTierPrice(qty, rule.tiers);
    const lt =
      calc.tier && typeof calc.tier.leadTimeDays === "number"
        ? ` Estimated lead time: ${calc.tier.leadTimeDays} days (for this volume band).`
        : "";
    pricingLine = `Product: ${product.name}. For quantity ${qty} (MOQ ${moq}), unit price is ${calc.unitPrice} ${rule.currency}, total ${calc.total} ${rule.currency}.${lt}`;
  }

  const chunks = await retrieveKnowledgeChunks(input.sellerUserId, input.buyerQuestion, 5);
  const kbBlock = chunks.length
    ? `Seller knowledge excerpts (from uploaded documents):\n${chunks.map((c, i) => `[${i + 1}] ${c.text}`).join("\n\n")}`
    : "";

  const needsHumanFromKb =
    !kbBlock &&
    !pricingLine.match(/unit price/i) &&
    /\b(certif|material|eco|glass|color|ship|custom|warranty)\b/i.test(input.buyerQuestion);

  if (needsHumanFromKb) {
    return wrap(
      `I’m ${ASSISTANT_NAME} — I couldn’t find this in the seller’s uploaded documents. Someone from the supplier will review your message here. For orders, contracts, or payments, they’ll finalize details.`,
      true,
    );
  }

  const baseInstructions = `You are ${ASSISTANT_NAME}, a sourcing specialist on TrueTrustBuy helping a buyer reach ${agentCtx.sellerName}.
Speak naturally like a knowledgeable colleague — never say you are an AI, bot, or automated system.
Do not invent certifications, materials, or policies not stated in the knowledge excerpts or pricing facts below.
If information is missing, say you cannot confirm from documents and someone at the supplier should confirm.
Do not negotiate final contract or payment — hand off to the seller for that.
Keep the reply concise (under 120 words).
Reply in the same language as the buyer’s message when they write in that language or ask for it (e.g. Hindi). Translate facts from excerpts; never refuse because excerpts are English.

${rulesPrefix ? `${rulesPrefix}\n\n` : ""}
${pricingLine ? `Pricing facts:\n${pricingLine}\n` : ""}
${kbBlock ? `${kbBlock}\n` : ""}
Buyer question: ${input.buyerQuestion}`;

  if (!hasGeminiApiKey()) {
    return wrap(
      pricingLine
        ? `Hi — I’m ${ASSISTANT_NAME}. ${pricingLine}`
        : `I’m ${ASSISTANT_NAME}. I don’t have enough verified information yet; someone from the supplier will follow up.`,
      !pricingLine,
    );
  }

  try {
    const generated = await generateGeminiText(baseInstructions);
    const reply = generated?.trim() ?? "";
    if (!reply) throw new Error("empty_gemini_reply");
    const body = reply.toLowerCase().startsWith("hi ") ? reply : `Hi — I’m ${ASSISTANT_NAME}. ${reply}`;
    return wrap(body, false);
  } catch {
    return wrap(
      pricingLine
        ? `Hi — I’m ${ASSISTANT_NAME}. ${pricingLine}`
        : `${ASSISTANT_NAME} here — I couldn’t draft a full reply right now. Please try again shortly or wait for the seller.`,
      !pricingLine,
    );
  }
}
