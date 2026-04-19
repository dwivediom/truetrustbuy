import { connectDb } from "@/lib/db";
import { SellerAgentRuleModel } from "@/lib/models/SellerAgentRule";
import { UserModel } from "@/lib/models/User";

export async function getSellerAgentPromptContext(sellerUserId: string, productId?: string) {
  await connectDb();
  const user = await UserModel.findById(sellerUserId)
    .select("agentInstructions name agentMode")
    .lean<{
      agentInstructions?: string;
      name?: string;
      agentMode?: string;
    } | null>();

  const globalRules = await SellerAgentRuleModel.find({
    sellerUserId,
    enabled: true,
    productId: null,
  })
    .sort({ priority: -1 })
    .lean<Array<{ label?: string; statement: string }>>();

  const productRules = productId
    ? await SellerAgentRuleModel.find({
        sellerUserId,
        enabled: true,
        productId,
      })
        .sort({ priority: -1 })
        .lean<Array<{ label?: string; statement: string }>>()
    : [];

  const rules = [...productRules, ...globalRules];
  const rulesBlock =
    rules.length > 0
      ? rules.map((r, i) => `${i + 1}. ${r.label ? `[${r.label}] ` : ""}${r.statement}`).join("\n")
      : "";

  const mode =
    user?.agentMode === "faq_only"
      ? "Operating mode: FAQ-only. Answer product, MOQ, and policy questions factually. Do not negotiate price, discounts, or custom deal terms—invite the buyer to discuss commercial terms with the seller directly."
      : "Operating mode: Full assistance. Help buyers understand tier pricing, volume fit, and specifications. You assist with qualification and clarity; you do not finalize binding contracts—human seller confirms formal orders.";

  const custom = (user?.agentInstructions ?? "").trim();
  const instructions = [mode, custom].filter(Boolean).join("\n\n");

  return {
    sellerName: user?.name ?? "Seller",
    agentInstructions: instructions,
    rulesBlock,
  };
}
