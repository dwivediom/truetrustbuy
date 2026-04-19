import { connectDb } from "@/lib/db";
import { BuyerIntakeModel } from "@/lib/models/BuyerIntake";
import { ProductModel } from "@/lib/models/Product";
import { RFQModel } from "@/lib/models/RFQ";
import type { PipelineStage } from "@/lib/leads/pipeline-stage";
import type { ConnectionStatus } from "@/lib/leads/supplier-intent-workflow";
import { SellerLeadDispositionModel } from "@/lib/models/SellerLeadDisposition";
import { SupplierBuyerIntentModel } from "@/lib/models/SupplierBuyerIntent";
import { UserModel } from "@/lib/models/User";
import mongoose from "mongoose";

export type LeadDisposition = {
  pipelineStage: PipelineStage;
  assignee: string;
  sellerNotes: string;
  updatedAt?: string;
};

export type LeadRow = {
  id: string;
  productQuery: string;
  quantity: number;
  budget: number;
  currency: string;
  createdAt: string;
  matchScore: number;
  disposition?: LeadDisposition;
};

export type InboundInquiryRow = {
  id: string;
  productInterest: string;
  preferredLanguage: string;
  matchScore: number;
  createdAt: string;
};

export type SupplierIntentKind = "order_confirm" | "callback_request";

export type SupplierContactIntentRow = {
  id: string;
  intentType: SupplierIntentKind;
  productId: string;
  productName: string;
  buyerName: string;
  buyerKind: "registered" | "guest";
  email: string;
  phone: string;
  replyLanguage: string;
  summaryPreview: string;
  summaryFull: string;
  searchQuantity: number | null;
  /** Seller-facing qty (Gemini + defaults); editable */
  orderQuantity: number | null;
  unitPrice: number | null;
  priceCurrency: string;
  structuredExtract: Record<string, unknown>;
  connectionStatus: ConnectionStatus;
  contactOwner: string;
  sellerNotes: string;
  createdAt: string;
  updatedAt: string;
  /** new / seen */
  status: string;
};

export type SellerLeadsResult = {
  leads: LeadRow[];
  inboundInquiries: InboundInquiryRow[];
  /** Confirm order / callback requests from search chat (SupplierBuyerIntent). */
  contactIntents: SupplierContactIntentRow[];
  categoriesYouSell: string[];
  industryCategory: string;
};

function scoreRfq(query: string, needles: string[]): number {
  const low = query.toLowerCase();
  let score = 0;
  for (const n of needles) {
    const needle = n.toLowerCase().trim();
    if (needle.length < 3) continue;
    if (low.includes(needle)) score += needle.length >= 6 ? 4 : 2;
  }
  return score;
}

/** Category/tag/industry needles used to match RFQs and guest intake interest to this seller. */
export async function buildNeedlesForSeller(sellerUserId: string): Promise<string[]> {
  const user = await UserModel.findById(sellerUserId)
    .select("industryCategory")
    .lean<{ industryCategory?: string } | null>();

  const products = await ProductModel.find({ "metadata.sellerOrgId": sellerUserId })
    .select("category tags")
    .lean<Array<{ category?: string; tags?: string[] }>>();

  const categoriesYouSell = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];
  const tagList = products.flatMap((p) => p.tags ?? []);

  const needles: string[] = [];
  if (user?.industryCategory?.trim()) needles.push(user.industryCategory.trim());
  needles.push(...categoriesYouSell, ...tagList);
  return needles;
}

/**
 * Only RFQs where keyword overlap score > 0 appear in seller leads — same rule for PATCH authz.
 */
export async function canSellerAccessRfq(sellerUserId: string, rfqId: string): Promise<boolean> {
  await connectDb();
  if (!mongoose.Types.ObjectId.isValid(rfqId)) return false;
  const rfq = await RFQModel.findById(rfqId)
    .select("productQuery status")
    .lean<{ productQuery: string; status?: string } | null>();
  if (!rfq || rfq.status !== "open") return false;
  const needles = await buildNeedlesForSeller(sellerUserId);
  return scoreRfq(rfq.productQuery, needles) > 0;
}

