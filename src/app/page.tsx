import LandingPage from "@/components/LandingPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TrueTrustBuy | Agentic B2B sourcing & negotiation",
  description:
    "The first B2B marketplace where AI assists you in matching price, volume, and specs in real time. GST-verified suppliers in India. Long-tail search: MOQ, tier pricing, city.",
  keywords: [
    "B2B marketplace India",
    "agentic search",
    "verified suppliers",
    "MOQ sourcing",
    "tier pricing",
    "GST verified",
    "TrueTrustBuy",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TrueTrustBuy | Agentic B2B sourcing & negotiation",
    description:
      "Find the exact deal: AI-assisted matching, GST-verified suppliers, and RFQ-ready context for Indian B2B procurement.",
    url: "https://truetrustbuy.com/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrueTrustBuy | Agentic B2B sourcing & negotiation",
    description:
      "Intent-first B2B search with tier-aware matching and verified supply in India.",
  },
};

export default function Home() {
  const organizationLdJson = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TrueTrustBuy",
    url: "https://truetrustbuy.com",
    description:
      "B2B marketplace for GST-verified manufacturers with AI-assisted sourcing, tier matching, and RFQ workflows.",
  };

  const webSiteLdJson = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "TrueTrustBuy",
    url: "https://truetrustbuy.com",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://truetrustbuy.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const faqLdJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How is TrueTrustBuy different from a supplier directory?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "TrueTrustBuy is built as an intent engine: you describe constraints like price, MOQ, city, and specifications, and matching factors tier pricing, lead time, and verification—not just keyword listings.",
        },
      },
      {
        "@type": "Question",
        name: "What does agentic search mean for buyers?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Search and assistant flows help structure your requirement and surface suppliers whose rules and tiers fit your volume and delivery context, so you spend less time on misfit catalogs.",
        },
      },
      {
        "@type": "Question",
        name: "What can manufacturers get from onboarding?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Sellers can publish tiered pricing and lead times and use automated assistant coverage for common buyer questions, so your team focuses on conversations that are ready to close.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLdJson) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteLdJson) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLdJson) }}
      />
      <LandingPage />
    </>
  );
}
