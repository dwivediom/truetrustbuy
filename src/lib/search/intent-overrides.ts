import type { SearchIntent } from "@/lib/search/intent";

function num(v: string | null): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function bool(v: string | null): boolean | undefined {
  if (v == null || v === "") return undefined;
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  return undefined;
}

/** Merge URL search param overrides (constraint sidebar / shareable links). */
export function applyIntentQueryOverrides(
  intent: SearchIntent,
  params: URLSearchParams,
): SearchIntent {
  const maxUnitPrice = num(params.get("maxUnitPrice")) ?? num(params.get("unit_price_max"));
  const quantity = num(params.get("quantity"));
  const location = params.get("location")?.trim();
  const verifiedOnly = bool(params.get("verifiedOnly"));
  const category = params.get("category")?.trim();
  const deliveryBy = params.get("delivery_by")?.trim();
  const searchIntentParam = params.get("intent");
  const searchIntent =
    searchIntentParam === "rfq" || searchIntentParam === "discovery"
      ? searchIntentParam
      : undefined;

  return {
    ...intent,
    maxUnitPrice: maxUnitPrice ?? intent.maxUnitPrice,
    quantity: quantity ?? intent.quantity,
    location: location || intent.location,
    verifiedOnly: verifiedOnly ?? intent.verifiedOnly,
    category: category || intent.category,
    delivery_by: deliveryBy || intent.delivery_by,
    searchIntent: searchIntent ?? intent.searchIntent,
  };
}

type BodyOverrides = {
  maxUnitPrice?: number;
  unit_price_max?: number;
  quantity?: number;
  location?: string;
  verifiedOnly?: boolean;
  category?: string;
  delivery_by?: string | null;
  searchIntent?: "discovery" | "rfq";
  customizations?: string[];
};

/** Merge JSON body overrides from constraint sidebar POST. */
export function mergeIntentBodyOverrides(
  intent: SearchIntent,
  body: BodyOverrides | undefined,
): SearchIntent {
  if (!body || typeof body !== "object") return intent;
  const max = body.maxUnitPrice ?? body.unit_price_max;
  return {
    ...intent,
    maxUnitPrice: typeof max === "number" ? max : intent.maxUnitPrice,
    quantity: typeof body.quantity === "number" ? body.quantity : intent.quantity,
    location: body.location ?? intent.location,
    verifiedOnly: typeof body.verifiedOnly === "boolean" ? body.verifiedOnly : intent.verifiedOnly,
    category: body.category ?? intent.category,
    delivery_by: body.delivery_by ?? intent.delivery_by,
    searchIntent: body.searchIntent ?? intent.searchIntent,
    customizations: Array.isArray(body.customizations) ? body.customizations : intent.customizations,
  };
}
