import { requireRole } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { getSellerAgentPromptContext } from "@/lib/agent/prompt-context";
import { PricingRuleModel } from "@/lib/models/PricingRule";
import { ProductModel } from "@/lib/models/Product";
import { SellerAgentRuleModel } from "@/lib/models/SellerAgentRule";
import { SellerKnowledgeChunkModel } from "@/lib/models/SellerKnowledgeChunk";
import { SellerVerificationModel } from "@/lib/models/SellerVerification";
import { UserModel } from "@/lib/models/User";

/**
 * Aggregated seller profile for debugging / agent context (PRD sample JSON shape).
 */
export async function GET() {
  const access = await requireRole(["seller", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const sid = access.session.user.id;
  const user = await UserModel.findById(sid)
    .select(
      "name email preferredLanguage agentInstructions phone phoneNotifyConsent orgId industryCategory gstin",
    )
    .lean<{
      name?: string;
      email?: string;
      preferredLanguage?: string;
      agentInstructions?: string;
      phone?: string;
      phoneNotifyConsent?: boolean;
      orgId?: string;
      industryCategory?: string;
      gstin?: string;
    } | null>();

  const verification = await SellerVerificationModel.findOne({ sellerUserId: sid })
    .select("status gstin orgId")
    .lean<{ status?: string; gstin?: string; orgId?: string } | null>();

  const products = await ProductModel.find({ "metadata.sellerOrgId": sid })
    .select("name category customizationAvailable pricing")
    .lean();
  const pids = products.map((p) => String(p._id));
  const rules = await PricingRuleModel.find({ sellerUserId: sid, productId: { $in: pids } }).lean();
  const ruleByProduct = new Map(rules.map((r) => [String(r.productId), r]));

  const agentRules = await SellerAgentRuleModel.find({ sellerUserId: sid }).sort({ priority: -1 }).lean();
  const chunkCount = await SellerKnowledgeChunkModel.countDocuments({ sellerUserId: sid });
  const promptCtx = await getSellerAgentPromptContext(sid);

  const catalog = products.map((p) => {
    const pr = ruleByProduct.get(String(p._id));
    return {
      product_id: String(p._id),
      name: p.name,
      category: p.category,
      customization_available: Boolean(p.customizationAvailable),
      listing_price: p.pricing,
      pricing_tiers: pr?.tiers ?? null,
      moq: pr?.moq ?? null,
      currency: pr?.currency ?? p.pricing?.currency,
    };
  });

  return Response.json({
    seller_id: sid,
    profile: user,
    org_id: user?.orgId ?? "",
    orgId: user?.orgId ?? "",
    industry_category: user?.industryCategory ?? "",
    verification: verification
      ? { status: verification.status, gstin: verification.gstin, orgId: verification.orgId }
      : null,
    preferred_language: user?.preferredLanguage ?? "en",
    agent_instructions: user?.agentInstructions ?? "",
    agent_rules_count: agentRules.length,
    knowledge_chunk_count: chunkCount,
    agent_prompt_preview: promptCtx,
    catalog,
    agent_rules: agentRules,
  });
}
