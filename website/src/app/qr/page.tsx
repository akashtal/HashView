"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Globe,
  Smartphone,
  Apple,
  Store,
  Handshake,
  User,
  Mail,
  Instagram,
  Linkedin,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { qrLinks } from "@/lib/qr-links";
import { useSearchParams } from "next/navigation";

// Simple tracking function ready for integration
const trackEvent = (eventName: string, url: string) => {
  console.log(`[Analytics] Tracked: ${eventName} -> ${url}`);
  // Extend this to call the actual analytics endpoint (e.g., Posthog, GA, Custom DB)
};

const QRLinkCard = ({
  href,
  icon: Icon,
  label,
  eventName,
  delay = 0,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  eventName: string;
  delay?: number;
}) => {
  const isExternal = href.startsWith("http");

  const handleClick = () => {
    trackEvent(eventName, href);
  };

  const content = (
    <div className="flex items-center gap-4 w-full bg-card hover:bg-muted border border-border rounded-2xl p-4 transition-all duration-300 shadow-sm hover:shadow-md group active:scale-95">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-hashview-purple/10 to-hashview-orange/10 flex items-center justify-center flex-shrink-0 group-hover:from-hashview-purple group-hover:to-hashview-orange transition-all duration-300">
        <Icon className="w-6 h-6 text-foreground group-hover:text-primary-foreground transition-colors duration-300" />
      </div>
      <span className="font-semibold text-lg text-foreground flex-1">
        {label}
      </span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="w-full"
    >
      {isExternal ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="block w-full"
        >
          {content}
        </a>
      ) : (
        <Link href={href} onClick={handleClick} className="block w-full">
          {content}
        </Link>
      )}
    </motion.div>
  );
};

export default function QRPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-hashview-purple border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <QRPageContent />
    </React.Suspense>
  );
}

function QRPageContent() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    trackEvent("qr_landing_page_view", "/qr");
  }, []);

  // Pass UTM params to internal links
  const attachParams = (baseUrl: string) => {
    if (!mounted || baseUrl.startsWith("http")) return baseUrl;
    const currentParams = searchParams.toString();
    return currentParams ? `${baseUrl}?${currentParams}` : baseUrl;
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center py-12 px-4 sm:px-6">
      {/* Background gradients */}
      <div className="fixed inset-0 bg-gradient-to-br from-hashview-purple/5 via-background to-hashview-orange/5 pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-hashview-purple/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-hashview-orange/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center mb-10"
        >
          <div className="w-24 h-24 bg-card rounded-3xl shadow-xl flex items-center justify-center p-4 mb-6 border border-border">
            <Image src={logo} alt="HashView Logo" width={80} height={80} className="w-full h-auto" />
          </div>
          <h1 className="font-display text-3xl font-bold gradient-text mb-3">
            HashView
          </h1>
          <p className="text-muted-foreground text-lg px-4">
            Transform everyday experiences into opportunities. Real reviews, real rewards, real growth.
          </p>
        </motion.div>

        {/* Links Column */}
        <div className="w-full space-y-4 mb-12">
          <QRLinkCard
            href={attachParams(qrLinks.website)}
            icon={Globe}
            label="HashView Website"
            eventName="website_click"
            delay={0.1}
          />
          <QRLinkCard
            href={qrLinks.googlePlay}
            icon={Smartphone}
            label="Download on Google Play"
            eventName="google_play_click"
            delay={0.2}
          />
          <QRLinkCard
            href={qrLinks.appStore}
            icon={Apple}
            label="Download on App Store"
            eventName="app_store_click"
            delay={0.3}
          />
          <QRLinkCard
            href={attachParams(qrLinks.restaurants)}
            icon={Store}
            label="For Restaurants — Get Started"
            eventName="restaurant_get_started_click"
            delay={0.4}
          />
          <QRLinkCard
            href={attachParams(qrLinks.partners)}
            icon={Handshake}
            label="Partner With HashView"
            eventName="partner_click"
            delay={0.5}
          />
          <QRLinkCard
            href={attachParams(qrLinks.founder)}
            icon={User}
            label="About the Founder"
            eventName="founder_click"
            delay={0.6}
          />
          <QRLinkCard
            href={attachParams(qrLinks.contact)}
            icon={Mail}
            label="Contact Us"
            eventName="contact_click"
            delay={0.7}
          />
        </div>

        {/* Social Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="flex items-center gap-6 pt-6 border-t border-border w-full justify-center"
        >
          <a
            href={qrLinks.instagram}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("instagram_click", qrLinks.instagram)}
            className="w-12 h-12 rounded-full bg-card hover:bg-hashview-purple/10 border border-border flex items-center justify-center text-muted-foreground hover:text-hashview-purple transition-all duration-300"
            aria-label="Instagram"
          >
            <Instagram size={24} />
          </a>
          <a
            href={qrLinks.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("linkedin_click", qrLinks.linkedin)}
            className="w-12 h-12 rounded-full bg-card hover:bg-hashview-purple/10 border border-border flex items-center justify-center text-muted-foreground hover:text-hashview-purple transition-all duration-300"
            aria-label="LinkedIn"
          >
            <Linkedin size={24} />
          </a>
        </motion.div>
      </div>
    </div>
  );
}
