import { PrivacyContent } from "@/components/pages/PrivacyContent";
import { MouseFollowBackground } from "@/components/home/MouseFollowBackground";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - HashView Reviews | Data Protection & Privacy",
  description: "Read HashView Reviews' privacy policy to understand how we collect, use, and protect your personal information and data.",
  keywords: [
    "HashView privacy policy", "data protection", "privacy policy",
    "GDPR compliance", "data security", "user privacy"
  ],
  openGraph: {
    title: "Privacy Policy - HashView Reviews",
    description: "Read HashView Reviews' privacy policy to understand how we protect your data.",
    url: "https://hashview.co.uk/privacy",
    type: "website",
  },
  alternates: {
    canonical: "https://hashview.co.uk/privacy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return (
    <div className="relative overflow-hidden min-h-screen pt-20">
      <MouseFollowBackground />
      <PrivacyContent />
    </div>
  );
}

