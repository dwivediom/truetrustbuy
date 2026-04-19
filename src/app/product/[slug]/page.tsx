import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { connectDb } from "@/lib/db";
import { ProductModel } from "@/lib/models/Product";
import { slugifyCategory } from "@/lib/slug";
import { Types } from "mongoose";

type ProductLean = {
  _id: unknown;
  name: string;
  description: string;
  category: string;
  images?: string[];
  tags?: string[];
  pricing: { amount: number; currency: string; billingPeriod: string };
  metadata?: { sellerOrgId?: string; website?: string };
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!Types.ObjectId.isValid(slug)) notFound();

  let product: ProductLean | null = null;

  try {
    await connectDb();
    const raw = await ProductModel.findById(slug).lean();
    product = raw ? (raw as unknown as ProductLean) : null;
  } catch {
    notFound();
  }

  if (!product) notFound();

  const id = String(product._id);
  const sellerId = product.metadata?.sellerOrgId?.trim();

  return (
    <SiteChrome>
      <main className="mx-auto max-w-3xl px-6 py-12">
        <nav className="text-sm font-medium text-slate-500">
          <Link href="/categories" className="text-brand-600 hover:underline">
            Categories
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/category/${slugifyCategory(product.category)}`}
            className="text-brand-600 hover:underline"
          >
            {product.category}
          </Link>
        </nav>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          {product.name}
        </h1>
        <p className="mt-2 text-2xl font-extrabold text-brand-700">
          {product.pricing.currency} {product.pricing.amount}
          <span className="ml-2 text-sm font-medium text-slate-500">/ {product.pricing.billingPeriod}</span>
        </p>

        {product.images && product.images.length > 0 ? (
          <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.images[0]}
              alt=""
              className="aspect-[4/3] w-full object-cover sm:aspect-[21/9]"
              loading="eager"
            />
          </div>
        ) : null}

        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Description</h2>
          <p className="mt-2 whitespace-pre-wrap font-medium leading-relaxed text-slate-600">
            {product.description}
          </p>
          {product.tags && product.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={`/search?q=${encodeURIComponent(`${product.name} ${product.category}`)}`}
            className="inline-flex justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-brand-600"
          >
            Similar deals (search)
          </Link>
          {sellerId ? (
            <Link
              href={`/seller/${sellerId}`}
              className="inline-flex justify-center rounded-full border-2 border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-900 hover:border-brand-300"
            >
              View supplier
            </Link>
          ) : null}
          <Link
            href={`/buyer/chats`}
            className="inline-flex justify-center rounded-full border-2 border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-900 hover:border-brand-300"
          >
            Open chats (use product ID: {id.slice(-6)}…)
          </Link>
          <Link
            href={`/rfq/new?prefill=${encodeURIComponent(product.name)}`}
            className="inline-flex justify-center rounded-full border-2 border-brand-200 bg-brand-50 px-6 py-3 text-sm font-bold text-brand-800 hover:bg-brand-100"
          >
            Start RFQ from this product
          </Link>
        </div>
        <p className="mt-4 font-mono text-xs text-slate-400">Product ID: {id}</p>
      </main>
    </SiteChrome>
  );
}
