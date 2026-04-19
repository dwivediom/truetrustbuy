import { model, models, Schema } from "mongoose";

const ConversationSchema = new Schema(
  {
    buyerUserId: { type: String, required: true, index: true },
    sellerUserId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    title: { type: String, default: "" },
    handoffToHuman: { type: Boolean, default: false, index: true },
    /** When false, buyer messages do not trigger AI replies (human-only / agent paused). */
    aiAssistantEnabled: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

ConversationSchema.index({ buyerUserId: 1, sellerUserId: 1, productId: 1 }, { unique: true });

export const ConversationModel =
  models.Conversation || model("Conversation", ConversationSchema);
