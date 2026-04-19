import { model, models, Schema } from "mongoose";

const RFQSchema = new Schema(
  {
    buyerUserId: { type: String, required: true, index: true },
    productQuery: { type: String, required: true, index: true },
    quantity: { type: Number, default: 1 },
    budget: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["open", "quoted", "closed"], default: "open", index: true },
  },
  { timestamps: true },
);

export const RFQModel = models.RFQ || model("RFQ", RFQSchema);
