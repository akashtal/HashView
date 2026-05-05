import { PricingContent } from "@/components/pages/PricingContent";
import { MouseFollowBackground } from "@/components/home/MouseFollowBackground";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing - HashView Rewards | Local Business Plans",
  description: "Simple, transparent pricing designed for local businesses. Start turning real customer feedback into repeat revenue with our tailored plans.",
  keywords: [
    "HashView pricing", "verified reviews cost", "customer engagement platform pricing",
    "local business software", "review platform plans", "rewards app pricing"
  ],
  openGraph: {
    title: "Pricing - HashView Rewards",
    description: "Simple, transparent pricing designed for local businesses. Start turning real customer feedback into repeat revenue.",
    url: "https://hashview.co.uk/pricing",
    type: "website",
  },
  twitter: {
    title: "Pricing - HashView Rewards",
    description: "Simple, transparent pricing designed for local businesses.",
  },
  alternates: {
    canonical: "https://hashview.co.uk/pricing",
  },
};

export default function PricingPage() {
  return (
    <div className="relative overflow-hidden min-h-screen pt-20">
      <MouseFollowBackground />
      <PricingContent />
    </div>
  );
}
