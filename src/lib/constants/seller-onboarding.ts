/** Common B2B manufacturing / sourcing verticals for seller signup. */
export const SELLER_INDUSTRY_OPTIONS = [
  "Packaging & containers",
  "Glass & ceramics",
  "Textiles & apparel",
  "Pharma & healthcare supplies",
  "Industrial machinery & parts",
  "Electronics & electrical",
  "Food & beverage processing",
  "Chemicals & raw materials",
  "Metals & fabrication",
  "Plastics & polymers",
  "Furniture & wood",
  "Logistics supplies",
  "Safety & PPE",
  "Agriculture & commodities",
  "Other",
] as const;

export const SELLER_LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "gu", label: "Gujarati" },
  { value: "mr", label: "Marathi" },
  { value: "ta", label: "Tamil" },
  { value: "te", label: "Telugu" },
  { value: "kn", label: "Kannada" },
  { value: "bn", label: "Bengali" },
];
