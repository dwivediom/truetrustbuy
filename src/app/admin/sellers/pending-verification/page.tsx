import Link from "next/link";

export default function AdminPendingVerificationsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/admin" className="text-sm font-semibold text-brand-600 hover:underline">
        ← Admin dashboard
      </Link>
      <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">Pending seller verification</h1>
      <p className="mt-2 max-w-2xl text-lg font-medium text-slate-600">
        Review UI is not built yet. Approve or reject with admin session — see{" "}
        <code className="rounded bg-slate-100 px-1 text-sm">doc/api/curl-recipes.md</code> (
        <code className="rounded bg-slate-100 px-1">/api/admin/verification/[id]/approve</code>).
      </p>
    </main>
  );
}