export async function computeSellerLeads(sellerUserId: string): Promise<SellerLeadsResult> {
  await connectDb();

  const user = await UserModel.findById(sellerUserId)
    .select("industryCategory")
    .lean<{ industryCategory?: string } | null>();

  const products = await ProductModel.find({ "metadata.sellerOrgId": sellerUserId })
    .select("category tags")
    .lean<Array<{ category?: string; tags?: string[] }>>();

  const categoriesYouSell = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];
  const tagList = products.flatMap((p) => p.tags ?? []);

  const needles: string[] = [];
  if (user?.industryCategory?.trim()) needles.push(user.industryCategory.trim());
  needles.push(...categoriesYouSell, ...tagList);

  const open = await RFQModel.find({ status: "open" })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean<
      Array<{
        _id: unknown;
        productQuery: string;
        quantity?: number;
        budget?: number;
        currency?: string;
        createdAt?: Date;
      }>
    >();

  let leads: LeadRow[] = open
    .map((r) => {
      const matchScore = scoreRfq(r.productQuery, needles);
      return {
        id: String(r._id),
        productQuery: r.productQuery,
        quantity: r.quantity ?? 1,
        budget: r.budget ?? 0,
        currency: r.currency ?? "INR",
        createdAt: (r.createdAt ?? new Date()).toISOString(),
        matchScore,
      };
    })
    .filter((l) => l.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || b.createdAt.localeCompare(a.createdAt));

  const rfqIds = leads.map((l) => new mongoose.Types.ObjectId(l.id));
  const dispositions = await SellerLeadDispositionModel.find({
    sellerUserId,
    rfqId: { $in: rfqIds },
  }).lean<
    Array<{
      rfqId: unknown;
      pipelineStage?: PipelineStage;
      assignee?: string;
      sellerNotes?: string;
      updatedAt?: Date;
    }>
  >();

  const byRfq = new Map<string, LeadDisposition>();
  for (const d of dispositions) {
    byRfq.set(String(d.rfqId), {
      pipelineStage: d.pipelineStage ?? "new",
      assignee: d.assignee ?? "",
      sellerNotes: d.sellerNotes ?? "",
      updatedAt: d.updatedAt?.toISOString(),
    });
  }

  leads = leads.map((l) => ({
    ...l,
    disposition: byRfq.get(l.id),
  }));

  /** Guest intakes with product interest text, keyword-matched to seller (not merged to a user). */
  const intakes = await BuyerIntakeModel.find({
    mergedUserId: "",
    productInterest: { $regex: /\S/ },
  })
    .sort({ createdAt: -1 })
    .limit(80)
    .lean<
      Array<{
        _id: unknown;
        productInterest?: string;
        preferredLanguage?: string;
        createdAt?: Date;
      }>
    >();

  const inboundInquiries: InboundInquiryRow[] = intakes
    .map((row) => {
      const text = row.productInterest?.trim() ?? "";
      const matchScore = scoreRfq(text, needles);
      return {
        id: String(row._id),
        productInterest: text,
        preferredLanguage: row.preferredLanguage ?? "en",
        matchScore,
        createdAt: (row.createdAt ?? new Date()).toISOString(),
      };
    })
    .filter((x) => x.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 25);

  const supplierIntentsRaw = await SupplierBuyerIntentModel.find({ sellerUserId })
    .sort({ createdAt: -1 })
    .limit(150)
    .lean<
      Array<{
        _id: unknown;
        intentType: string;
        productId: unknown;
        buyerUserId?: string;
        replyLanguage?: string;
        contactEmail?: string;
        contactPhone?: string;
        summary?: string;
        status?: string;
        createdAt?: Date;
        updatedAt?: Date;
        productNameSnapshot?: string;
        searchQuantity?: number | null;
        orderQuantity?: number | null;
        unitPrice?: number | null;
        priceCurrency?: string;
        structuredExtract?: Record<string, unknown>;
        connectionStatus?: string;
        contactOwner?: string;
        sellerNotes?: string;
      }>
    >();

  const buyerIds = [
    ...new Set(
      supplierIntentsRaw.map((r) => r.buyerUserId?.trim()).filter((x): x is string => Boolean(x)),
    ),
  ];
  const buyerDocs = buyerIds.length
    ? await UserModel.find({ _id: { $in: buyerIds } })
        .select("name")
        .lean<Array<{ _id: unknown; name?: string }>>()
    : [];
  const buyerNameById = new Map(
    buyerDocs.map((u) => [String(u._id), u.name?.trim() || "Buyer"]),
  );

  const prodIdsForIntent = [...new Set(supplierIntentsRaw.map((r) => String(r.productId)))];
  const prodDocs = prodIdsForIntent.length
    ? await ProductModel.find({ _id: { $in: prodIdsForIntent } })
        .select("name")
        .lean<Array<{ _id: unknown; name?: string }>>()
    : [];
  const productNameById = new Map(prodDocs.map((p) => [String(p._id), p.name ?? "Product"]));

  const contactIntents: SupplierContactIntentRow[] = supplierIntentsRaw.map((r) => {
    const pid = String(r.productId);
    const bid = r.buyerUserId?.trim();
    const productName = r.productNameSnapshot?.trim() || productNameById.get(pid) || "Product";
    const buyerName = bid ? buyerNameById.get(bid) ?? "Buyer" : "Guest";
    const qtySearch = r.searchQuantity;
    const qtyOrder = r.orderQuantity;
    const structured =
      r.structuredExtract && typeof r.structuredExtract === "object" && !Array.isArray(r.structuredExtract)
        ? (r.structuredExtract as Record<string, unknown>)
        : {};
    const conn =
      r.connectionStatus === "connected" || r.connectionStatus === "in_negotiation"
        ? r.connectionStatus
        : ("not_connected" as ConnectionStatus);
    return {
      id: String(r._id),
      intentType: (r.intentType === "callback_request" ? "callback_request" : "order_confirm") as SupplierIntentKind,
      productId: pid,
      productName,
      buyerName,
      buyerKind: bid ? "registered" : "guest",
      email: r.contactEmail ?? "",
      phone: r.contactPhone ?? "",
      replyLanguage: r.replyLanguage ?? "en",
      summaryPreview: (r.summary ?? "").slice(0, 280),
      summaryFull: r.summary ?? "",
      searchQuantity: typeof qtySearch === "number" && Number.isFinite(qtySearch) ? qtySearch : null,
      orderQuantity: typeof qtyOrder === "number" && Number.isFinite(qtyOrder) ? qtyOrder : null,
      unitPrice:
        typeof r.unitPrice === "number" && Number.isFinite(r.unitPrice) ? r.unitPrice : null,
      priceCurrency: r.priceCurrency?.trim() ?? "",
      structuredExtract: structured,
      connectionStatus: conn,
      contactOwner: r.contactOwner?.trim() ?? "",
      sellerNotes: r.sellerNotes ?? "",
      createdAt: r.createdAt?.toISOString() ?? "",
      updatedAt: r.updatedAt?.toISOString() ?? r.createdAt?.toISOString() ?? "",
      status: r.status ?? "new",
    };
  });

  return {
    leads,
    inboundInquiries,
    contactIntents,
    categoriesYouSell,
    industryCategory: user?.industryCategory?.trim() ?? "",
  };
}
