import { model, models, Schema, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "buyer", "seller"],
      default: "buyer",
      index: true,
    },
    name: { type: String, required: true },
    /** Business vertical selected at seller signup (e.g. Packaging, Textiles). */
    industryCategory: { type: String, default: "", index: true },
    /** GSTIN collected at signup when provided; full verification uses SellerVerification. */
    gstin: { type: String, default: "", index: true },
    /**
     * Seller agent posture: assist with volume/pricing fit vs FAQ-only (no deal framing).
     * Prompt layer reads this in getSellerAgentPromptContext.
     */
    agentMode: {
      type: String,
      enum: ["negotiate", "faq_only"],
      default: "negotiate",
      index: true,
    },
    orgId: { type: String, default: "" },
    /** BCP-47 language tag, e.g. en, gu, hi — used for inbox translation. */
    preferredLanguage: { type: String, default: "en", index: true },
    /** When the buyer explicitly chose a preferred language (chat/settings); null means use contact-supplier gate. */
    languageExplicitAt: { type: Date, default: null },
    /** Free-text instructions prepended to all seller-agent Gemini prompts. */
    agentInstructions: { type: String, default: "" },
    /** E.164 or local digits; used only if phoneNotifyConsent is true. */
    phone: { type: String, default: "" },
    phoneNotifyConsent: { type: Boolean, default: false },
    /** Importer / storefront payload: business name, seller code, profile image, location, verification badge, etc. */
    sellerProfile: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema>;
export const UserModel = models?.User || model("User", UserSchema);
