import { OrganizationModel } from "@/lib/models/Organization";
import { SellerVerificationModel } from "@/lib/models/SellerVerification";
import { UserModel } from "@/lib/models/User";
import type { SearchResultItem } from "@/lib/search/search-result-types";

/**
 * Fills `seller` on search/browse rows using Organization + verification state.
 */
export async function attachSellerSnapshots(items: SearchResultItem[]): Promise<SearchResultItem[]> {
  const sellerIds = [...new Set(items.map((x) => x.metadata?.sellerOrgId).filter(Boolean))] as string[];

  let userById = new Map<string, { name: string; orgId?: string }>();
  let orgById = new Map<string, { city?: string; isVerified?: boolean }>();
  const approvedSet = new Set<string>();

  if (sellerIds.length > 0) {
    const users = await UserModel.find({ _id: { $in: sellerIds } })
      .select("name orgId")
      .lean<Array<{ _id: unknown; name: string; orgId?: string }>>();
    userById = new Map(users.map((u) => [String(u._id), { name: u.name, orgId: u.orgId }]));

    const orgIds = [...new Set(users.map((u) => u.orgId).filter(Boolean))] as string[];
    if (orgIds.length > 0) {
      const orgs = await OrganizationModel.find({ _id: { $in: orgIds } })
        .select("city isVerified")
        .lean<Array<{ _id: unknown; city?: string; isVerified?: boolean }>>();
      orgById = new Map(orgs.map((o) => [String(o._id), { city: o.city, isVerified: o.isVerified }]));
    }

    const approvals = await SellerVerificationModel.find({
      sellerUserId: { $in: sellerIds },
      status: "approved",
    })
      .select("sellerUserId")
      .lean<Array<{ sellerUserId: string }>>();
    for (const a of approvals) approvedSet.add(a.sellerUserId);
  }

  return items.map((item) => {
    const sid = item.metadata?.sellerOrgId;
    if (!sid) return { ...item, seller: null };
    const u = userById.get(sid);
    const org = u?.orgId ? orgById.get(u.orgId) : undefined;
    const isVerified = Boolean(org?.isVerified) || approvedSet.has(sid);
    const location = org?.city?.trim() || undefined;
    return {
      ...item,
      seller: {
        userId: sid,
        name: u?.name ?? "Supplier",
        isVerified,
        location,
      },
    };
  });
}
