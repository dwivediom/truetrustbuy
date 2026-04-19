import { requireRole } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { ConversationModel } from "@/lib/models/Conversation";
import { z } from "zod";

const patchSchema = z.object({
  aiAssistantEnabled: z.boolean().optional(),
  handoffToHuman: z.boolean().optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await requireRole(["seller", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const filter: Record<string, unknown> = { _id: id };
  if (access.role !== "admin") {
    filter.sellerUserId = access.session.user.id;
  }

  const update: Record<string, unknown> = {};
  if (typeof parsed.data.aiAssistantEnabled === "boolean") {
    update.aiAssistantEnabled = parsed.data.aiAssistantEnabled;
  }
  if (typeof parsed.data.handoffToHuman === "boolean") {
    update.handoffToHuman = parsed.data.handoffToHuman;
  }
  if (Object.keys(update).length === 0) {
    return Response.json({ error: "No valid fields" }, { status: 400 });
  }

  const conv = await ConversationModel.findOneAndUpdate(filter, { $set: update }, { new: true });
  if (!conv) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({
    conversation: {
      _id: String(conv._id),
      aiAssistantEnabled: conv.aiAssistantEnabled ?? true,
      handoffToHuman: conv.handoffToHuman ?? false,
    },
  });
}
