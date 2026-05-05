"use client";

import { HeroSection } from "@/components/home/HeroSection";
import { IntroSection } from "@/components/home/IntroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { AppShowcaseSection } from "@/components/home/AppShowcaseSection";
import { TeamSection } from "@/components/TeamSection";
import { AchievementSection } from "@/components/AchievementSection";
import { CTASection } from "@/components/home/CTASection";
import { MouseFollowBackground } from "@/components/home/MouseFollowBackground";

export default function Home() {
    const softwareAppSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "HashView Reviews",
        "description": "Verified review platform for businesses to collect authentic, real-time verified customer reviews with instant rewards.",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Android, iOS",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "GBP",
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "1000",
        },
        "url": "https://hashview.co.uk",
        "screenshot": "https://hashview.co.uk/og-image.jpg",
    };

    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "HashView Reviews",
        "alternateName": "HashView",
        "url": "https://hashview.co.uk",
        "logo": "https://hashview.co.uk/logo.png",
        "description": "HashView is a verified review platform that helps businesses collect authentic, real-time verified customer reviews with instant rewards. Trusted by 1000+ businesses in the UK.",
        "foundingDate": "2023",
        "foundingLocation": {
            "@type": "Place",
            "addressCountry": "GB",
            "addressRegion": "Wales",
        },
        "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "Customer Service",
            "email": "info@hashview.co.uk",
            "url": "https://hashview.co.uk/contact",
        },
        "sameAs": [
            "https://www.linkedin.com/company/hashview",
            "https://twitter.com/hashview",
            "https://www.facebook.com/hashview",
            "https://www.instagram.com/hashview",
        ],
        "award": "Accelerator Champion Award - Business Wales Start-Up Accelerator",
    };

    const websiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "HashView Reviews",
        "url": "https://hashview.co.uk",
        "potentialAction": {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://hashview.co.uk/blog?search={search_term_string}",
            },
            "query-input": "required name=search_term_string",
        },
    };

    return (
        <div className="relative overflow-hidden">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
            />
            <MouseFollowBackground />
            <HeroSection />
            <IntroSection />
            <FeaturesSection />
            <HowItWorksSection />
            <AppShowcaseSection />
            <AchievementSection variant="home" />
            <TeamSection variant="home" />
            <CTASection />
        </div>
    );
}
