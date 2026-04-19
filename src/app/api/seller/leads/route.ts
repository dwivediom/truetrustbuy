import { requireRole } from "@/lib/authz";
import { computeSellerLeads } from "@/lib/seller/leads";

/** CRM pipeline + inbound guest intakes matched to catalog (seller-only; admin views use a seller account). */
export async function GET() {
  const access = await requireRole(["seller"]);
  if (!access.ok) return access.response;
  const sellerUserId = access.session.user.id;
  const data = await computeSellerLeads(sellerUserId);
  return Response.json(data);
}
