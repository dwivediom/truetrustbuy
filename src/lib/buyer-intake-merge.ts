import { connectDb } from "@/lib/db";
import { BuyerIntakeModel } from "@/lib/models/BuyerIntake";
import { UserModel } from "@/lib/models/User";

/** Apply guest intake preferences to User after login; idempotent per intake doc. */
export async function mergeGuestIntakeForUser(userId: string, guestToken: string | null) {
  if (!guestToken) return { merged: false as const };
  await connectDb();
  const intake = await BuyerIntakeModel.findOne({ guestToken }).lean<{
    _id: unknown;
    mergedUserId?: string;
    preferredLanguage?: string;
    contactPhone?: string;
  } | null>();
  if (!intake || intake.mergedUserId) return { merged: false as const };

  const updates: Record<string, unknown> = {};
  if (intake.preferredLanguage?.trim()) {
    updates.preferredLanguage = intake.preferredLanguage.trim().slice(0, 16);
  }
  if (intake.contactPhone?.trim()) {
    updates.phone = intake.contactPhone.trim().slice(0, 24);
  }
  if (Object.keys(updates).length > 0) {
    await UserModel.updateOne({ _id: userId }, { $set: updates });
  }
  await BuyerIntakeModel.updateOne(
    { _id: intake._id },
    { $set: { mergedUserId: userId } },
  );
  return { merged: true as const };
}
