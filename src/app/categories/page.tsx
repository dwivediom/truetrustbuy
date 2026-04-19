import Link from "next/link";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { connectDb } from "@/lib/db";
import { ProductModel } from "@/lib/models/Product";
import { slugifyCategory } from "@/lib/slug";

export default async function CategoriesPage() {
  let categories: string[] = [];
  let error: string | null = null;
  try {
    await connectDb();
    categories = (await ProductModel.distinct("category")) as string[];
    categories = categories.filter(Boolean).sort((a, b) => a.localeCompare(b));
  } catch (e) {
    error = e instanceof Error ? e.message : "Database unavailable.";
  }

  return (
    <SiteChrome>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          Categories
        </h1>
        <p className="mt-2 max-w-2xl text-lg font-medium text-slate-600">
          Browse by product category. Each hub links to live listings in our catalog.
        </p>

        {error ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <strong className="font-semibold">Could not load categories.</strong> {error} Try{" "}
            <Link href="/search" className="font-semibold text-brand-700 underline">
              search
            </Link>{" "}
            instead.
          </div>
        ) : categories.length === 0 ? (
          <p className="mt-8 text-slate-600">
            No categories yet.{" "}
            <Link href="/search" className="font-semibold text-brand-600 hover:underline">
              Start with agentic search
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {categories.map((c) => (
              <li key={c}>
                <Link
                  href={`/category/${slugifyCategory(c)}`}
                  className="block rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700"
                >
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </SiteChrome>
  );
}
