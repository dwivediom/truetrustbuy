import { AuthSessionProvider } from "@/components/providers/auth-session-provider";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://truetrustbuy.com"),
  title: {
    default: "TrueTrustBuy | B2B supplier discovery",
    template: "%s | TrueTrustBuy",
  },
  description:
    "B2B marketplace for verified manufacturers and suppliers with AI smart search, RFQ workflows, and MOQ pricing support.",
  openGraph: {
    type: "website",
    title: "TrueTrustBuy | B2B supplier discovery",
    description:
      "Find GST-verified suppliers, compare quotes, and search by natural language intent.",
    url: "https://truetrustbuy.com",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} scroll-smooth`} suppressHydrationWarning>
      <body
        className={`${plusJakarta.className} bg-mesh overflow-x-hidden antialiased`}
        suppressHydrationWarning
      >
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
