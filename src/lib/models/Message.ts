import { model, models, Schema } from "mongoose";

const MessageSchema = new Schema(
  {
    conversationId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ["buyer", "seller", "assistant", "system"],
      required: true,
    },
    content: { type: String, required: true },
    /** Original text before translation (buyer language). */
    contentOriginal: { type: String, default: "" },
    /** Cached translation for seller preferred language. */
    contentForSellerLocale: { type: String, default: "" },
    isAi: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const MessageModel = models.Message || model("Message", MessageSchema);
