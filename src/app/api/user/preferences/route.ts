import { requireRole } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { UserModel } from "@/lib/models/User";
import { z } from "zod";

const patchSchema = z
  .object({
    preferredLanguage: z.string().min(2).max(16).optional(),
    agentInstructions: z.string().max(10000).optional(),
    phone: z.string().max(24).optional(),
    phoneNotifyConsent: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "At least one field required" });

export async function PATCH(request: Request) {
  const access = await requireRole(["buyer", "seller", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = { ...parsed.data } as Record<string, unknown>;
  if (parsed.data.preferredLanguage != null) {
    data.languageExplicitAt = new Date();
  }
  await UserModel.updateOne({ _id: access.session.user.id }, { $set: data });
  return Response.json({ ok: true });
}
