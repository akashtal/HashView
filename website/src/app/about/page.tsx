import { AboutContent } from "@/components/pages/AboutContent";
import { MouseFollowBackground } from "@/components/home/MouseFollowBackground";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us - HashView Reviews | Our Story & Mission",
  description: "Learn about HashView's mission to transform customer engagement through verified reviews. Founded in 2023 in Wales, we're building the future of authentic customer feedback with real-time verification and instant rewards.",
  keywords: [
    "About HashView", "HashView story", "verified reviews company",
    "customer engagement mission", "Welsh tech startup", "review platform about",
    "HashView team", "customer feedback mission", "authentic reviews vision"
  ],
  openGraph: {
    title: "About HashView Reviews - Our Story & Mission",
    description: "Learn about HashView's mission to transform customer engagement through verified reviews. Founded in 2023 in Wales.",
    url: "https://hashview.co.uk/about",
    type: "website",
  },
  twitter: {
    title: "About HashView Reviews - Our Story & Mission",
    description: "Learn about HashView's mission to transform customer engagement through verified reviews.",
  },
  alternates: {
    canonical: "https://hashview.co.uk/about",
  },
};

export default function AboutPage() {
  return (
    <div className="relative overflow-hidden min-h-screen pt-20">
      <MouseFollowBackground />
      <AboutContent />
    </div>
  );
}
