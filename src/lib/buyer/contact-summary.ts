/** Build a seller-facing summary from search context + optional chat excerpt (plain text). */

export type IntentSnapshot = {
  productType?: string;
  quantity?: number;
  maxUnitPrice?: number;
  location?: string;
  category?: string;
  verifiedOnly?: boolean;
  raw?: string;
};

export type ProductSnapshot = {
  name: string;
  category?: string;
  displayMoq?: number;
  pricing?: { amount: number; currency: string };
};

export function buildSupplierIntentSummary(input: {
  product: ProductSnapshot;
  searchQuery: string;
  intent: IntentSnapshot | null;
  chatExcerpt: string;
  intentTypeLabel: string;
}): string {
  const lines: string[] = [];
  lines.push(`Type: ${input.intentTypeLabel}`);
  lines.push(`Product: ${input.product.name}`);
  if (input.product.category) lines.push(`Category: ${input.product.category}`);
  if (input.product.displayMoq != null) lines.push(`Listing MOQ context: ${input.product.displayMoq} pcs`);
  if (input.product.pricing) {
    lines.push(
      `List price reference: ${input.product.pricing.amount} ${input.product.pricing.currency}/unit`,
    );
  }
  if (input.intent?.quantity != null) lines.push(`Buyer quantity intent: ${input.intent.quantity}`);
  if (input.intent?.maxUnitPrice != null)
    lines.push(`Target max unit price: ${input.intent.maxUnitPrice}`);
  if (input.intent?.location?.trim()) lines.push(`Location: ${input.intent.location.trim()}`);
  if (input.searchQuery.trim()) lines.push(`Search query: ${input.searchQuery.trim().slice(0, 240)}`);
  if (input.intent?.raw?.trim()) lines.push(`Parsed intent: ${input.intent.raw.trim().slice(0, 200)}`);
  if (input.chatExcerpt.trim()) {
    lines.push("");
    lines.push("Recent chat context:");
    lines.push(input.chatExcerpt.trim().slice(0, 1200));
  }
  return lines.join("\n");
}
