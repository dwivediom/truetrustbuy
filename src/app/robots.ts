import { absoluteUrl } from "@/lib/site-url";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/seller", "/buyer", "/api"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}

