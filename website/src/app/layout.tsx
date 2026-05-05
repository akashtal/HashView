import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ConditionalLayout } from "@/components/ConditionalLayout";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
    metadataBase: new URL("https://hashview.co.uk"),
    title: {
        default: "HashView Reviews - Verified Reviews & Customer Engagement Platform | Get Real Rewards",
        template: "%s | HashView Reviews",
    },
    description: "HashView is the #1 verified review platform for businesses. Get authentic, real-time reviews with instant rewards. Trusted by 1000+ businesses in the UK. Only verified reviews from real customers at your venue.",
    keywords: [
        "HashView", "HashView Reviews", "verified reviews", "customer reviews",
        "real time-verified reviews", "authentic reviews", "review platform", "customer engagement",
        "business reviews", "online reviews", "verified customer feedback", "review management",
        "customer feedback platform", "local business reviews", "restaurant reviews",
        "reward platform", "instant rewards", "customer rewards", "review rewards",
        "UK reviews", "Welsh entrepreneurs", "review verification", "trust engine",
        "customer engagement platform", "business reputation", "online reputation management",
        "real reviews", "genuine reviews", "verified testimonials"
    ],
    authors: [{ name: "HashView Team", url: "https://hashview.co.uk/about" }],
    creator: "HashView Reviews",
    publisher: "HashView Reviews",
    applicationName: "HashView Reviews",
    referrer: "origin-when-cross-origin",
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    alternates: {
        canonical: "https://hashview.co.uk",
    },
    openGraph: {
        type: "website",
        locale: "en_GB",
        url: "https://hashview.co.uk",
        siteName: "HashView Reviews",
        title: "HashView Reviews - Verified Reviews & Customer Engagement Platform",
        description: "Get authentic, real-time verified customer reviews with instant rewards. Trusted by 1000+ businesses. Only verified reviews from real customers.",
        images: [
            {
                url: "/og-image.jpg",
                width: 1200,
                height: 630,
                alt: "HashView Reviews - Verified Review Platform",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "HashView Reviews - Verified Reviews & Customer Engagement",
        description: "Get authentic, real-time verified customer reviews with instant rewards. Trusted by 1000+ businesses in the UK.",
        images: ["/og-image.jpg"],
        creator: "@hashview",
        site: "@hashview",
    },
    robots: {
        index: true,
        follow: true,
        nocache: false,
        googleBot: {
            index: true,
            follow: true,
            noimageindex: false,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    verification: {
        // Add your verification codes here when available
        // google: "your-google-verification-code",
        // yandex: "your-yandex-verification-code",
        // yahoo: "your-yahoo-verification-code",
    },
    category: "Technology",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground`}
            >
                <Providers>
                    <ConditionalLayout>{children}</ConditionalLayout>
                </Providers>
            </body>
        </html>
    );
}
