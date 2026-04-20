"use client";

import {
  seoIntroForSeed,
  searchHeadlineForSeed,
  tierHighlightFor,
  tierLabel,
  titleCasePhrase,
} from "@/components/search/search-display-utils";
import { ASSISTANT_NAME } from "@/lib/brand/assistant";
import {
  CHOOSE_LANGUAGE_LINE,
  PRESET_LANGS,
  type PresetLang,
} from "@/components/buyer/buyer-intake-copy";
import { BuyerIntakeGate } from "@/components/buyer/BuyerIntakeGate";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { buildSupplierIntentSummary, type IntentSnapshot } from "@/lib/buyer/contact-summary";
import {
  Bot,
  Building2,
  Filter,
  IndianRupee,
  Languages,
  MapPin,
  MessageCircle,
  MessageSquare,
  Package,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { absoluteUrl } from "@/lib/site-url";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type SearchIntent = {
  productType?: string;
  category?: string;
  maxUnitPrice?: number;
  quantity?: number;
  location?: string;
  verifiedOnly?: boolean;
  delivery_by?: string;
  searchIntent?: string;
  customizations?: string[];
  raw?: string;
};

type TierMatch = {
  effectiveQuantity: number;
  unitPrice: number;
  total: number;
  moq: number;
  belowMoq: boolean;
  missingPricingRule: boolean;
  leadTimeDays?: number;
};

type SellerSnap = {
  userId: string;
  name: string;
  isVerified: boolean;
  location?: string;
};

type TierBand = {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
};

type ResultItem = {
  _id: string;
  name: string;
  description: string;
  category: string;
  images?: string[];
  tags?: string[];
  useCases?: string[];
  customizationAvailable?: boolean;
  pricing: { amount: number; billingPeriod: string; currency: string };
  tierMatch: TierMatch | null;
  missingPricingRule: boolean;
  tierBands: TierBand[];
  displayMoq: number;
  pricingCurrency: string;
  seller: SellerSnap | null;
};

type ChatMsg = {
  id: number;
  text: string;
  sender: "user" | "agent";
  /** Specialist name label (never “AI”). */
  fromAssistant?: boolean;
};

type BuyerIntakeApi = {
  intake: {
    preferredLanguage: string;
    customLanguage?: string;
    explicitLanguageAt: string | null;
    contactEmail?: string;
    contactPhone?: string;
  } | null;
  userLanguageExplicitAt: string | null;
};

function intentSnapshotFromSearch(i: SearchIntent | null): IntentSnapshot | null {
  if (!i) return null;
  return {
    productType: i.productType,
    quantity: i.quantity,
    maxUnitPrice: i.maxUnitPrice,
    location: i.location,
    category: i.category,
    verifiedOnly: i.verifiedOnly,
    raw: i.raw ?? i.searchIntent,
  };
}

function buildChatExcerpt(messages: ChatMsg[], maxChars = 500): string {
  const tail = messages.slice(-14);
  const joined = tail
    .map((m) => `${m.sender === "user" ? "Buyer" : ASSISTANT_NAME}: ${m.text}`)
    .join("\n");
  return joined.slice(-maxChars);
}

function intentCtaLabels(replyLang: string): { confirm: string; callback: string } {
  const p = replyLang.trim().split(/[-_]/)[0]?.toLowerCase() ?? "en";
  if (p === "hi") {
    return {
      confirm: "ऑर्डर की पुष्टि करें",
      callback: "विक्रेता कॉलबैक चाहिए",
    };
  }
  return {
    confirm: "Confirm your order",
    callback: "Ask seller to contact back",
  };
}

export type SearchViewProps = {
  /** From `/search/[slug]` — URL `?q=` wins when both exist. */
  prefilledQuery?: string;
  /** Server-rendered search results (slug pages) to avoid duplicate API calls. */
  initialSearchSnapshot?: {
    results: ResultItem[];
    intent: SearchIntent | null;
  };
};

export type SearchViewInnerProps = SearchViewProps & {
  /** SSR listing + empty state HTML injected before hydration (slug/base browse). */
  resultsSlot?: ReactNode;
  /** SSR H1 + intro when keyword pages should not rely on client for headings. */
  headerSlot?: ReactNode;
};

export function SearchViewInner(props: SearchViewInnerProps = {}) {
  const { prefilledQuery, initialSearchSnapshot, resultsSlot, headerSlot } = props;
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q")?.trim() ?? "";
  const resolvedSeed = urlQ || (prefilledQuery?.trim() ?? "");
  const { data: session, status: sessionStatus } = useSession();

  const [q, setQ] = useState(resolvedSeed);
  const [intent, setIntent] = useState<SearchIntent | null>(
    () => initialSearchSnapshot?.intent ?? null,
  );
  const [results, setResults] = useState<ResultItem[]>(() => initialSearchSnapshot?.results ?? []);
  const [loading, setLoading] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const [error, setError] = useState("");

  const [chatOpen, setChatOpen] = useState(false);
  const [chatProductId, setChatProductId] = useState("");
  const [chatSellerName, setChatSellerName] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [guestChatBlocked, setGuestChatBlocked] = useState(false);

  /** explicitLanguageAt or buyer account languageExplicitAt via API — skip supplier-chat language gate when set. */
  const [buyerIntakeApi, setBuyerIntakeApi] = useState<BuyerIntakeApi | null>(null);
  const [supplierPanelProduct, setSupplierPanelProduct] = useState<ResultItem | null>(null);
  /** `language`: pick language before messaging; `chat`: thread ready. */
  const [supplierChatPhase, setSupplierChatPhase] = useState<"language" | "chat">("chat");
  const [replyLanguage, setReplyLanguage] = useState("en");
  const [languageGatePreset, setLanguageGatePreset] = useState<PresetLang | "other">("en");
  const [languageGateCustom, setLanguageGateCustom] = useState("");
  const [languageGateBusy, setLanguageGateBusy] = useState(false);

  const [intentModal, setIntentModal] = useState<null | "order_confirm" | "callback_request">(null);
  const [intentContactEmail, setIntentContactEmail] = useState("");
  const [intentContactPhone, setIntentContactPhone] = useState("");
  const [intentSubmitting, setIntentSubmitting] = useState(false);

  const serverSnapshotConsumed = useRef(false);
  /** After explicit client search, hide SSR slot and show interactive list + loading states. */
  const [hasClientSupersededSsr, setHasClientSupersededSsr] = useState(false);

  const showSsrListing = Boolean(resultsSlot && !hasClientSupersededSsr);

  const overrides = useMemo(
    () => ({
      maxUnitPrice: intent?.maxUnitPrice,
      quantity: intent?.quantity,
      location: intent?.location,
      verifiedOnly: intent?.verifiedOnly,
      category: intent?.category,
      delivery_by: intent?.delivery_by,
      searchIntent: intent?.searchIntent === "rfq" ? ("rfq" as const) : ("discovery" as const),
      customizations: intent?.customizations,
    }),
    [intent],
  );

  const runParse = useCallback(async (text: string) => {
    if (!text.trim()) {
      setIntent(null);
      return;
    }
    setParseLoading(true);
    try {
      const res = await fetch("/api/search/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { intent: SearchIntent };
      setIntent(data.intent);
    } finally {
      setParseLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void runParse(q);
    }, 450);
    return () => clearTimeout(t);
  }, [q, runParse]);

  const runSearch = useCallback(async () => {
    if (!q.trim()) return;
    setHasClientSupersededSsr(true);
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/search/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q,
          overrides: {
            maxUnitPrice: overrides.maxUnitPrice,
            quantity: overrides.quantity,
            location: overrides.location,
            verifiedOnly: overrides.verifiedOnly,
            category: overrides.category,
            delivery_by: overrides.delivery_by,
            searchIntent: overrides.searchIntent,
            customizations: overrides.customizations,
          },
        }),
      });
      if (!res.ok) {
        setError("Search failed.");
        return;
      }
      const data = (await res.json()) as { results: ResultItem[]; intent: SearchIntent };
      setResults(data.results);
      setIntent(data.intent);
    } finally {
      setLoading(false);
    }
  }, [q, overrides]);

  useEffect(() => {
    setQ(resolvedSeed);
  }, [resolvedSeed]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!resolvedSeed.trim()) {
        if (resultsSlot) {
          return;
        }
        setLoading(true);
        setError("");
        try {
          const res = await fetch("/api/public/search/browse?limit=10");
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as { results?: ResultItem[] };
          setResults(data.results ?? []);
          setIntent(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      if (
        initialSearchSnapshot &&
        !serverSnapshotConsumed.current &&
        resolvedSeed === (prefilledQuery?.trim() ?? "")
      ) {
        serverSnapshotConsumed.current = true;
        return;
      }

      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/search/results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: resolvedSeed, overrides: {} }),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { results: ResultItem[]; intent: SearchIntent };
        setResults(data.results);
        setIntent(data.intent);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedSeed, initialSearchSnapshot, prefilledQuery, resultsSlot]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (!session?.user?.id) return;
    void fetch("/api/user/merge-guest-intake", {
      method: "POST",
      credentials: "include",
    });
  }, [session?.user?.id]);

  const loadBuyerIntake = useCallback(async () => {
    try {
      const res = await fetch("/api/public/buyer-intake", { credentials: "include" });
      if (!res.ok) return null;
      const data = (await res.json()) as BuyerIntakeApi;
      setBuyerIntakeApi(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    void loadBuyerIntake();
  }, [loadBuyerIntake]);

  useEffect(() => {
    if (session?.user) setGuestChatBlocked(false);
  }, [session?.user]);

  const persistLanguageChoice = useCallback(
    async (preset: PresetLang | "other", customLanguage: string) => {
      const resolved =
        preset === "other" ? customLanguage.trim().slice(0, 16) || "en" : preset;
      await fetch("/api/public/buyer-intake", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          languageOnly: true,
          preferredLanguage: preset,
          customLanguage: preset === "other" ? customLanguage.trim().slice(0, 100) : "",
        }),
      });
      if (session?.user?.role === "buyer") {
        await fetch("/api/user/preferences", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferredLanguage: resolved.slice(0, 16) }),
        });
      }
      setReplyLanguage(resolved.slice(0, 16));
      await loadBuyerIntake();
    },
    [session?.user?.role, loadBuyerIntake],
  );

  function updateIntent(patch: Partial<SearchIntent>) {
    setIntent((prev) => ({ ...(prev ?? {}), ...patch }));
  }

  function welcomeMessages(sellerName: string): ChatMsg[] {
    return [
      {
        id: 1,
        sender: "agent",
        fromAssistant: true,
        text: `You’re chatting with ${ASSISTANT_NAME} — she helps buyers with ${sellerName}. Ask about MOQ, pricing for your volumes, specs, materials, lead times, or shipping. No sign-in needed for your first messages.`,
      },
    ];
  }

  async function openChat(product: ResultItem) {
    const sellerName = product.seller?.name ?? "this supplier";
    setGuestChatBlocked(false);
    setSupplierPanelProduct(product);
    setChatProductId(String(product._id));
    setChatSellerName(sellerName);
    setMessageInput("");
    setChatOpen(true);

    const data = await loadBuyerIntake();
    const intake = data?.intake;
    const skipLanguageGate = Boolean(intake?.explicitLanguageAt || data?.userLanguageExplicitAt);
    const pref = intake?.preferredLanguage?.trim() || "en";

    setLanguageGatePreset(
      PRESET_LANGS.some((p) => p.code === pref) ? (pref as PresetLang) : "other",
    );
    setLanguageGateCustom(PRESET_LANGS.some((p) => p.code === pref) ? "" : pref);

    setReplyLanguage(pref);

    if (!skipLanguageGate) {
      setSupplierChatPhase("language");
      setChatMessages([]);
      return;
    }

    setSupplierChatPhase("chat");
    setChatMessages(welcomeMessages(sellerName));
  }

  async function confirmSupplierLanguageGate() {
    setLanguageGateBusy(true);
    try {
      await persistLanguageChoice(languageGatePreset, languageGateCustom);
      setSupplierChatPhase("chat");
      setChatMessages(welcomeMessages(chatSellerName || "this supplier"));
    } finally {
      setLanguageGateBusy(false);
    }
  }

  function openIntentModal(kind: "order_confirm" | "callback_request") {
    const intake = buyerIntakeApi?.intake;
    const email =
      intake?.contactEmail?.trim() ||
      (typeof session?.user?.email === "string" ? session.user.email.trim() : "") ||
      "";
    const phone = intake?.contactPhone?.trim() ?? "";
    setIntentContactEmail(email);
    setIntentContactPhone(phone);
    setIntentModal(kind);
  }

  async function submitSupplierIntent() {
    if (!supplierPanelProduct || !intentModal) return;
    if (!intentContactEmail.trim() && !intentContactPhone.trim()) {
      window.alert("Add an email or phone number so the seller can reach you.");
      return;
    }
    setIntentSubmitting(true);
    try {
      const res = await fetch("/api/supplier-buyer-intent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intentType: intentModal,
          productId: supplierPanelProduct._id,
          replyLanguage,
          contactEmail: intentContactEmail.trim(),
          contactPhone: intentContactPhone.trim(),
          chatExcerpt: buildChatExcerpt(chatMessages),
          searchQuery: q,
          intent: intentSnapshotFromSearch(intent) ?? undefined,
        }),
      });
      const data = (await res.json()) as { error?: unknown; confirmationMessage?: string };
      if (!res.ok) {
        window.alert(typeof data.error === "string" ? data.error : "Could not send request.");
        return;
      }
      if (data.confirmationMessage) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: "agent",
            fromAssistant: true,
            text: data.confirmationMessage ?? "",
          },
        ]);
      }
      setIntentModal(null);
    } finally {
      setIntentSubmitting(false);
    }
  }

  async function sendChatMessage(e: React.FormEvent) {
    e.preventDefault();
    if (supplierChatPhase !== "chat") return;
    if (!messageInput.trim() || !chatProductId) return;
    if (guestChatBlocked) return;

    const userMsg: ChatMsg = {
      id: Date.now(),
      text: messageInput.trim(),
      sender: "user",
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setMessageInput("");
    setChatSending(true);
    try {
      const res = await fetch("/api/seller/bot/respond", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: chatProductId,
          question: userMsg.text,
          quantity: intent?.quantity,
          replyLanguage,
        }),
      });
      const data = (await res.json()) as {
        answer?: string;
        error?: string;
        code?: string;
        callbackUrl?: string;
      };

      if (res.status === 403 && data.code === "LOGIN_REQUIRED") {
        setGuestChatBlocked(true);
        setChatMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "agent",
            fromAssistant: true,
            text: `You’ve reached the preview limit for guests. Sign in to keep talking with ${ASSISTANT_NAME} and save your thread.`,
          },
        ]);
        setMessageInput("");
        return;
      }

      const text =
        !res.ok
          ? data.error ??
            "Could not reach Jiya right now. Try again or open the full product listing."
          : data.answer ?? "";
      setChatMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: "agent", fromAssistant: true, text },
      ]);
    } finally {
      setChatSending(false);
    }
  }

  const intentSummary = useMemo(() => {
    const parts: string[] = [];
    if (intent?.productType?.trim()) parts.push(intent.productType.trim());
    else if (q.trim()) parts.push(q.trim().slice(0, 80) + (q.length > 80 ? "…" : ""));
    return parts[0] ?? "your search";
  }, [intent?.productType, q]);

  const searchHeadline = useMemo(
    () => searchHeadlineForSeed(resolvedSeed),
    [resolvedSeed],
  );

  const seoIntroText = useMemo(() => seoIntroForSeed(resolvedSeed), [resolvedSeed]);

  const categoryHints = useMemo(() => {
    const cats = [...new Set(results.map((r) => r.category).filter(Boolean))];
    return cats.slice(0, 3);
  }, [results]);

  const supplierIntentSummaryPreview = useMemo(() => {
    if (!supplierPanelProduct || !intentModal) return "";
    return buildSupplierIntentSummary({
      product: {
        name: supplierPanelProduct.name,
        category: supplierPanelProduct.category,
        displayMoq: supplierPanelProduct.displayMoq,
        pricing: supplierPanelProduct.pricing,
      },
      searchQuery: q,
      intent: intentSnapshotFromSearch(intent),
      chatExcerpt: buildChatExcerpt(chatMessages),
      intentTypeLabel:
        intentModal === "order_confirm"
          ? "Confirm order intent"
          : "Ask seller to contact back",
    });
  }, [supplierPanelProduct, intentModal, q, intent, chatMessages]);

  const intentSubmitTitle =
    intentModal === "order_confirm"
      ? "Confirm your order"
      : intentModal === "callback_request"
        ? "Ask seller to contact back"
        : "";

  return (
    <>
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
        {/* Search hero strip */}
        <div className="border-b border-slate-200 bg-white/90 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void runSearch();
              }}
              className="relative"
            >
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Bot className="h-5 w-5 text-brand-600" aria-hidden />
              </div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="block w-full rounded-full border border-slate-300 bg-slate-50 py-3.5 pl-12 pr-36 text-sm font-medium text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                placeholder='Ask in plain language: e.g. "amber glass bottles under ₹12/unit to Mumbai, 1000 pcs"'
              />
              <button
                type="submit"
                disabled={loading || !q.trim()}
                className="absolute inset-y-1.5 right-1.5 rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                {loading ? "Searching…" : "Find matches"}
              </button>
            </form>
            <p className="mt-3 text-center text-xs font-medium text-slate-500 sm:text-left">
              Hybrid search + tier-aware pricing. Chat with {ASSISTANT_NAME} uses each seller&apos;s{" "}
              <Link href="/seller/chatbot-knowledge" className="font-semibold text-brand-600 hover:underline">
                catalog & uploads
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-slate-50/80">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <BuyerIntakeGate session={session ?? null} />
          </div>
        </div>

        <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:gap-8 lg:px-8">
          {/* Filters */}
          <aside className="w-full shrink-0 lg:w-64">
            <div className="sticky top-20 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
                <Filter className="h-5 w-5 text-slate-500" aria-hidden />
                <h2 className="font-bold text-slate-900">Constraints</h2>
              </div>
              <p className="text-xs font-medium text-slate-500">
                Parsed from your query. Refine and run search again.{" "}
                {parseLoading ? <span className="text-brand-600">Updating…</span> : null}
              </p>

              {intent ? (
                <div className="mt-4 space-y-3">
                  <label className="block text-xs font-semibold text-slate-600">
                    Max unit price
                    <input
                      type="number"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      value={intent.maxUnitPrice ?? ""}
                      onChange={(e) =>
                        updateIntent({
                          maxUnitPrice: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-600">
                    Quantity
                    <input
                      type="number"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      value={intent.quantity ?? ""}
                      onChange={(e) =>
                        updateIntent({
                          quantity: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-600">
                    Location
                    <input
                      type="text"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      value={intent.location ?? ""}
                      onChange={(e) => updateIntent({ location: e.target.value || undefined })}
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-600">
                    Category
                    <input
                      type="text"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      value={intent.category ?? ""}
                      onChange={(e) => updateIntent({ category: e.target.value || undefined })}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={!!intent.verifiedOnly}
                      onChange={(e) => updateIntent({ verifiedOnly: e.target.checked })}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    Verified suppliers only
                  </label>
                  <button
                    type="button"
                    onClick={() => void runSearch()}
                    className="mt-2 w-full rounded-2xl bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
                  >
                    Apply & search
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-sm font-medium text-slate-500">Type a query to extract constraints.</p>
              )}
            </div>
          </aside>

          {/* Results */}
          <div className="min-w-0 flex-1 space-y-5">
            {headerSlot ?? (
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                  {searchHeadline}
                </h1>
                <section aria-labelledby="search-seo-intro-heading" className="mt-4 max-w-3xl">
                  <h2 id="search-seo-intro-heading" className="sr-only">
                    About this search
                  </h2>
                  <p className="text-sm font-medium leading-relaxed text-slate-700">{seoIntroText}</p>
                  {categoryHints.length > 0 ? (
                    <p className="mt-3 text-xs font-medium text-slate-600">
                      Sample categories in results:{" "}
                      <span className="font-semibold text-slate-800">{categoryHints.join(" · ")}</span>
                    </p>
                  ) : null}
                </section>
                {!resolvedSeed.trim() ? (
                  <p className="mt-3 max-w-2xl text-sm font-medium text-slate-600">
                    Recent listings load below — enter a query above to filter by product, MOQ, price, or
                    location.
                  </p>
                ) : null}
                <Link href="/" className="mt-2 inline-block text-sm font-semibold text-brand-600 hover:underline">
                  ← Back to home
                </Link>
              </div>
            )}

            {error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900">
                {error}
              </p>
            ) : null}

            {intent && q.trim() ? (
              <div className="flex gap-3 rounded-3xl border border-brand-100 bg-brand-50/90 p-4 shadow-sm">
                <Bot className="mt-0.5 h-7 w-7 shrink-0 text-brand-700" aria-hidden />
                <div>
                  <h3 className="font-bold text-brand-950">Search intent</h3>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-brand-900/90">
                    Matching{" "}
                    <span className="rounded-md bg-white/80 px-1.5 py-0.5 font-semibold ring-1 ring-brand-100">
                      {intentSummary}
                    </span>
                    {intent.maxUnitPrice != null ? (
                      <>
                        {" "}
                        around{" "}
                        <span className="rounded-md bg-white/80 px-1.5 py-0.5 font-semibold ring-1 ring-brand-100">
                          ≤ ₹{intent.maxUnitPrice}/unit
                        </span>
                      </>
                    ) : null}
                    {intent.quantity != null ? (
                      <>
                        {" "}
                        at{" "}
                        <span className="rounded-md bg-white/80 px-1.5 py-0.5 font-semibold ring-1 ring-brand-100">
                          {intent.quantity} units
                        </span>
                      </>
                    ) : null}
                    {intent.location ? (
                      <>
                        {" "}
                        near{" "}
                        <span className="rounded-md bg-white/80 px-1.5 py-0.5 font-semibold ring-1 ring-brand-100">
                          {intent.location}
                        </span>
                      </>
                    ) : null}
                    .
                  </p>
                </div>
              </div>
            ) : null}

            {showSsrListing ? (
              resultsSlot
            ) : (
              <>
            {loading && results.length === 0 ? (
              <p className="font-medium text-slate-500">Loading results…</p>
            ) : null}

            {!loading && results.length === 0 && resolvedSeed.trim() ? (
              <div className="rounded-3xl border border-slate-200 bg-white py-16 text-center shadow-sm">
                <Package className="mx-auto mb-4 h-16 w-16 text-slate-300" aria-hidden />
                <h3 className="text-lg font-bold text-slate-900">No matches</h3>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  Loosen price, quantity, or location — or try different keywords.
                </p>
              </div>
            ) : null}

            {!loading && results.length === 0 && !resolvedSeed.trim() ? (
              <div className="rounded-3xl border border-slate-200 bg-white py-16 text-center shadow-sm">
                <Package className="mx-auto mb-4 h-16 w-16 text-slate-300" aria-hidden />
                <h3 className="text-lg font-bold text-slate-900">No listings yet</h3>
                <p className="mt-2 text-sm font-medium text-slate-600">
                  Check back soon — sellers are adding catalog items.
                </p>
              </div>
            ) : null}

            <ul className="m-0 list-none space-y-6 p-0">
              {results.map((product) => {
                const id = String(product._id);
                const seller = product.seller;
                const chips = [
                  ...(product.tags ?? []).slice(0, 5),
                  ...(product.useCases ?? []).slice(0, 2),
                ];
                const cur = product.pricingCurrency || product.pricing.currency;

                const productAbsUrl = absoluteUrl(`/product/${id}`);
                const storefrontAbsUrl = seller?.userId
                  ? absoluteUrl(`/seller/${seller.userId}`)
                  : "";

                return (
                  <li key={id}>
                    <article
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                      aria-labelledby={`product-title-${id}`}
                    >
                    <div className="flex flex-col md:flex-row">
                      <div
                        className={`shrink-0 overflow-hidden border-b border-slate-100 md:w-64 md:border-b-0 md:border-r md:border-slate-100 ${
                          product.images?.[0]
                            ? "relative h-52 md:h-[280px]"
                            : "relative flex h-52 flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-brand-50 md:h-auto md:min-h-[280px]"
                        }`}
                      >
                        {product.images?.[0] ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element -- remote seller URLs */}
                            <img
                              src={product.images[0]}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                            <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8 text-center text-xs font-bold uppercase tracking-wide text-white">
                              {product.category}
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/80 ring-1 ring-slate-200/80 shadow-sm">
                              <Package className="h-10 w-10 text-slate-400" aria-hidden />
                            </div>
                            <p className="mt-3 max-w-[14rem] text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                              {product.category}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col p-5 md:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0">
                            <Link
                              id={`product-title-${id}`}
                              href={productAbsUrl}
                              className="text-xl font-bold tracking-tight text-slate-900 hover:text-brand-600"
                            >
                              {product.name}
                            </Link>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                              <span className="text-sm font-semibold text-slate-800">
                                {seller?.name ?? "Supplier"}
                              </span>
                              {seller?.isVerified ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-900">
                                  <ShieldCheck className="h-3 w-3" aria-hidden />
                                  Verified
                                </span>
                              ) : null}
                            </div>
                            {seller?.location ? (
                              <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                                {seller.location}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <p className="mt-3 line-clamp-2 text-sm font-medium text-slate-600">{product.description}</p>

                        <dl className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div>
                              <dt className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-500">
                                <Package className="h-3 w-3" aria-hidden />
                                MOQ
                              </dt>
                              <dd
                                className="font-bold text-slate-900"
                                aria-label={`Minimum order quantity ${product.displayMoq} pieces`}
                              >
                                {product.displayMoq} pcs
                              </dd>
                            </div>
                            {product.tierBands.length > 0 ? (
                              product.tierBands.map((tier, idx) => (
                                <div
                                  key={`${tier.minQty}-${idx}`}
                                  className={
                                    tierHighlightFor(tier, intent)
                                      ? "rounded-xl border border-emerald-200 bg-emerald-50 p-2 -m-1 sm:m-0"
                                      : ""
                                  }
                                >
                                  <dt className="mb-1 text-xs font-semibold text-slate-500">
                                    Unit price ({tierLabel(tier.minQty, tier.maxQty)})
                                  </dt>
                                  <dd
                                    className="flex items-center font-bold text-slate-900"
                                    aria-label={`Unit price ${tier.unitPrice} ${cur} per piece for quantity band ${tierLabel(tier.minQty, tier.maxQty)}`}
                                  >
                                    {cur === "INR" ? (
                                      <IndianRupee className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden />
                                    ) : (
                                      <span className="mr-0.5 text-xs">{cur}</span>
                                    )}
                                    {tier.unitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                    <span className="ml-1 text-xs font-medium text-slate-500">/pc</span>
                                  </dd>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-2 sm:col-span-3">
                                <dt className="mb-1 text-xs font-semibold text-slate-500">List price</dt>
                                <dd className="flex items-center font-bold text-slate-900">
                                  <IndianRupee className="h-3.5 w-3.5 text-slate-600" aria-hidden />
                                  {product.pricing.amount.toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                  })}
                                  <span className="ml-1 text-xs font-medium text-slate-500">/ unit</span>
                                </dd>
                              </div>
                            )}
                          </div>
                        </dl>
                        {product.tierMatch?.belowMoq ? (
                          <p className="mt-2 text-xs font-semibold text-amber-800">
                            Below MOQ at your quantity — tiers show reference bands.
                          </p>
                        ) : null}

                        {chips.length > 0 ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {chips.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                          <button
                            type="button"
                            onClick={() => openChat(product)}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600 sm:flex-none"
                          >
                            <MessageSquare className="h-4 w-4" aria-hidden />
                            Contact supplier
                          </button>
                          <Link
                            href={productAbsUrl}
                            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 hover:border-brand-300 hover:text-brand-700 sm:flex-none"
                          >
                            View listing
                          </Link>
                          {seller?.userId && storefrontAbsUrl ? (
                            <Link
                              href={storefrontAbsUrl}
                              className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-brand-200 sm:flex-none"
                            >
                              Supplier storefront
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    </article>
                  </li>
                );
              })}
            </ul>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Product chat — Jiya + seller knowledge via /api/seller/bot/respond */}
      {chatOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 bg-slate-900 px-4 py-4 text-white">
              <div className="min-w-0 flex-1">
                <h3 className="flex items-center gap-2 font-bold">
                  <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
                  {ASSISTANT_NAME} · {chatSellerName}
                </h3>
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-300">
                  <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />
                  Human-style help from your listing, tiers & seller documents
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <label className="flex flex-wrap items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  <Languages className="h-3.5 w-3.5" aria-hidden />
                  Language
                  <select
                    value={
                      PRESET_LANGS.some((p) => p.code === replyLanguage)
                        ? replyLanguage
                        : replyLanguage || "other"
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      const presetHit = PRESET_LANGS.some((p) => p.code === v);
                      void persistLanguageChoice(
                        presetHit ? (v as PresetLang) : "other",
                        presetHit ? "" : v,
                      );
                    }}
                    disabled={supplierChatPhase !== "chat"}
                    className="max-w-[9rem] rounded-lg border border-white/20 bg-slate-800 px-2 py-1 text-[11px] font-bold normal-case tracking-normal text-white disabled:opacity-40"
                  >
                    {PRESET_LANGS.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.label}
                      </option>
                    ))}
                    {!PRESET_LANGS.some((p) => p.code === replyLanguage) && replyLanguage ? (
                      <option value={replyLanguage}>{replyLanguage}</option>
                    ) : null}
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  setChatOpen(false);
                  setIntentModal(null);
                }}
                className="shrink-0 rounded-full p-2 hover:bg-white/10"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
              {supplierChatPhase === "language" ? (
                <div className="rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
                  <p className="text-center text-xs font-bold uppercase tracking-wide text-brand-800">
                    {CHOOSE_LANGUAGE_LINE.en}
                  </p>
                  <p className="mt-2 text-center text-sm font-medium text-slate-600">
                    Choose how {ASSISTANT_NAME} should reply in this chat.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {PRESET_LANGS.map((p) => (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => setLanguageGatePreset(p.code)}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                          languageGatePreset === p.code
                            ? "border-brand-600 bg-brand-50 text-brand-900"
                            : "border-slate-200 bg-slate-50 text-slate-800 hover:border-brand-200"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setLanguageGatePreset("other")}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition sm:col-span-2 ${
                        languageGatePreset === "other"
                          ? "border-brand-600 bg-brand-50 text-brand-900"
                          : "border-slate-200 bg-slate-50 text-slate-800 hover:border-brand-200"
                      }`}
                    >
                      Other (type below)
                    </button>
                  </div>
                  {languageGatePreset === "other" ? (
                    <label className="mt-4 block text-xs font-semibold text-slate-600">
                      Language code or name
                      <input
                        value={languageGateCustom}
                        onChange={(e) => setLanguageGateCustom(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium"
                        placeholder="e.g. gu, ta, Deutsch"
                      />
                    </label>
                  ) : null}
                  <button
                    type="button"
                    disabled={languageGateBusy}
                    onClick={() => void confirmSupplierLanguageGate()}
                    className="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50"
                  >
                    {languageGateBusy ? "Saving…" : "Continue"}
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-center text-[11px] font-medium text-slate-400">
                    {ASSISTANT_NAME} uses the same knowledge sellers upload under{" "}
                    <Link href="/seller/chatbot-knowledge" className="text-brand-600 underline">
                      chatbot knowledge
                    </Link>
                    .
                  </p>
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          msg.sender === "user"
                            ? "rounded-br-md bg-slate-900 text-white"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                        }`}
                      >
                        {msg.fromAssistant ? (
                          <div className="mb-1 flex items-center gap-1 opacity-80">
                            <MessageCircle className="h-3 w-3 text-brand-600" aria-hidden />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                              {ASSISTANT_NAME}
                            </span>
                          </div>
                        ) : null}
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            <div className="border-t border-slate-200 bg-white p-4">
              {guestChatBlocked ? (
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-800">Continue on your buyer account</p>
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    Sign in to keep messaging {ASSISTANT_NAME} and unlock RFQs & saved threads.
                  </p>
                  <Link
                    href="/login?callbackUrl=%2Fbuyer%2Fdashboard"
                    className="mt-4 inline-flex rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
                  >
                    Sign in to continue
                  </Link>
                </div>
              ) : sessionStatus === "loading" ? (
                <p className="text-center text-sm font-medium text-slate-500">Loading…</p>
              ) : supplierChatPhase !== "chat" ? (
                <p className="text-center text-sm font-medium text-slate-500">
                  Pick how {ASSISTANT_NAME} replies, then continue.
                </p>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openIntentModal("order_confirm")}
                      className="inline-flex min-h-[42px] flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-bold text-slate-900 hover:border-brand-300 hover:bg-white"
                    >
                      {intentCtaLabels(replyLanguage).confirm}
                    </button>
                    <button
                      type="button"
                      onClick={() => openIntentModal("callback_request")}
                      className="inline-flex min-h-[42px] flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-bold text-slate-900 hover:border-brand-300 hover:bg-white"
                    >
                      {intentCtaLabels(replyLanguage).callback}
                    </button>
                  </div>
                  <form onSubmit={(e) => void sendChatMessage(e)} className="flex flex-col gap-3">
                  {!session?.user ? (
                    <p className="text-center text-[11px] font-medium text-slate-500">
                      Preview chat — sign in later for unlimited messages.{" "}
                      <Link
                        href="/login?callbackUrl=%2Fbuyer%2Fdashboard"
                        className="font-bold text-brand-600 underline"
                      >
                        Sign in
                      </Link>
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="MOQ, pricing, materials, shipping…"
                      disabled={chatSending || guestChatBlocked || supplierChatPhase !== "chat"}
                      className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/25"
                    />
                    <button
                      type="submit"
                      disabled={
                        chatSending ||
                        !messageInput.trim() ||
                        guestChatBlocked ||
                        supplierChatPhase !== "chat"
                      }
                      className="rounded-full bg-brand-600 p-3 text-white hover:bg-brand-700 disabled:opacity-50"
                      aria-label="Send"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {["What is the MOQ?", "Lead time at 1000 pcs?", "Hindi me bataiye"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setMessageInput(s)}
                        disabled={guestChatBlocked}
                        className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </form>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {intentModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]">
          <div
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="intent-modal-title"
          >
            <h4 id="intent-modal-title" className="text-lg font-bold text-slate-900">
              {intentSubmitTitle}
            </h4>
            <p className="mt-2 text-sm font-medium text-slate-600">
              Confirm how the seller should reach you. You can edit contact details below.
            </p>
            {supplierIntentSummaryPreview ? (
              <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-700 ring-1 ring-slate-100">
                {supplierIntentSummaryPreview}
              </pre>
            ) : null}
            <label className="mt-4 block text-xs font-semibold text-slate-700">
              Email
              <input
                type="email"
                value={intentContactEmail}
                onChange={(e) => setIntentContactEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium"
              />
            </label>
            <label className="mt-3 block text-xs font-semibold text-slate-700">
              Phone
              <input
                type="tel"
                value={intentContactPhone}
                onChange={(e) => setIntentContactPhone(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium"
              />
            </label>
            <p className="mt-2 text-xs font-medium text-slate-500">
              At least one of email or phone is required.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void submitSupplierIntent()}
                disabled={intentSubmitting}
                className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {intentSubmitting ? "Sending…" : "Send to seller"}
              </button>
              <button
                type="button"
                onClick={() => setIntentModal(null)}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function SearchView(props: SearchViewProps = {}) {
  return (
    <SiteChrome>
      <SearchViewInner {...props} />
    </SiteChrome>
  );
}
