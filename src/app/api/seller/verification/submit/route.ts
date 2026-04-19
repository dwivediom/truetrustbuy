import { requireRole } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { SellerVerificationModel } from "@/lib/models/SellerVerification";
import { z } from "zod";

const schema = z.object({
  orgId: z.string().min(1),
  gstin: z.string().min(10),
  documents: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  const access = await requireRole(["seller", "admin"]);
  if (!access.ok) return access.response;
  await connectDb();
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const record = await SellerVerificationModel.findOneAndUpdate(
    { sellerUserId: access.session.user.id },
    {
      sellerUserId: access.session.user.id,
      orgId: parsed.data.orgId,
      gstin: parsed.data.gstin,
      documents: parsed.data.documents,
      status: "pending",
    },
    { upsert: true, new: true },
  );
  return Response.json({ verification: record });
}

