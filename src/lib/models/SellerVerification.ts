import { model, models, Schema } from "mongoose";

const SellerVerificationSchema = new Schema(
  {
    sellerUserId: { type: String, required: true, index: true },
    orgId: { type: String, required: true, index: true },
    gstin: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    documents: [{ type: String }],
    reviewNote: { type: String, default: "" },
    reviewedBy: { type: String, default: "" },
  },
  { timestamps: true },
);

export const SellerVerificationModel =
  models.SellerVerification || model("SellerVerification", SellerVerificationSchema);
