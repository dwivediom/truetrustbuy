import { requireRole } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { PricingInsightAlertModel } from "@/lib/models/PricingInsightAlert";
import { z } from "zod";

export async function GET() {
  const access = await requireRole(["seller", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const filter =
    access.role === "admin" ? { dismissed: false } : { sellerUserId: access.session.user.id, dismissed: false };
  const alerts = await PricingInsightAlertModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return Response.json({ alerts });
}

const patchSchema = z.object({
  id: z.string().min(1),
  dismissed: z.boolean(),
});

export async function PATCH(request: Request) {
  const access = await requireRole(["seller", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  const filter: Record<string, unknown> = { _id: parsed.data.id };
  if (access.role !== "admin") {
    filter.sellerUserId = access.session.user.id;
  }
  const res = await PricingInsightAlertModel.updateOne(filter, {
    $set: { dismissed: parsed.data.dismissed },
  });
  if (res.matchedCount === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
