import { HowItWorksContent } from "@/components/pages/HowItWorksContent";
import { MouseFollowBackground } from "@/components/home/MouseFollowBackground";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works - HashView | QR Ordering, Reviews & Rewards",
  description:
    "Discover how HashView works for customers and businesses. Scan a QR code, browse menus, order instantly, earn cashback rewards, and leave verified reviews — all from your phone. Businesses get a full CRM dashboard, AI menu upload, push notifications, and analytics.",
  keywords: [
    "How HashView works",
    "QR code ordering",
    "QR menu ordering system",
    "restaurant QR code",
    "digital menu QR",
    "order food QR code",
    "cashback rewards dining",
    "restaurant CRM dashboard",
    "AI menu upload",
    "customer ordering app",
    "restaurant management system",
    "verified reviews platform",
    "HashView app how it works",
    "business dashboard",
    "real-time order tracking",
  ],
  openGraph: {
    title: "How HashView Works — For Customers & Businesses",
    description:
      "From QR code scan to cashback rewards — see exactly how HashView simplifies ordering and management for customers and restaurant owners alike.",
    url: "https://hashview.co.uk/how-it-works",
    type: "website",
  },
  twitter: {
    title: "How HashView Works — For Customers & Businesses",
    description:
      "Scan. Order. Earn. Manage. HashView is the complete platform for modern dining.",
  },
  alternates: {
    canonical: "https://hashview.co.uk/how-it-works",
  },
};

export default function HowItWorksPage() {
  return (
    <div className="relative overflow-hidden min-h-screen pt-20">
      <MouseFollowBackground />
      <HowItWorksContent />
    </div>
  );
}
