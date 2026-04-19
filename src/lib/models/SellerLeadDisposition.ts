import { PIPELINE_STAGES } from "@/lib/leads/pipeline-stage";
import { model, models, Schema } from "mongoose";

/**
 * CRM row per seller per RFQ. RFQs remain global buyer records; disposition is seller-specific.
 * Authz: only sellers who already see the RFQ in computeSellerLeads may PATCH (overlap match).
 */

const SellerLeadDispositionSchema = new Schema(
  {
    sellerUserId: { type: String, required: true, index: true },
    rfqId: { type: Schema.Types.ObjectId, ref: "RFQ", required: true, index: true },
    pipelineStage: {
      type: String,
      enum: PIPELINE_STAGES,
      default: "new",
      index: true,
    },
    assignee: { type: String, default: "", maxlength: 200 },
    sellerNotes: { type: String, default: "", maxlength: 8000 },
    lastUpdatedBy: { type: String, default: "" },
  },
  { timestamps: true },
);

SellerLeadDispositionSchema.index({ sellerUserId: 1, rfqId: 1 }, { unique: true });

export const SellerLeadDispositionModel =
  models?.SellerLeadDisposition || model("SellerLeadDisposition", SellerLeadDispositionSchema);
