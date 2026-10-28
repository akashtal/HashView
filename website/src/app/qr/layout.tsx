import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HashView — Discover HashView",
  description: "Transform everyday experiences into opportunities. Real reviews, real rewards, real growth. Discover all HashView links and resources.",
  openGraph: {
    title: "HashView — Discover HashView",
    description: "Transform everyday experiences into opportunities. Real reviews, real rewards, real growth. Discover all HashView links and resources.",
    url: "https://hashview.co.uk/qr",
    siteName: "HashView",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "HashView",
      },
    ],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HashView — Discover HashView",
    description: "Transform everyday experiences into opportunities. Real reviews, real rewards, real growth.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "https://hashview.co.uk/qr",
  },
};

export default function QRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
