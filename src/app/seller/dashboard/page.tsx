import { SiteChrome } from "@/components/layout/SiteChrome";
import { auth } from "@/auth";
import { connectDb } from "@/lib/db";
import { ProductModel } from "@/lib/models/Product";
import { UserModel } from "@/lib/models/User";
import { computeSellerMetrics } from "@/lib/seller/metrics";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function SellerDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/seller/dashboard");
  }
  if (session.user.role !== "seller" && session.user.role !== "admin") {
    redirect("/");
  }

  await connectDb();
  const productCount = await ProductModel.countDocuments({
    "metadata.sellerOrgId": session.user.id,
  });
  const userRow = await UserModel.findById(session.user.id)
    .select("industryCategory gstin agentMode")
    .lean<{ industryCategory?: string; gstin?: string; agentMode?: string } | null>();

  const metrics = await computeSellerMetrics(session.user.id);

  const needsCatalog = productCount === 0;
  const needsVerification = !(userRow?.gstin?.trim());

  const links = [
    { href: "/seller/products", label: "Products", desc: "Catalog and search embeddings" },
    { href: "/seller/pricing-rules", label: "Tiered pricing", desc: "MOQ, tiers, lead time" },
    { href: "/seller/chatbot-knowledge", label: "Knowledge base", desc: "Brochures and specs for the agent" },
    { href: "/seller/agent-rules", label: "Agent rules", desc: "Policies and hard constraints" },
    { href: "/seller/inbox", label: "Inbox", desc: "Buyer conversations" },
    { href: "/seller/market-insights", label: "Market insights", desc: "Pricing signals from search" },
    { href: "/seller/settings", label: "Agent & language", desc: "Fine-tune instructions" },
    { href: "/seller/verification", label: "Trust verification", desc: "GST and documents" },
    { href: `/seller/${session.user.id}`, label: "Public storefront", desc: "Share your profile link" },
    { href: "/seller/leads", label: "Leads", desc: "RFQ-style demand" },
    {
      href: "/seller/buyer-requests",
      label: "Buyer requests",
      desc: "Contact & order intents from search chat",
    },
    { href: "/seller/profile-export", label: "Profile export", desc: "Download JSON bundle" },
  ];

  return (
    <SiteChrome>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          Command center
        </h1>
        <p className="mt-2 max-w-2xl text-lg font-medium text-slate-600">
          Welcome back, {session.user.name}. Manage your agentic profile, catalog, and buyer conversations.
        </p>

        {(needsCatalog || needsVerification) && (
          <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50/80 p-6">
            <h2 className="font-bold text-amber-950">Finish setup</h2>
            <ul className="mt-3 list-inside list-disc space-y-2 text-sm font-medium text-amber-950">
              {needsCatalog ? (
                <li>
                  Add at least one product so buyers can find you in search —{" "}
                  <Link href="/seller/products" className="font-bold underline">
                    Open products
                  </Link>
                  .
                </li>
              ) : null}
              {needsVerification ? (
                <li>
                  Submit GST and documents for your Trust badge —{" "}
                  <Link href="/seller/verification" className="font-bold underline">
                    Verification center
                  </Link>
                  .
                </li>
              ) : null}
            </ul>
          </div>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Agent posture</p>
            <p className="mt-2 text-xl font-extrabold text-slate-900">
              {userRow?.agentMode === "faq_only" ? "FAQ-first" : "Deal assist"}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-600">Change in registration flow or settings.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Live SKUs</p>
            <p className="mt-2 text-xl font-extrabold text-slate-900">{productCount}</p>
            <p className="mt-1 text-sm font-medium text-slate-600">Products visible to search.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Industry</p>
            <p className="mt-2 line-clamp-2 text-lg font-extrabold text-slate-900">
              {userRow?.industryCategory?.trim() || "—"}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-600">Used for discovery and matching.</p>
          </div>
        </div>

        <p className="mt-12 text-sm font-semibold uppercase tracking-wider text-slate-500">Agent performance</p>
        <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600">
          Conversation and AI usage across your storefront threads (handoff means a human took over).
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Conversations</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.conversationCount}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">All-time threads with buyers.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Human handoffs</p>
            <p className="mt-2 text-2xl font-extrabold text-amber-800">{metrics.handoffOpen}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Threads flagged for seller follow-up.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">AI replies</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.aiMessagesCount}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Assistant messages sent to buyers.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Your replies</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.sellerHumanMessagesCount}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Messages you sent as the seller.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Threads with AI</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{metrics.threadsWithAiActivity}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Distinct chats where the agent answered.</p>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Top buyer intent tokens</p>
          {metrics.topBuyerIntents.length === 0 ? (
            <p className="mt-3 text-sm font-medium text-slate-600">
              No overlapping open RFQs yet — add catalog coverage or wait for matched demand.
            </p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {metrics.topBuyerIntents.map((i) => (
                <li
                  key={i.phrase}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800"
                >
                  {i.phrase}{" "}
                  <span className="font-bold text-brand-700">×{i.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-brand-300"
              >
                <span className="font-bold text-slate-900">{l.label}</span>
                <span className="mt-1 block text-sm font-medium text-slate-600">{l.desc}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </SiteChrome>
  );
}
