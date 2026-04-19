import { model, models, Schema } from "mongoose";

const AdminActionSchema = new Schema(
  {
    adminUserId: { type: String, required: true, index: true },
    actionType: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String, required: true },
    note: { type: String, default: "" },
  },
  { timestamps: true },
);

export const AdminActionModel = models.AdminAction || model("AdminAction", AdminActionSchema);
