import { model, models, Schema, type InferSchemaType } from "mongoose";

/**
 * Guest / buyer intake captured before or during search (cookie `ttb_guest`).
 * One logical profile per `guestToken` — upsert on POST.
 */
const BuyerIntakeSchema = new Schema(
  {
    guestToken: { type: String, required: true, unique: true, index: true },
    preferredLanguage: { type: String, default: "en", index: true },
    /** When preset is "other", store free-text language name */
    customLanguage: { type: String, default: "" },
    contactEmail: { type: String, default: "", lowercase: true, trim: true },
    contactPhone: { type: String, default: "", trim: true },
    productInterest: { type: String, default: "", maxlength: 500 },
    marketingConsent: { type: Boolean, default: false },
    /** Set when intake is merged into a User after login/register */
    mergedUserId: { type: String, default: "", index: true },
    /** Guest search product-chat messages used (server-enforced limit before login). */
    guestProductChatTurns: { type: Number, default: 0, min: 0 },
    /** Set when the user explicitly chose a reply language (intake, chat gate, or language control). */
    explicitLanguageAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type BuyerIntakeDoc = InferSchemaType<typeof BuyerIntakeSchema>;
export const BuyerIntakeModel = models.BuyerIntake || model("BuyerIntake", BuyerIntakeSchema);
