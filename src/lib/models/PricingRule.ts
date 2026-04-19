import { model, models, Schema } from "mongoose";

const PricingRuleSchema = new Schema(
  {
    sellerUserId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    currency: { type: String, default: "INR" },
    moq: { type: Number, default: 1, index: true },
    tiers: [
      {
        minQty: { type: Number, required: true },
        maxQty: { type: Number, default: null },
        unitPrice: { type: Number, required: true },
        leadTimeDays: { type: Number, default: undefined },
      },
    ],
  },
  { timestamps: true },
);

export const PricingRuleModel = models.PricingRule || model("PricingRule", PricingRuleSchema);
