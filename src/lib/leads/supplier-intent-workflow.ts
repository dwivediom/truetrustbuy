/** Seller CRM fields for SupplierBuyerIntent — safe for client bundles (no Mongoose). */

export const CONNECTION_STATUSES = ["not_connected", "connected", "in_negotiation"] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export const CONNECTION_LABEL: Record<ConnectionStatus, string> = {
  not_connected: "Not connected",
  connected: "Connected",
  in_negotiation: "In negotiation",
};
