import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { connectDb } from "@/lib/db";
import { OrganizationModel } from "@/lib/models/Organization";
import { ProductModel } from "@/lib/models/Product";
import { SellerVerificationModel } from "@/lib/models/SellerVerification";
import { UserModel } from "@/lib/models/User";
import { absoluteUrl } from "@/lib/site-url";
import { Metadata } from "next";
import { Types } from "mongoose";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!Types.ObjectId.isValid(slug)) {
    return { title: "Supplier" };
  }
  await connectDb();
  const u = await UserModel.findOne({ _id: slug, role: "seller" })
    .select("name orgId industryCategory")
    .lean<{ name: string; orgId?: string; industryCategory?: string } | null>();
  if (!u) return { title: "Supplier" };
  let orgName = "";
  if (u.orgId && Types.ObjectId.isValid(u.orgId)) {
    const org = await OrganizationModel.findById(u.orgId)
      .select("name industryCategory isVerified")
      .lean<{ name?: string; industryCategory?: string } | null>();
    orgName = org?.name?.trim() ?? "";
  }
  const industry = u.industryCategory?.trim() || "";
  const titleBase = orgName || u.name;
  const title = industry ? `${titleBase} · ${industry}` : titleBase;
  const description = `Verified B2B supplier storefront for ${u.name}${industry ? ` in ${industry}` : ""}. Browse SKUs and start a guided chat.`;

  const url = absoluteUrl(`/seller/${slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "website",
      url,
    },
  };
}

export default async function SellerStorefrontPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!Types.ObjectId.isValid(slug)) notFound();

  let seller: { name: string; email: string; orgId?: string; industryCategory?: string } | null = null;
  let products: Array<{ _id: unknown; name: string; pricing?: { amount: number; currency: string } }> = [];
  let verified = false;

  await connectDb();
  const u = await UserModel.findOne({ _id: slug, role: "seller" })
    .select("name email role orgId industryCategory")
    .lean<{ name: string; email: string; orgId?: string; industryCategory?: string } | null>();
  if (!u) notFound();
  seller = u;

  if (u.orgId && Types.ObjectId.isValid(u.orgId)) {
    const org = await OrganizationModel.findById(u.orgId)
      .select("isVerified")
      .lean<{ isVerified?: boolean } | null>();
    if (org?.isVerified) verified = true;
  }

  const sv = await SellerVerificationModel.findOne({ sellerUserId: slug })
    .select("status")
    .lean<{ status?: string } | null>();
  if (sv?.status === "approved") verified = true;

  products = (await ProductModel.find({ "metadata.sellerOrgId": slug })
    .select("name pricing")
    .sort({ updatedAt: -1 })
    .limit(48)
    .lean()) as unknown as typeof products;

  return (
    <SiteChrome>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{seller.name}</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">Supplier workspace (public storefront)</p>
            {seller.industryCategory?.trim() ? (
              <p className="mt-3 text-base font-semibold text-slate-700">{seller.industryCategory}</p>
            ) : null}
          </div>
          {verified ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-emerald-900 ring-1 ring-emerald-200">
              Verified supplier
            </span>
          ) : null}
        </div>

        <p className="mt-6 max-w-2xl text-lg font-medium text-slate-600">
          Listings published by this seller for agentic search and RFQ. Start a chat from any product page, or
          search this supplier&apos;s catalog.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/search?q=${encodeURIComponent(`${seller.name} supplier catalog`)}`}
            className="inline-flex rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-brand-600"
          >
            Search catalog
          </Link>
          {products.length > 0 ? (
            <Link
              href={`/product/${String(products[0]._id)}`}
              className="inline-flex rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-900 hover:border-brand-400"
            >
              Start from a listing
            </Link>
          ) : null}
        </div>

        {products.length === 0 ? (
          <p className="mt-10 text-slate-600">No public products yet.</p>
        ) : (
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {products.map((p) => {
              const id = String(p._id);
              const price = p.pricing?.amount != null ? `${p.pricing.currency} ${p.pricing.amount}` : "—";
              return (
                <li key={id}>
                  <Link
                    href={`/product/${id}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-200"
                  >
                    <span className="font-bold text-slate-900">{p.name}</span>
                    <span className="mt-1 block text-sm text-slate-500">{price}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </SiteChrome>
  );
}
