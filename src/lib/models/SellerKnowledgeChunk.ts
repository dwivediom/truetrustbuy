import { model, models, Schema } from "mongoose";

const SellerKnowledgeChunkSchema = new Schema(
  {
    sellerUserId: { type: String, required: true, index: true },
    sourceId: { type: String, required: true, index: true },
    sourceFilename: { type: String, required: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: [{ type: Number }],
  },
  { timestamps: true },
);

SellerKnowledgeChunkSchema.index({ sellerUserId: 1, sourceId: 1 });

export const SellerKnowledgeChunkModel =
  models.SellerKnowledgeChunk || model("SellerKnowledgeChunk", SellerKnowledgeChunkSchema);
