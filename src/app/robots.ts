import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/seller", "/buyer", "/api"],
    },
    sitemap: "https://truetrustbuy.com/sitemap.xml",
  };
}

