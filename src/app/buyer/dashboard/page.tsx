import { SiteChrome } from "@/components/layout/SiteChrome";
import Link from "next/link";

export default function BuyerDashboardPage() {
  return (
    <SiteChrome>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          Buyer dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-lg font-medium text-slate-600">
          Agent workspace, RFQs, and supplier discovery. Saved shortlists coming soon.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href="/buyer/chats"
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-brand-200"
          >
            <h2 className="font-bold text-slate-900">Agent workspace</h2>
            <p className="mt-2 text-sm font-medium text-slate-600">Chats with suppliers and AI-assisted context.</p>
          </Link>
          <Link
            href="/buyer/rfqs"
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-brand-200"
          >
            <h2 className="font-bold text-slate-900">RFQs</h2>
            <p className="mt-2 text-sm font-medium text-slate-600">View and track requests for quotation.</p>
          </Link>
          <Link
            href="/search"
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-brand-200"
          >
            <h2 className="font-bold text-slate-900">Search</h2>
            <p className="mt-2 text-sm font-medium text-slate-600">Long-tail intent and tier-aware results.</p>
          </Link>
          <Link
            href="/rfq/new"
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-brand-200"
          >
            <h2 className="font-bold text-slate-900">New RFQ</h2>
            <p className="mt-2 text-sm font-medium text-slate-600">Describe quantity, budget, and product need.</p>
          </Link>
        </div>
      </main>
    </SiteChrome>
  );
}
