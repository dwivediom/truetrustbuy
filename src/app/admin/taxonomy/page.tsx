import Link from "next/link";

export default function AdminTaxonomyPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/admin" className="text-sm font-semibold text-brand-600 hover:underline">
        ← Admin dashboard
      </Link>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">Taxonomy</h1>
      <p className="mt-2 max-w-2xl text-lg font-medium text-slate-600">
        Category and facet management UI is a stub. Categories today are derived from product documents (
        <Link href="/categories" className="font-semibold text-brand-600 hover:underline">
          public hub
        </Link>
        ).
      </p>
    </main>
  );
}
