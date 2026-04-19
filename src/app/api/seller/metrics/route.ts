import { requireRole } from "@/lib/authz";
import { computeSellerMetrics } from "@/lib/seller/metrics";

export async function GET() {
  const access = await requireRole(["seller", "admin"]);
  if (!access.ok) return access.response;
  const sellerUserId = access.session.user.id;
  const metrics = await computeSellerMetrics(sellerUserId);
  return Response.json({ metrics });
}
