import { getPublicSiteOrigin } from "@/lib/site-url";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const base = getPublicSiteOrigin();
  return {
    name: "TrueTrustBuy — B2B supplier discovery",
    short_name: "TrueTrustBuy",
    description:
      "GST-aware B2B marketplace with intent search, MOQ tiers, and verified supplier storefronts.",
    start_url: `${base}/`,
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
  };
}
