import { CONNECTION_STATUSES } from "@/lib/leads/supplier-intent-workflow";
import { model, models, Schema } from "mongoose";

const INTENT_TYPES = ["order_confirm", "callback_request"] as const;
export type SupplierIntentType = (typeof INTENT_TYPES)[number];

const SupplierBuyerIntentSchema = new Schema(
  {
    sellerUserId: { type: String, required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    intentType: { type: String, enum: INTENT_TYPES, required: true, index: true },
    guestToken: { type: String, default: "", index: true },
    buyerUserId: { type: String, default: "", index: true },
    replyLanguage: { type: String, default: "en" },
    contactEmail: { type: String, default: "", lowercase: true, trim: true },
    contactPhone: { type: String, default: "", trim: true },
    summary: { type: String, default: "" },
    chatExcerpt: { type: String, default: "" },
    /** Denormalized at create for seller lists; products can still be joined by productId. */
    productNameSnapshot: { type: String, default: "" },
    /** Search / buyer-stated quantity when submitted from search chat. */
    searchQuantity: { type: Number },
    /** Gemini + defaults: editable final order quantity for the seller. */
    orderQuantity: { type: Number },
    /** Unit price (per piece) in priceCurrency — pre-filled from extraction or list price. */
    unitPrice: { type: Number },
    priceCurrency: { type: String, default: "", trim: true },
    /** JSON: structured extract (Gemini), key points, snapshots. */
    structuredExtract: { type: Schema.Types.Mixed, default: {} },
    /** Seller CRM: outreach / deal stage (separate from read status). */
    connectionStatus: {
      type: String,
      enum: CONNECTION_STATUSES,
      default: "not_connected",
      index: true,
    },
    /** Internal owner / person responsible for following up. */
    contactOwner: { type: String, default: "", maxlength: 200 },
    sellerNotes: { type: String, default: "", maxlength: 8000 },
    /** Row read state for seller inbox-style triage. */
    status: { type: String, enum: ["new", "seen"], default: "new", index: true },
  },
  { timestamps: true },
);

SupplierBuyerIntentSchema.index({ sellerUserId: 1, createdAt: -1 });

export const SupplierBuyerIntentModel =
  models?.SupplierBuyerIntent || model("SupplierBuyerIntent", SupplierBuyerIntentSchema);
