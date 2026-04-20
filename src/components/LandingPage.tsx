"use client";

import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Bot,
  Calculator,
  Clock4,
  Factory,
  Languages,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const GHOST_PHRASES = [
  "Need 1000 glass bottles under ₹10 with Mumbai delivery...",
  "Find organic cotton suppliers with MOQ less than 500...",
  "Wholesale pharma-grade PET jars in Gujarat...",
  "Custom corrugated boxes for e-commerce in Bangalore...",
];

const TRENDING_SEARCHES: { label: string; q: string }[] = [
  { label: "Wholesale Glass Bottles under ₹20", q: "wholesale glass bottles under 20 rupees" },
  {
    label: "Organic Cotton T-shirts MOQ 100",
    q: "organic cotton t shirts MOQ 100",
  },
  { label: "Pharma-grade PET Jars in Gujarat", q: "pharma grade PET jars Gujarat" },
  {
    label: "Corrugated Boxes for E-commerce Bangalore",
    q: "corrugated boxes ecommerce packaging Bangalore",
  },
  {
    label: "Stainless Steel Fasteners Grade 304",
    q: "stainless steel fasteners grade 304 bulk",
  },
  {
    label: "Industrial Safety Helmets Bulk ISO Certified",
    q: "industrial safety helmets bulk ISO certified",
  },
];

const FOOTER_SEO_LINKS: { label: string; q: string }[] = [
  { label: "Glass Bottles Manufacturers", q: "glass bottles manufacturers bulk India" },
  { label: "Apparel Suppliers India", q: "apparel suppliers India wholesale" },
  { label: "Packaging Materials Wholesale", q: "packaging materials wholesale India" },
];

