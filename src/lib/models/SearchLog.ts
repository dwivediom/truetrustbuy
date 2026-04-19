import { model, models, Schema } from "mongoose";

const SearchLogSchema = new Schema(
  {
    query: { type: String, required: true, index: true },
    parsedIntent: { type: Schema.Types.Mixed, default: {} },
    resultCount: { type: Number, default: 0 },
    selectedProductId: { type: String, default: "" },
  },
  { timestamps: true },
);

export const SearchLogModel = models.SearchLog || model("SearchLog", SearchLogSchema);
