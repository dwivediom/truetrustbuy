import { model, models, Schema } from "mongoose";

const SellerAgentRuleSchema = new Schema(
  {
    sellerUserId: { type: String, required: true, index: true },
    /** When set, rule applies only to this product; null = seller-wide. */
    productId: { type: String, default: null, index: true },
    label: { type: String, default: "" },
    statement: { type: String, required: true },
    priority: { type: Number, default: 0, index: true },
    enabled: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

SellerAgentRuleSchema.index({ sellerUserId: 1, productId: 1, priority: -1 });

export const SellerAgentRuleModel =
  models.SellerAgentRule || model("SellerAgentRule", SellerAgentRuleSchema);
