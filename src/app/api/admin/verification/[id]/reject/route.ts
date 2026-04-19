import { requireAdmin } from "@/lib/authz";
import { connectDb } from "@/lib/db";
import { AdminActionModel } from "@/lib/models/AdminAction";
import { OrganizationModel } from "@/lib/models/Organization";
import { SellerVerificationModel } from "@/lib/models/SellerVerification";
import { z } from "zod";

const schema = z.object({ note: z.string().default("") });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin();
  if (!access.ok) return access.response;
  await connectDb();
  const { id } = await params;
  const body = schema.parse(await request.json().catch(() => ({})));
  const verification = await SellerVerificationModel.findByIdAndUpdate(
    id,
    { status: "rejected", reviewedBy: access.session.user.id, reviewNote: body.note },
    { new: true },
  ).lean<{ _id: string; orgId: string } | null>();
  if (!verification) return Response.json({ error: "Verification not found" }, { status: 404 });
  await OrganizationModel.findByIdAndUpdate(verification.orgId, { isVerified: false });
  await AdminActionModel.create({
    adminUserId: access.session.user.id,
    actionType: "verification_rejected",
    targetType: "sellerVerification",
    targetId: id,
    note: body.note,
  });
  return Response.json({ verification });
}

