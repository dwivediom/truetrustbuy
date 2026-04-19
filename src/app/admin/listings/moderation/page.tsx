import Link from "next/link";

export default function AdminListingsModerationPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/admin" className="text-sm font-semibold text-brand-600 hover:underline">
        ← Admin dashboard
      </Link>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">Listings moderation</h1>
      <p className="mt-2 max-w-2xl text-lg font-medium text-slate-600">
        Flagged listing queue is not implemented yet. Use product admin tools and bulk import for now.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/import"
          className="rounded-full border-2 border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-900 hover:border-brand-300"
        >
          Bulk import
        </Link>
      </div>
      <p className="mt-8 text-sm text-slate-500">
        Requirements: <code className="rounded bg-slate-100 px-1">doc/use-cases/admin-ops.md</code>
      </p>
    </main>
  );
}
