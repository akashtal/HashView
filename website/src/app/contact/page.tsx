import { ContactContent } from "@/components/pages/ContactContent";
import { MouseFollowBackground } from "@/components/home/MouseFollowBackground";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Contact Us - HashView Reviews | Get in Touch",
    description: "Contact HashView Reviews for business partnerships, customer support, or inquiries about our verified review platform. Get started with authentic customer feedback today.",
    keywords: [
        "contact HashView", "HashView support", "business partnership",
        "customer service", "HashView contact", "get in touch",
        "business inquiry", "review platform contact"
    ],
    openGraph: {
        title: "Contact HashView Reviews - Get in Touch",
        description: "Contact HashView for business partnerships, customer support, or inquiries about our verified review platform.",
        url: "https://hashview.co.uk/contact",
        type: "website",
    },
    twitter: {
        title: "Contact HashView Reviews - Get in Touch",
        description: "Contact HashView for business partnerships, customer support, or inquiries.",
    },
    alternates: {
        canonical: "https://hashview.co.uk/contact",
    },
};

export default function ContactPage() {
    return (
        <div className="relative overflow-hidden min-h-screen pt-20">
            <MouseFollowBackground />
            <ContactContent />

        </div>
    );
}
