import { model, models, Schema, type InferSchemaType } from "mongoose";

const ProductSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    description: { type: String, required: true },
    category: { type: String, required: true, index: true },
    useCases: [{ type: String }],
    tags: [{ type: String, index: true }],
    customizationAvailable: { type: Boolean, default: false, index: true },
    pricing: {
      amount: { type: Number, required: true, index: true },
      currency: { type: String, default: "USD" },
      billingPeriod: {
        type: String,
        enum: ["month", "year", "one_time"],
        default: "month",
      },
    },
    /** Public HTTPS URLs for catalog photos (first entry is primary). */
    images: { type: [String], default: [] },
    metadata: {
      website: { type: String, default: "" },
      source: { type: String, default: "manual" },
      sellerOrgId: { type: String, default: "", index: true },
      /** Importer / ERP SKU (e.g. AP-CAN-5L). */
      externalSku: { type: String, default: "", sparse: true, index: true },
      /** Specs, MOQ rules, delivery terms from structured imports (JSON). */
      catalogMeta: { type: Schema.Types.Mixed },
    },
    embedding: [{ type: Number }],
  },
  { timestamps: true },
);

ProductSchema.index({ name: "text", description: "text", category: "text", tags: "text" });

export type ProductDoc = InferSchemaType<typeof ProductSchema>;
export const ProductModel = models?.Product || model("Product", ProductSchema);
