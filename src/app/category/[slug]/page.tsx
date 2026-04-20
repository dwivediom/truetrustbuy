import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { connectDb } from "@/lib/db";
import { ProductModel } from "@/lib/models/Product";
import { slugifyCategory } from "@/lib/slug";
import { absoluteUrl } from "@/lib/site-url";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  await connectDb();
  const all = (await ProductModel.distinct("category")) as string[];
  const resolvedName = all.find((c) => slugifyCategory(c) === slug) ?? null;
  if (!resolvedName) {
    return { title: "Category | TrueTrustBuy" };
  }
  const title = `${resolvedName} — B2B wholesale suppliers | TrueTrustBuy`;
  const description = `Browse wholesale ${resolvedName} listings from verified sellers. Compare MOQ, pricing, and chat with suppliers on TrueTrustBuy.`;
  const url = absoluteUrl(`/category/${slug}`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
  };
}

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let products: Array<{
    _id: unknown;
    name: string;
    category: string;
    pricing?: { amount: number; currency: string };
  }> = [];
  let resolvedName: string | null = null;
  let error: string | null = null;

  try {
    await connectDb();
    const all = (await ProductModel.distinct("category")) as string[];
    resolvedName = all.find((c) => slugifyCategory(c) === slug) ?? null;
  } catch (e) {
    error = e instanceof Error ? e.message : "Database error.";
  }

  if (!error && !resolvedName) notFound();

  if (!error && resolvedName) {
    try {
      products = (await ProductModel.find({ category: resolvedName })
        .select("name category pricing")
        .sort({ updatedAt: -1 })
        .limit(48)
        .lean()) as unknown as typeof products;
    } catch (e) {
      error = e instanceof Error ? e.message : "Database error.";
    }
  }

  if (error) {
    return (
      <SiteChrome>
        <main className="mx-auto max-w-5xl px-6 py-12">
          <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p>
        </main>
      </SiteChrome>
    );
  }

  if (!resolvedName) notFound();

  const searchQ = encodeURIComponent(`wholesale ${resolvedName} India`);

  return (
    <SiteChrome>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <nav className="text-sm font-medium text-slate-500">
          <Link href="/categories" className="text-brand-600 hover:underline">
            Categories
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900">{resolvedName}</span>
        </nav>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          {resolvedName}
        </h1>
        <p className="mt-2 max-w-2xl text-lg font-medium text-slate-600">
          Verified-style listings in this category. Open a product to copy its ID for buyer chat, or run a
          long-tail search for MOQ and city constraints.
        </p>
        <div className="mt-6">
          <Link
            href={`/search?q=${searchQ}`}
            className="inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
          >
            Search {resolvedName} with intent
          </Link>
        </div>

        {products.length === 0 ? (
          <p className="mt-10 text-slate-600">No products in this category yet.</p>
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
