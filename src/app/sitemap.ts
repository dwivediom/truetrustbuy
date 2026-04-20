import { getPublicSiteOrigin } from "@/lib/site-url";
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getPublicSiteOrigin();
  const categories = ["glass-bottles", "industrial-pumps", "hospital-software"];
  const cities = ["mumbai", "delhi", "pune"];
  const programmatic = categories.flatMap((category) =>
    cities.map((city) => ({
      url: `${base}/market/${category}/${city}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  );
  return [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/categories`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...programmatic,
  ];
}

