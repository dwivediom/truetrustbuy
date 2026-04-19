import { model, models, Schema, type InferSchemaType } from "mongoose";

const ImportJobSchema = new Schema(
  {
    createdBy: { type: String, required: true },
    total: { type: Number, required: true },
    succeeded: { type: Number, required: true },
    failed: { type: Number, required: true },
    errorRows: [
      {
        row: { type: Number, required: true },
        reason: { type: String, required: true },
      },
    ],
  },
  { timestamps: true },
);

export type ImportJobDoc = InferSchemaType<typeof ImportJobSchema>;
export const ImportJobModel = models.ImportJob || model("ImportJob", ImportJobSchema);