export default function LandingPage() {
  const [mainQuery, setMainQuery] = useState("");
  const [ghostPlaceholder, setGhostPlaceholder] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const ghostTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ghostIndexRef = useRef({ phrase: 0, char: 0, deleting: false });

  useEffect(() => {
    function tick() {
      const { phrase: i, char: j, deleting: isDeleting } = ghostIndexRef.current;
      const current = GHOST_PHRASES[i] ?? "";

      if (isDeleting) {
        setGhostPlaceholder(current.slice(0, Math.max(0, j - 1)));
        ghostIndexRef.current.char = j - 1;
      } else {
        setGhostPlaceholder(current.slice(0, j + 1));
        ghostIndexRef.current.char = j + 1;
      }

      let speed = isDeleting ? 30 : 60;
      let nextDeleting = isDeleting;

      if (!isDeleting && ghostIndexRef.current.char === current.length) {
        speed = 2500;
        nextDeleting = true;
      } else if (isDeleting && ghostIndexRef.current.char === 0) {
        nextDeleting = false;
        ghostIndexRef.current.phrase = (i + 1) % GHOST_PHRASES.length;
        speed = 500;
      }

      ghostIndexRef.current.deleting = nextDeleting;
      ghostTimeoutRef.current = setTimeout(tick, speed);
    }

    ghostTimeoutRef.current = setTimeout(tick, 1000);
    return () => {
      if (ghostTimeoutRef.current) clearTimeout(ghostTimeoutRef.current);
    };
  }, []);

  function goToSearch(query?: string) {
    const q = (query ?? mainQuery).trim();
    if (!q) {
      window.location.href = "/search";
      return;
    }
    window.location.href = `/search?q=${encodeURIComponent(q)}`;
  }

  return (
    <>
      <div className="noise-bg pointer-events-none" aria-hidden />

      <nav className="fixed top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 shadow-md transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105">
              <ShieldCheck className="h-5 w-5 text-white" aria-hidden />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              TrueTrust<span className="text-brand-600">Buy</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 text-[15px] font-medium text-slate-600 md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-brand-600">
              How it Works
            </a>
            <a href="#advantage" className="transition-colors hover:text-brand-600">
              Agentic Advantage
            </a>
            <a href="#trending" className="transition-colors hover:text-brand-600">
              Trending
            </a>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
            >
              Sign In
            </Link>
            <Link
              href="/register/seller"
              className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-600 hover:shadow-lg active:scale-95"
            >
              Join as Seller
            </Link>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-900 md:hidden"
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            <span className="text-lg leading-none">{mobileNavOpen ? "×" : "≡"}</span>
          </button>
        </div>

        {mobileNavOpen ? (
          <div className="border-t border-slate-200 bg-white px-6 py-4 md:hidden">
            <div className="flex flex-col gap-3 text-[15px] font-medium text-slate-700">
              <a href="#how-it-works" onClick={() => setMobileNavOpen(false)}>
                How it Works
              </a>
              <a href="#advantage" onClick={() => setMobileNavOpen(false)}>
                Agentic Advantage
              </a>
              <a href="#trending" onClick={() => setMobileNavOpen(false)}>
                Trending
              </a>
              <Link href="/login" onClick={() => setMobileNavOpen(false)}>
                Sign In
              </Link>
              <Link href="/register/seller" onClick={() => setMobileNavOpen(false)}>
                Join as Seller
              </Link>
            </div>
          </div>
        ) : null}
      </nav>

      <section className="landing-hero-bg relative overflow-hidden pb-20 pt-40 md:pb-32 md:pt-48">
        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-bold tracking-tight text-brand-700 shadow-sm">
            <Bot className="h-4 w-4 shrink-0" aria-hidden />
            Powered by Agentic Search
          </div>

          <h1 className="mb-6 mx-auto text-5xl font-extrabold leading-[1.1] tracking-tighter text-slate-900 md:text-7xl">
            Don&apos;t just search for suppliers.{" "}
            <span className="bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
              Find the exact deal.
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-2xl text-lg font-medium leading-relaxed text-slate-600 md:text-xl">
            The first B2B marketplace where AI assists with matching price, volume, and
            specifications in real time. Speak in your language; suppliers respond in
            theirs—with tier-aware context before you escalate to a human.
          </p>

          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
            <div className="group relative w-full">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-6">
                <Sparkles className="h-6 w-6 animate-pulse text-brand-500" aria-hidden />
              </div>
              <input
                id="mainSearch"
                type="search"
                value={mainQuery}
                onChange={(e) => setMainQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") goToSearch();
                }}
                className="w-full rounded-full border-2 border-slate-200 bg-white py-5 pl-16 pr-40 text-lg text-slate-900 shadow-xl outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-brand-500 focus:shadow-2xl md:py-6"
                placeholder={ghostPlaceholder}
                autoComplete="off"
                aria-label="Describe what you want to source"
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                <button
                  type="button"
                  onClick={() => goToSearch()}
                  className="flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 font-bold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-600 active:scale-95 md:py-4"
                >
                  Find Deal <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500">
              Try a long-tail query like{" "}
              <span className="italic text-slate-700">
                &quot;Need 500 PET jars in Gujarat under ₹15&quot;
              </span>
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white p-4 text-left shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                <Zap className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Response velocity
                </p>
                <p className="text-lg font-extrabold text-slate-900">1.2s avg agent response</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white p-4 text-left shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Target className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Price accuracy
                </p>
                <p className="text-lg font-extrabold text-slate-900">99% tier match rate</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white p-4 text-left shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                <ShieldCheck className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  E-E-A-T signal
                </p>
                <p className="text-lg font-extrabold text-slate-900">TrueTrust Shield</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-7xl scroll-mt-28 px-6 py-20 md:py-28"
      >
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            How it works
          </h2>
          <p className="text-lg font-medium text-slate-600">
            Natural language in → structured intent out → shortlist you can act on—without the
            directory scroll.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Search className="h-7 w-7" aria-hidden />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">Query</h3>
            <p className="font-medium leading-relaxed text-slate-600">
              Describe constraints—price, MOQ, city, spec. The parser extracts what matters for
              B2B matching.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Bot className="h-7 w-7" aria-hidden />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">Agent match</h3>
            <p className="font-medium leading-relaxed text-slate-600">
              Rankings factor tiers, lead time, and verification—not just keyword overlap—so you
              see suppliers who can actually fulfill.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <MessageCircle className="h-7 w-7" aria-hidden />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">Instant chat &amp; RFQ</h3>
            <p className="font-medium leading-relaxed text-slate-600">
              Open a thread or raise an RFQ with context already attached. Escalate to the seller
              when you&apos;re ready.
            </p>
          </div>
        </div>
      </section>

      <section id="advantage" className="mx-auto max-w-7xl scroll-mt-28 px-6 pb-24">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
            The Agentic Advantage
          </h2>
          <p className="text-lg font-medium text-slate-600">
            Traditional directories give you a phone number. Our assistant frames parameters—in
            volume, tier pricing, and specs—before you waste time on misfit leads.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="group rounded-3xl border border-slate-200 bg-white p-8 transition-all hover:border-brand-200 hover:shadow-xl">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition-transform group-hover:scale-110">
              <Languages className="h-7 w-7" aria-hidden />
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Zero-language barrier</h3>
            <p className="font-medium leading-relaxed text-slate-600">
              Speak in your language; the agent keeps technical manufacturing language consistent
              for sellers so MOQ, specs, and tolerances don&apos;t get lost in translation.
            </p>
          </div>

          <div className="group rounded-3xl border border-slate-200 bg-white p-8 transition-all hover:border-brand-200 hover:shadow-xl">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition-transform group-hover:scale-110">
              <Calculator className="h-7 w-7" aria-hidden />
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">Real-time tier matching</h3>
            <p className="font-medium leading-relaxed text-slate-600">
              Pricing rules reflect your volume band and delivery context—so you see bracket-level
              fit instead of a generic catalog price.
            </p>
          </div>

          <div className="group rounded-3xl border border-slate-200 bg-white p-8 transition-all hover:border-brand-200 hover:shadow-xl">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 transition-transform group-hover:scale-110">
              <Clock4 className="h-7 w-7" aria-hidden />
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900">24/7 virtual front desk</h3>
            <p className="font-medium leading-relaxed text-slate-600">
              For manufacturers, assistants qualify buyers on specs and MOQ around the clock—so
              your team talks to threads that are actually ready to close.
            </p>
          </div>
        </div>
      </section>

      <section id="trending" className="scroll-mt-28 border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900">Trending agentic searches</h2>
            <p className="mt-2 text-slate-600">
              Explore searches buyers are running—each link opens results with that intent.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {TRENDING_SEARCHES.map(({ label, q }) => (
              <Link
                key={q}
                href={`/search?q=${encodeURIComponent(q)}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-500 hover:text-brand-600 hover:shadow-md"
              >
                <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                {label}
              </Link>
            ))}
          </div>

          <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center gap-3 text-brand-600">
              <Activity className="h-5 w-5 shrink-0" aria-hidden />
              <h4 className="font-bold text-slate-900">Live pulse</h4>
            </div>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Recently fulfilled:</span> a
              Bangalore team used TrueTrust matching to shortlist a verified Firozabad
              manufacturer for 5,000 custom 300ml amber bottles near tier pricing they could act on
              immediately.
            </p>
          </div>
        </div>
      </section>

      <section id="manufacturer-cta" className="scroll-mt-28 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 px-8 py-16 text-center shadow-2xl md:px-16 md:py-20">
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" aria-hidden />
            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl" aria-hidden />

            <div className="relative z-10">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
                <Factory className="h-8 w-8 text-white" aria-hidden />
              </div>
              <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-white md:text-5xl">
                Turn your catalog into an{" "}
                <span className="block md:inline">AI-assisted sales desk.</span>
              </h2>
              <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-300">
                Stop repeating MOQ and tier tables in DMs. Surface rules, lead time, and FAQs to
                buyers automatically—then take over when the deal is ready.
              </p>
              <Link
                href="/register/seller"
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-slate-900 transition hover:scale-105 hover:bg-brand-50 hover:text-brand-600"
              >
                Go live in 10 minutes <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              <p className="mt-4 text-sm text-slate-400">
                Automated tiered pricing · Instant buyer qualification
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-12 text-sm font-medium text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <ShieldCheck className="h-6 w-6 text-slate-900" aria-hidden />
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              TrueTrust<span className="text-brand-600">Buy</span>
            </span>
            <span className="text-xs text-slate-400">© 2026</span>
          </div>

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2">
            {FOOTER_SEO_LINKS.map(({ label, q }) => (
              <Link
                key={q}
                href={`/search?q=${encodeURIComponent(q)}`}
                className="transition-colors hover:text-brand-600"
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            <a href="#" className="transition-colors hover:text-slate-900">
              Terms
            </a>
            <a href="#" className="transition-colors hover:text-slate-900">
              Privacy
            </a>
            <Link href="/register/seller" className="font-bold text-slate-900 hover:text-brand-600">
              For Sellers
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
