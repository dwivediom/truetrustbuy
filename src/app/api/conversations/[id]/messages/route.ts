import { requireRole } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import {
  generateBuyerSideAssistantReply,
  shouldHandoffToHuman,
} from "@/lib/conversations/buyer-side-assistant";
import { translateToLanguage } from "@/lib/i18n/translate";
import { notifySellerEscalation } from "@/lib/notify/seller-escalation";
import { ConversationModel } from "@/lib/models/Conversation";
import { MessageModel } from "@/lib/models/Message";
import { UserModel } from "@/lib/models/User";
import { z } from "zod";

const postSchema = z.object({
  content: z.string().min(1).max(8000),
});

type ConvParties = { buyerUserId: string; sellerUserId: string };

type AccessGate =
  | { ok: true; conv: ConvParties }
  | { ok: false; status: 403 | 404; error: string };

async function assertConversationAccess(
  conversationId: string,
  userId: string,
  role: "admin" | "buyer" | "seller",
): Promise<AccessGate> {
  const conv = await ConversationModel.findById(conversationId).lean<ConvParties | null>();
  if (!conv) return { ok: false, status: 404, error: "Not found" };
  if (role === "admin") return { ok: true, conv };
  if (conv.buyerUserId === userId || conv.sellerUserId === userId) return { ok: true, conv };
  return { ok: false, status: 403, error: "Forbidden" };
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const access = await requireRole(["buyer", "seller", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const { id } = await ctx.params;
  const gate = await assertConversationAccess(id, access.session.user.id, access.role);
  if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });

  const { searchParams } = new URL(request.url);
  const viewer = searchParams.get("viewer") === "seller" ? "seller" : "buyer";
  const effectiveViewer =
    access.role === "seller" ? "seller" : access.role === "admin" ? viewer : "buyer";

  const messages = await MessageModel.find({ conversationId: id }).sort({ createdAt: 1 }).lean();

  let sellerLang = "en";
  if (effectiveViewer === "seller") {
    const seller = await UserModel.findById(gate.conv.sellerUserId)
      .select("preferredLanguage")
      .lean<{
        preferredLanguage?: string;
      } | null>();
    sellerLang = seller?.preferredLanguage?.trim() || "en";
  }

  const out = await Promise.all(
    messages.map(async (m) => {
      const base = {
        _id: String(m._id),
        role: m.role,
        createdAt: m.createdAt,
        isAi: m.isAi ?? false,
      };
      if (
        effectiveViewer === "seller" &&
        m.role === "buyer" &&
        sellerLang &&
        sellerLang !== "en"
      ) {
        let translated = m.contentForSellerLocale;
        if (!translated) {
          translated = await translateToLanguage(m.content, sellerLang);
          await MessageModel.updateOne(
            { _id: m._id },
            { $set: { contentForSellerLocale: translated } },
          );
        }
        return { ...base, content: translated, displaySource: "translated_for_seller" };
      }
      return { ...base, content: m.content, displaySource: "original" };
    }),
  );

  const convState = await ConversationModel.findById(id)
    .select("handoffToHuman aiAssistantEnabled")
    .lean<{ handoffToHuman?: boolean; aiAssistantEnabled?: boolean } | null>();
  return Response.json({
    messages: out,
    handoffToHuman: Boolean(convState?.handoffToHuman),
    aiAssistantEnabled: convState?.aiAssistantEnabled !== false,
  });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireRole(["buyer", "seller", "admin"]);
  if (!access.ok) return access.response;
  if (access.role === "admin") {
    return Response.json({ error: "Admins cannot post chat messages" }, { status: 403 });
  }
  await connectDb();
  const { id } = await ctx.params;
  const gate = await assertConversationAccess(id, access.session.user.id, access.role);
  if (!gate.ok) return Response.json({ error: gate.error }, { status: gate.status });

  const body = await request.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const convDoc = await ConversationModel.findById(id);
  if (!convDoc) return Response.json({ error: "Not found" }, { status: 404 });

  const isBuyerSender =
    access.role === "buyer" && convDoc.buyerUserId === access.session.user.id;
  const isSellerSender =
    access.role === "seller" && convDoc.sellerUserId === access.session.user.id;
  if (!isBuyerSender && !isSellerSender) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const role = isBuyerSender ? "buyer" : "seller";

  await MessageModel.create({
    conversationId: id,
    role,
    content: parsed.data.content,
    isAi: false,
  });

  if (role === "buyer") {
    if (shouldHandoffToHuman(parsed.data.content)) {
      convDoc.handoffToHuman = true;
      await convDoc.save();
      await MessageModel.create({
        conversationId: id,
        role: "system",
        content:
          "This thread is now flagged for human handling (order, payment, or contract). The manufacturer will respond directly. AI replies are paused.",
        isAi: false,
      });
      void notifySellerEscalation({
        sellerUserId: convDoc.sellerUserId,
        conversationId: id,
        summary: `Human handoff: ${parsed.data.content.slice(0, 240)}`,
        source: "buyer_thread",
      });
    } else if (!convDoc.handoffToHuman && convDoc.aiAssistantEnabled !== false) {
      const buyerPrefs = await UserModel.findById(access.session.user.id)
        .select("preferredLanguage")
        .lean<{ preferredLanguage?: string } | null>();
      const ai = await generateBuyerSideAssistantReply({
        sellerUserId: convDoc.sellerUserId,
        productId: convDoc.productId,
        buyerQuestion: parsed.data.content,
        buyerPreferredLanguage: buyerPrefs?.preferredLanguage?.trim(),
      });
      await MessageModel.create({
        conversationId: id,
        role: "assistant",
        content: ai.reply,
        isAi: true,
      });
      if (ai.needsHuman) {
        await MessageModel.create({
          conversationId: id,
          role: "system",
          content:
            "The AI could not fully answer from documents. Please have a human seller review and reply.",
          isAi: false,
        });
        void notifySellerEscalation({
          sellerUserId: convDoc.sellerUserId,
          conversationId: id,
          summary: `Needs human: ${parsed.data.content.slice(0, 200)}`,
          source: "buyer_thread",
        });
      }
    }
  }

  return Response.json({ ok: true }, { status: 201 });
}
