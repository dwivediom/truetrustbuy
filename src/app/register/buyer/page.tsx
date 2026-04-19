import Link from "next/link";
import { SiteChrome } from "@/components/layout/SiteChrome";

export default function RegisterBuyerPage() {
  return (
    <SiteChrome>
      <main className="mx-auto max-w-2xl px-6 py-16">
        <span className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-brand-900">
          First-time buyers — start here
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          Register as a buyer
        </h1>
        <p className="mt-4 text-lg font-medium text-slate-600">
          Same sign-in page as everyone else once your account exists. Until full self-serve signup ships,
          use your team&apos;s seeding flow or internal registration—then sign in with email + password.
        </p>
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-900">What you will get</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 font-medium text-slate-600">
            <li>Agentic search and tier-aware supplier shortlists</li>
            <li>Buyer chats and RFQ creation</li>
            <li>Dashboard hub (saved flows coming soon)</li>
          </ul>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-brand-600"
          >
            Sign in
          </Link>
          <Link
            href="/search"
            className="inline-flex justify-center rounded-full border-2 border-slate-200 px-6 py-3 text-sm font-bold text-slate-900 hover:border-brand-300"
          >
            Try search first
          </Link>
        </div>
        <p className="mt-8 text-sm text-slate-500">
          Engineers: see <code className="rounded bg-slate-100 px-1">doc/inventory.md</code> and{" "}
          <code className="rounded bg-slate-100 px-1">doc/use-cases/buyer-journey.md</code> in the repo.
        </p>
      </main>
    </SiteChrome>
  );
}
