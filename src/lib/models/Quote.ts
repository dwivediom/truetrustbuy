import { model, models, Schema } from "mongoose";

const QuoteSchema = new Schema(
  {
    rfqId: { type: String, required: true, index: true },
    sellerUserId: { type: String, required: true, index: true },
    productId: { type: String, default: "" },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    total: { type: Number, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

export const QuoteModel = models.Quote || model("Quote", QuoteSchema);
