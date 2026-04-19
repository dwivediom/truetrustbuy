import { model, models, Schema } from "mongoose";

const OrganizationSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    industryCategory: { type: String, default: "", index: true },
    accountType: { type: String, enum: ["buyer", "seller", "both"], required: true },
    gstin: { type: String, default: "", index: true },
    isVerified: { type: Boolean, default: false, index: true },
    address: { type: String, default: "" },
    city: { type: String, default: "", index: true },
    state: { type: String, default: "", index: true },
  },
  { timestamps: true },
);

export const OrganizationModel =
  models?.Organization || model("Organization", OrganizationSchema);
