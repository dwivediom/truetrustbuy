import { connectDb } from "@/lib/db";
import { UserModel } from "@/lib/models/User";

/**
 * Notify seller when human follow-up is needed (AI gap, escalation, etc.).
 * Uses optional webhook URL; otherwise logs for development.
 */
export async function notifySellerEscalation(input: {
  sellerUserId: string;
  summary: string;
  conversationId?: string;
  source: "buyer_thread" | "seller_bot";
}) {
  await connectDb();
  const user = await UserModel.findById(input.sellerUserId)
    .select("phone phoneNotifyConsent name")
    .lean<{ phone?: string; phoneNotifyConsent?: boolean; name?: string } | null>();

  const hook = process.env.SELLER_NOTIFY_WEBHOOK_URL?.trim();
  const payload = {
    sellerUserId: input.sellerUserId,
    sellerName: user?.name ?? "",
    phone: user?.phoneNotifyConsent ? user.phone : null,
    summary: input.summary,
    conversationId: input.conversationId,
    source: input.source,
    at: new Date().toISOString(),
  };

  if (hook) {
    try {
      await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // fall through to log
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[notifySellerEscalation]", payload);
  }
}
