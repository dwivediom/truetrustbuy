import { auth } from "@/auth";
import { buildSupplierIntentSummary } from "@/lib/buyer/contact-summary";
import { getGuestTokenFromCookie } from "@/lib/buyer-intake-cookie";
import { connectDb } from "@/lib/db";
import { BuyerIntakeModel } from "@/lib/models/BuyerIntake";
import { PricingRuleModel } from "@/lib/models/PricingRule";
import { ProductModel } from "@/lib/models/Product";
import { SupplierBuyerIntentModel } from "@/lib/models/SupplierBuyerIntent";
import { UserModel } from "@/lib/models/User";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";
import { replyLanguageLabel } from "@/lib/i18n/reply-language";
import { localizeBuyerFacingReply } from "@/lib/i18n/translate";
import { extractSupplierIntentOrderWithGemini } from "@/lib/buyer/extract-supplier-intent-order";
import type { IntentSnapshot } from "@/lib/buyer/contact-summary";
import { z } from "zod";

const postSchema = z.object({
  intentType: z.enum(["order_confirm", "callback_request"]),
  productId: z.string().min(1),
  replyLanguage: z.string().max(24).optional().default("en"),
  contactEmail: z.union([z.string().email(), z.literal("")]).optional().default(""),
  contactPhone: z.string().max(48).optional().default(""),
  chatExcerpt: z.string().max(4000).optional().default(""),
  summaryHint: z.string().max(4000).optional().default(""),
  searchQuery: z.string().max(2000).optional().default(""),
  intent: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const rl = rateLimit(`supplier-buyer-intent:${ip}`, 25, 60_000);
  if (!rl.ok) {
    return Response.json({ error: "Too many requests", retryAfterSec: rl.retryAfterSec }, { status: 429 });
  }

  await connectDb();
  const session = await auth();
  const guestToken = session?.user?.id ? null : await getGuestTokenFromCookie();

  if (!session?.user?.id && !guestToken) {
    return Response.json({ error: "Sign in or enable cookies." }, { status: 401 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(parsedBody);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const product = await ProductModel.findById(parsed.data.productId).lean<{
    name: string;
    category?: string;
    pricing?: { amount: number; currency: string };
    metadata?: { sellerOrgId?: string };
  } | null>();

  if (!product) {
    return Response.json({ error: "Product not found." }, { status: 404 });
  }

  const pricingRule = await PricingRuleModel.findOne({ productId: parsed.data.productId })
    .select("sellerUserId")
    .lean<{ sellerUserId?: string } | null>();

  const sellerUserId =
    (product.metadata?.sellerOrgId && String(product.metadata.sellerOrgId).trim()) ||
    (pricingRule?.sellerUserId && String(pricingRule.sellerUserId).trim()) ||
    "";

  if (!sellerUserId) {
    return Response.json(
      { error: "Product is not linked to a seller (add seller on the product or a pricing rule)." },
      { status: 400 },
    );
  }

  let email = parsed.data.contactEmail.trim().toLowerCase();
  let phone = parsed.data.contactPhone.trim();

  if (!email && !phone && guestToken) {
    const intake = await BuyerIntakeModel.findOne({ guestToken }).lean<{
      contactEmail?: string;
      contactPhone?: string;
    }>();
    email = intake?.contactEmail?.trim().toLowerCase() ?? "";
    phone = intake?.contactPhone?.trim() ?? "";
  }

  if (!email && !phone && session?.user?.role === "buyer") {
    const u = await UserModel.findById(session.user.id).lean<{ email?: string; phone?: string }>();
    email = u?.email?.trim().toLowerCase() ?? "";
    phone = u?.phone?.trim() ?? "";
  }

  if (!email && !phone) {
    return Response.json(
      { error: "Provide at least an email or phone number (or save them on your profile)." },
      { status: 400 },
    );
  }

  const intentSnap = parsed.data.intent as IntentSnapshot | null | undefined;

  const summary = buildSupplierIntentSummary({
    product: {
      name: product.name,
      category: product.category,
      pricing: product.pricing,
    },
    searchQuery: parsed.data.searchQuery,
    intent: intentSnap ?? null,
    chatExcerpt: parsed.data.chatExcerpt || parsed.data.summaryHint,
    intentTypeLabel:
      parsed.data.intentType === "order_confirm" ? "Confirm order intent" : "Ask seller to contact back",
  });

  let searchQuantity: number | undefined;
  if (intentSnap && typeof intentSnap.quantity === "number" && Number.isFinite(intentSnap.quantity)) {
    searchQuantity = Math.max(1, Math.round(intentSnap.quantity));
  }

  const extracted = await extractSupplierIntentOrderWithGemini({
    intentType: parsed.data.intentType,
    productName: product.name,
    listUnitPrice: product.pricing?.amount,
    listCurrency: product.pricing?.currency,
    searchQuantity,
    summary,
    chatExcerpt: parsed.data.chatExcerpt.slice(0, 4000),
  });

  let orderQuantity: number | undefined;
  if (
    extracted?.finalOrderQuantity != null &&
    typeof extracted.finalOrderQuantity === "number" &&
    Number.isFinite(extracted.finalOrderQuantity)
  ) {
    orderQuantity = Math.max(1, Math.round(extracted.finalOrderQuantity));
  } else if (searchQuantity != null) {
    orderQuantity = searchQuantity;
  }

  const unitPrice =
    extracted?.unitPrice != null &&
    typeof extracted.unitPrice === "number" &&
    Number.isFinite(extracted.unitPrice)
      ? extracted.unitPrice
      : product.pricing?.amount;

  const priceCurrency =
    extracted?.currency?.trim().slice(0, 12) ||
    product.pricing?.currency?.trim().slice(0, 12) ||
    "INR";

  const structuredExtract = {
    ...(extracted ?? {}),
    searchQuantityHint: searchQuantity ?? null,
    listUnitPriceSnapshot: product.pricing?.amount ?? null,
    listCurrencySnapshot: product.pricing?.currency ?? null,
    extractedAt: new Date().toISOString(),
  };

  await SupplierBuyerIntentModel.create({
    sellerUserId,
    productId: parsed.data.productId,
    intentType: parsed.data.intentType,
    guestToken: guestToken ?? "",
    buyerUserId: session?.user?.role === "buyer" ? session.user.id : "",
    replyLanguage: parsed.data.replyLanguage.trim().slice(0, 24) || "en",
    contactEmail: email,
    contactPhone: phone,
    summary,
    chatExcerpt: parsed.data.chatExcerpt.slice(0, 4000),
    productNameSnapshot: product.name.slice(0, 300),
    ...(searchQuantity != null ? { searchQuantity } : {}),
    ...(orderQuantity != null ? { orderQuantity } : {}),
    ...(unitPrice != null ? { unitPrice } : {}),
    priceCurrency,
    structuredExtract,
    connectionStatus: "not_connected",
    contactOwner: "",
    sellerNotes: "",
    status: "new",
  });

  const tag = parsed.data.replyLanguage.trim().split(/[-_]/)[0]?.toLowerCase() || "en";
  const contactDisplay = email || phone;
  const langHuman = tag === "en" ? "English" : replyLanguageLabel(tag);
  const englishBase = `Thanks — we've logged your request. The seller will contact you soon at ${contactDisplay}. You'll continue to receive replies in ${langHuman}.`;
  const confirmationMessage = await localizeBuyerFacingReply(englishBase, "", null, {
    replyLanguageTag: tag,
  });

  return Response.json({ ok: true, confirmationMessage });
}
