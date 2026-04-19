import { model, models, Schema } from "mongoose";

const PricingInsightAlertSchema = new Schema(
  {
    sellerUserId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    message: { type: String, required: true },
    typicalSearchMaxPrice: { type: Number, default: 0 },
    yourTierUnitPrice: { type: Number, default: 0 },
    dismissed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const PricingInsightAlertModel =
  models.PricingInsightAlert || model("PricingInsightAlert", PricingInsightAlertSchema);
