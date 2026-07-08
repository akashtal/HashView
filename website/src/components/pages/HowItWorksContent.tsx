"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  Smartphone,
  QrCode,
  UtensilsCrossed,
  SlidersHorizontal,
  ShoppingCart,
  ChefHat,
  Smile,
  CreditCard,
  Star,
  Gift,
  Building2,
  FileText,
  Brain,
  Globe,
  Bell,
  LayoutDashboard,
  Tag,
  TrendingUp,
  Clock,
  Leaf,
  Zap,
  MapPin,
  Search,
  Shield,
  Receipt,
  BarChart3,
  Users,
  Package,
  MessageSquare,
  Megaphone,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Download,
  ChevronDown,
  Sparkles,
  BadgePercent,
  HeartHandshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";

// ─────────────────────────────────────────────
//  DATA
// ─────────────────────────────────────────────

const customerSteps = [
  {
    icon: Smartphone,
    title: "Open the App",
    description:
      "Download the HashView app on iOS or Android. Create your free account in seconds and discover nearby verified restaurants instantly.",
    benefits: ["Free account", "Instant discovery", "Nearby restaurants"],
  },
  {
    icon: QrCode,
    title: "Scan the QR Code",
    description:
      "No printed menu needed. Simply scan the QR code on your restaurant table with the HashView app to connect directly to the live digital menu.",
    benefits: ["No menu card needed", "Instant connection", "Table-linked"],
  },
  {
    icon: UtensilsCrossed,
    title: "Browse the Digital Menu",
    description:
      "Explore a beautifully categorised menu with high-quality photos, real prices, active offers, and personalised AI recommendations tailored just for you.",
    benefits: ["Photos & prices", "Live offers", "AI recommendations", "Search & filters"],
  },
  {
    icon: SlidersHorizontal,
    title: "Customise Your Order",
    description:
      "Make it exactly how you like it. Add extras, remove ingredients, choose quantities, and add any special instructions for the kitchen.",
    benefits: ["Add extras", "Remove ingredients", "Special instructions"],
  },
  {
    icon: ShoppingCart,
    title: "Place Your Order",
    description:
      "Tap to confirm. Your order goes directly and instantly to the restaurant's dashboard. You'll receive real-time confirmation on your screen.",
    benefits: ["Instant to kitchen", "Real-time confirmation", "No waiting in queue"],
  },
  {
    icon: ChefHat,
    title: "Restaurant Prepares Your Food",
    description:
      "Track every stage of your order preparation live. The restaurant updates the status in real-time so you always know exactly what's happening.",
    benefits: ["Live status updates", "Transparent process", "No guessing"],
  },
  {
    icon: Smile,
    title: "Enjoy Your Meal",
    description:
      "Your food arrives fresh and exactly as you ordered. Sit back, relax, and enjoy the full dining experience — no queues, no confusion.",
    benefits: ["Food as ordered", "Stress-free dining", "Premium experience"],
  },
  {
    icon: CreditCard,
    title: "Pay at the Counter",
    description:
      "When you're done, simply walk to the counter and pay. No complicated digital payment required — HashView keeps checkout fast and simple.",
    benefits: ["Simple checkout", "No app payment needed", "Fast process"],
  },
  {
    icon: Star,
    title: "Leave Real-Time Feedback",
    description:
      "Rate your meal, review the restaurant, upload photos, and share your experience — all verified as a real, on-site visit. Your voice matters.",
    benefits: ["Verified reviews", "Upload photos", "Rate individual items"],
  },
  {
    icon: Gift,
    title: "Earn Cashback & Rewards",
    description:
      "Every review earns you reward points or instant cashback. Collect points across visits, redeem exclusive coupons, and enjoy personalised offers.",
    benefits: ["Instant cashback", "Loyalty points", "Exclusive coupons"],
  },
];

const businessSteps = [
  {
    icon: Building2,
    title: "Register Your Business",
    description:
      "Create your restaurant account on HashView in minutes. Our verification process ensures only legitimate businesses are listed on the platform.",
    benefits: ["Quick registration", "Business verification", "Secure account"],
  },
  {
    icon: FileText,
    title: "Complete Your Profile",
    description:
      "Add your business information, address, opening hours, images, cuisine categories, and contact details to create a compelling restaurant profile.",
    benefits: ["Full business profile", "Opening hours", "Category setup"],
  },
  {
    icon: Brain,
    title: "Upload Your Menu with AI",
    description:
      "Simply upload your existing menu and our AI automatically detects categories, extracts items, prices, and descriptions. Everything is organised instantly — with manual editing available.",
    benefits: ["AI auto-detection", "Auto-categorisation", "Manual editing"],
  },
  {
    icon: Globe,
    title: "Publish Your Menu Live",
    description:
      "With one click, your menu goes live. A unique QR code is automatically generated for each table. Print and place them — you're ready to receive orders.",
    benefits: ["Instant publishing", "Auto QR generation", "Per-table codes"],
  },
  {
    icon: QrCode,
    title: "Customers Start Scanning",
    description:
      "Your customers scan the QR code at their table and are instantly connected to your live digital menu. Orders start flowing in immediately.",
    benefits: ["Zero customer friction", "Instant menu access", "Live orders"],
  },
  {
    icon: LayoutDashboard,
    title: "Receive Orders on Dashboard",
    description:
      "Every order appears instantly on your CRM dashboard. Manage kitchen workflow, update order statuses, and keep your team organised in real-time.",
    benefits: ["Real-time orders", "Kitchen workflow", "Status management"],
  },
  {
    icon: Package,
    title: "Manage Everything from One Place",
    description:
      "Your comprehensive CRM dashboard handles orders, table management, customer database, menu updates, analytics, invoices, bills, payments, staff, and full business reports.",
    benefits: [
      "Orders & tables",
      "Customer database",
      "Invoices & billing",
      "Analytics & reports",
    ],
  },
  {
    icon: Tag,
    title: "Create Offers & Campaigns",
    description:
      "Launch coupons, percentage discounts, festival deals, combo offers, happy hour specials, and cashback campaigns — all controlled from your dashboard.",
    benefits: ["Coupons & discounts", "Festival offers", "Cashback campaigns", "Happy hours"],
  },
  {
    icon: Bell,
    title: "Push Notifications to Customers",
    description:
      "Send direct promotional notifications to your customer base. Announce weekend specials, today's dishes, flat discounts, new menu launches, and loyalty rewards.",
    benefits: ["Direct to customers", "Promotional messages", "Loyalty rewards"],
  },
  {
    icon: TrendingUp,
    title: "Grow Your Business",
    description:
      "HashView's platform drives repeat visits, increases verified reviews, improves customer engagement, saves staff time, and builds measurable loyalty — helping your revenue grow continuously.",
    benefits: ["More repeat visits", "Higher revenue", "Operational efficiency", "Customer loyalty"],
  },
];

const customerBenefits = [
  { icon: Clock, title: "No Waiting", description: "Order the moment you sit down." },
  { icon: Leaf, title: "Paperless Menu", description: "Eco-friendly digital experience." },
  { icon: Zap, title: "Instant Ordering", description: "Orders sent directly to the kitchen." },
  { icon: MapPin, title: "Real-Time Tracking", description: "Watch your order being prepared." },
  { icon: Gift, title: "Cashback Rewards", description: "Earn every time you dine." },
  { icon: BadgePercent, title: "Exclusive Coupons", description: "Personalised deals just for you." },
  { icon: Sparkles, title: "Personalised Offers", description: "AI-curated recommendations." },
  { icon: CreditCard, title: "Fast Checkout", description: "Simple counter payment, no fuss." },
  { icon: Smartphone, title: "Digital Experience", description: "Premium mobile-first dining." },
  { icon: Star, title: "Easy Reviews", description: "Rate and share in seconds." },
  { icon: HeartHandshake, title: "Modern Dining", description: "The future of restaurant visits." },
];

const businessBenefits = [
  { icon: QrCode, title: "QR Ordering" },
  { icon: LayoutDashboard, title: "CRM Dashboard" },
  { icon: Brain, title: "AI Menu Upload" },
  { icon: Package, title: "Order Management" },
  { icon: Users, title: "Customer Database" },
  { icon: BarChart3, title: "Analytics" },
  { icon: Receipt, title: "Invoice Management" },
  { icon: CreditCard, title: "Billing" },
  { icon: Tag, title: "Coupons & Offers" },
  { icon: Bell, title: "Push Notifications" },
  { icon: Gift, title: "Loyalty Programs" },
  { icon: MessageSquare, title: "Verified Reviews" },
  { icon: TrendingUp, title: "Business Insights" },
  { icon: Clock, title: "Time Saving" },
  { icon: Megaphone, title: "Promotions" },
];

const comparisons = [
  { traditional: "Paper Menus", modern: "Live Digital Menu" },
  { traditional: "Manual Order Taking", modern: "Instant QR Ordering" },
  { traditional: "No Order Tracking", modern: "Real-Time Order Status" },
  { traditional: "No Analytics", modern: "Full Business Dashboard" },
  { traditional: "No Customer Loyalty", modern: "Cashback & Rewards System" },
  { traditional: "Handwritten Bills", modern: "Digital Invoicing & Billing" },
  { traditional: "No Push Marketing", modern: "Direct Customer Notifications" },
  { traditional: "Unverified Reviews", modern: "Real-Time Verified Reviews" },
  { traditional: "Manual Menu Updates", modern: "AI-Powered Menu Upload" },
  { traditional: "No Customer Database", modern: "Full CRM & Customer Insights" },
];

const faqs = [
  {
    q: "What is HashView and how does it work?",
    a: "HashView is a complete restaurant management and customer engagement platform. Customers scan a QR code at their table, browse the digital menu, place orders, track preparation, pay at the counter, and earn cashback rewards. Restaurants manage everything — from incoming orders to analytics — through one CRM dashboard.",
  },
  {
    q: "Do I need to download an app to use HashView as a customer?",
    a: "Yes. The HashView app is available for free on both iOS (App Store) and Android (Google Play). The app enables QR scanning, order placement, real-time tracking, cashback rewards, and leaving verified reviews.",
  },
  {
    q: "How does the QR code ordering system work?",
    a: "Each restaurant table has a unique QR code generated by HashView. When you scan it with the app, you're instantly connected to that restaurant's live digital menu. You browse, customise, and place your order — which goes directly to the kitchen dashboard in real-time.",
  },
  {
    q: "Is there a physical payment integrated into the app?",
    a: "No. HashView is designed for table-service restaurants where customers pay at the counter when ready. The app handles ordering, tracking, and rewards — keeping the checkout process simple and familiar.",
  },
  {
    q: "How does the cashback and rewards system work?",
    a: "After your meal, you leave a verified review through the app. As a real, on-site verified customer, you earn reward points or instant cashback. Points accumulate across visits and can be redeemed for exclusive coupons and personalised offers from restaurants you love.",
  },
  {
    q: "How does a restaurant get started with HashView?",
    a: "Simply register your business on the HashView app, complete your profile, and upload your menu. Our AI automatically categorises and structures your menu. Once you publish, your QR codes are generated and you're ready to start receiving orders.",
  },
  {
    q: "What is the AI menu upload feature?",
    a: "HashView's AI can process your existing menu — whether it's a PDF, image, or document — and automatically detect categories, extract item names, prices, and descriptions, then organise everything into your digital menu. You can then review and edit anything manually.",
  },
  {
    q: "What does the CRM dashboard include for restaurants?",
    a: "The full CRM dashboard includes: live order management, table management, customer database, menu editing, analytics and reporting, invoice and billing management, staff management, coupon and offer creation, push notification campaigns, and complete business profile control.",
  },
  {
    q: "Are the customer reviews verified?",
    a: "Yes. HashView only allows reviews from customers who were physically present at the venue and placed an order through the app. This means every review on your restaurant profile is from a genuine, verified customer — no fake or fraudulent reviews.",
  },
  {
    q: "Is HashView available on both iOS and Android?",
    a: "Yes. The HashView app is available for free download on both iOS (App Store) and Android (Google Play). Both customers and business owners use the same app, with role-specific dashboards and interfaces.",
  },
];

// ─────────────────────────────────────────────
//  ANIMATION VARIANTS
// ─────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: "easeOut" },
  }),
};

const fadeLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: (delay = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, delay, ease: "easeOut" },
  }),
};

const fadeRight = {
  hidden: { opacity: 0, x: 30 },
  visible: (delay = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, delay, ease: "easeOut" },
  }),
};

// ─────────────────────────────────────────────
//  SHARED SECTION HEADER
// ─────────────────────────────────────────────

function SectionHeader({
  badge,
  title,
  titleHighlight,
  description,
  badgeVariant = "purple",
}: {
  badge: string;
  title: string;
  titleHighlight?: string;
  description?: string;
  badgeVariant?: "purple" | "orange";
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const badgeClass =
    badgeVariant === "orange"
      ? "bg-hashview-orange/20 text-hashview-orange"
      : "bg-hashview-purple/20 text-hashview-purple";

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeUp}
      className="text-center mb-16"
    >
      <span className={`inline-block px-4 py-2 rounded-full ${badgeClass} text-sm font-medium mb-4`}>
        {badge}
      </span>
      <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
        {title}{" "}
        {titleHighlight && <span className="gradient-text">{titleHighlight}</span>}
      </h2>
      {description && (
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
          {description}
        </p>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
//  TIMELINE STEP
// ─────────────────────────────────────────────

function TimelineStep({
  step,
  index,
  isLast,
  variant = "customer",
}: {
  step: (typeof customerSteps)[0];
  index: number;
  isLast: boolean;
  variant?: "customer" | "business";
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const isEven = index % 2 === 0;
  const accentFrom = variant === "customer" ? "from-hashview-purple" : "from-hashview-orange";
  const accentTo = variant === "customer" ? "to-hashview-orange" : "to-hashview-purple";

  return (
    <div ref={ref} className="relative flex flex-col md:flex-row items-center gap-0 md:gap-8">
      {/* Vertical connector line */}
      {!isLast && (
        <div
          className={`absolute left-[27px] md:left-1/2 top-14 bottom-0 w-0.5 bg-gradient-to-b ${
            variant === "customer"
              ? "from-hashview-purple/60 to-hashview-orange/30"
              : "from-hashview-orange/60 to-hashview-purple/30"
          } -translate-x-1/2 md:translate-x-0 z-0`}
          style={{ height: "calc(100% + 2rem)" }}
        />
      )}

      {/* Mobile: always left-aligned. Desktop: alternating */}
      <div
        className={`w-full flex flex-row md:flex-row items-start md:items-center gap-4 md:gap-0 ${
          isEven ? "md:flex-row" : "md:flex-row-reverse"
        }`}
      >
        {/* Step number + icon — center column on desktop */}
        <div className="relative flex-shrink-0 z-10 md:absolute md:left-1/2 md:-translate-x-1/2">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2, type: "spring", stiffness: 200 }}
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${accentFrom} ${accentTo} p-0.5 shadow-lg`}
          >
            <div className="w-full h-full rounded-2xl bg-card flex items-center justify-center relative">
              <step.icon className="w-6 h-6 text-foreground" aria-hidden="true" />
              {/* Step number badge */}
              <div
                className={`absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gradient-to-br ${accentFrom} ${accentTo} flex items-center justify-center`}
              >
                <span className="text-[9px] font-bold text-primary-foreground">{index + 1}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Content card — alternates sides on desktop */}
        <motion.div
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={isEven ? fadeLeft : fadeRight}
          custom={0.1}
          className={`flex-1 md:w-[calc(50%-3rem)] ${
            isEven ? "md:mr-auto md:pr-16" : "md:ml-auto md:pl-16"
          } ml-4 md:ml-0`}
        >
          <div className="group p-6 rounded-2xl bg-card border border-border hover:border-hashview-purple/40 transition-all duration-500 hover:shadow-lg hover:shadow-hashview-purple/10">
            {/* Hover gradient overlay */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-hashview-purple/5 to-hashview-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <h3 className="font-display text-xl font-bold mb-3 group-hover:gradient-text transition-all duration-300">
              {step.title}
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4 text-sm">
              {step.description}
            </p>

            {/* Benefit pills */}
            <div className="flex flex-wrap gap-2">
              {step.benefits.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground"
                >
                  <CheckCircle2 className="w-3 h-3 text-hashview-purple flex-shrink-0" aria-hidden="true" />
                  {b}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  BENEFIT CARD
// ─────────────────────────────────────────────

function BenefitCard({
  benefit,
  index,
}: {
  benefit: (typeof customerBenefits)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: (index % 6) * 0.08 }}
      className="group relative p-6 rounded-2xl bg-card border border-border hover:border-hashview-purple/50 transition-all duration-500"
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-hashview-purple/10 to-hashview-orange/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-hashview-purple to-hashview-orange p-0.5 mb-4">
          <div className="w-full h-full rounded-xl bg-card flex items-center justify-center">
            <benefit.icon className="w-5 h-5 text-hashview-purple" aria-hidden="true" />
          </div>
        </div>
        <h3 className="font-display text-lg font-semibold mb-2 group-hover:gradient-text transition-all duration-300">
          {benefit.title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{benefit.description}</p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
//  BUSINESS BENEFIT PILL
// ─────────────────────────────────────────────

function BusinessBenefitPill({
  benefit,
  index,
}: {
  benefit: (typeof businessBenefits)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.4, delay: (index % 8) * 0.06 }}
      className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-card border border-border hover:border-hashview-orange/50 hover:shadow-md hover:shadow-hashview-orange/10 transition-all duration-400 cursor-default"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-hashview-orange to-hashview-purple p-0.5">
        <div className="w-full h-full rounded-xl bg-card flex items-center justify-center">
          <benefit.icon className="w-5 h-5 text-hashview-orange" aria-hidden="true" />
        </div>
      </div>
      <span className="font-display font-semibold text-sm text-center leading-tight">
        {benefit.title}
      </span>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────

export function HowItWorksContent() {
  const heroRef = useRef(null);
  const isHeroInView = useInView(heroRef, { once: true });

  return (
    <>
      {/* ═══════════════════════════════════════════
          SECTION 1: HERO
      ═══════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative py-16 md:py-24 overflow-hidden"
        aria-labelledby="hero-heading"
      >
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-hashview-purple/10 via-background to-background" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-hashview-purple/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-hashview-orange/15 rounded-full blur-[100px]" />

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
            >
              <Sparkles className="w-4 h-4 text-hashview-orange" aria-hidden="true" />
              <span className="text-sm text-muted-foreground font-medium">The Complete Platform</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              id="hero-heading"
              initial={{ opacity: 0, y: 30 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
            >
              Dining Made{" "}
              <span className="gradient-text">Smarter</span>{" "}
              for Everyone
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Customers order instantly using QR codes and earn cashback rewards for every verified
              review. Restaurants manage everything — orders, customers, analytics, and promotions —
              from one intelligent dashboard.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              <Button variant="hero" size="xl" asChild>
                <a
                  href="https://play.google.com/store/apps/details?id=com.hashview.apps&pcampaignid=web_share"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="w-5 h-5" aria-hidden="true" />
                  Download the App
                </a>
              </Button>
              <Button variant="hero-outline" size="xl" asChild>
                <Link href="#for-businesses">
                  Register Your Business
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </Link>
              </Button>
            </motion.div>

            {/* Visual element — floating icon cluster */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative max-w-lg mx-auto"
            >
              <div className="relative w-full aspect-[4/3] flex items-center justify-center">
                {/* Central orb */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-hashview-purple/10 to-hashview-orange/10 blur-xl animate-pulse-glow" />
                <div className="relative z-10 w-28 h-28 rounded-2xl bg-gradient-to-br from-hashview-purple to-hashview-orange p-0.5 glow-mixed">
                  <div className="w-full h-full rounded-2xl bg-card flex items-center justify-center">
                    <QrCode className="w-14 h-14 text-hashview-purple" aria-hidden="true" />
                  </div>
                </div>

                {/* Orbiting icons */}
                {[
                  { icon: Smartphone, pos: "top-0 left-1/4", delay: 0 },
                  { icon: ChefHat, pos: "top-0 right-1/4", delay: 0.5 },
                  { icon: Star, pos: "bottom-0 left-1/4", delay: 1 },
                  { icon: Gift, pos: "bottom-0 right-1/4", delay: 1.5 },
                  { icon: BarChart3, pos: "top-1/2 left-0 -translate-y-1/2", delay: 0.25 },
                  { icon: Bell, pos: "top-1/2 right-0 -translate-y-1/2", delay: 0.75 },
                ].map(({ icon: Icon, pos, delay }) => (
                  <motion.div
                    key={pos}
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 3 + delay,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay,
                    }}
                    className={`absolute ${pos} w-14 h-14 rounded-xl glass flex items-center justify-center`}
                  >
                    <Icon className="w-7 h-7 text-hashview-purple" aria-hidden="true" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTIONS 2–5: TWO-COLUMN SPLIT
          Left = Customers | Right = Businesses
      ═══════════════════════════════════════════ */}
      <section
        id="how-it-works-split"
        className="py-12 md:py-20 relative"
        aria-label="How It Works for Customers and Businesses"
      >
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-64 h-64 md:w-96 md:h-96 bg-hashview-purple/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 md:w-96 md:h-96 bg-hashview-orange/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          {/* Shared top header */}
          <SectionHeader
            badge="How It Works"
            title="Built for"
            titleHighlight="Everyone"
            description="Whether you're coming in for a meal or running the kitchen — HashView works seamlessly for both sides of the table."
            badgeVariant="purple"
          />

          {/* ── MOBILE / TABLET: Tab switcher (< lg) ── */}
          <SplitTabView />

          {/* ── DESKTOP: True side-by-side (lg+) ── */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-0 rounded-3xl border border-border shadow-xl shadow-black/5 overflow-clip">

            {/* LEFT: CUSTOMERS */}
            <div
              id="for-customers"
              className="relative bg-card border-r border-border flex flex-col"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-hashview-purple/5 via-transparent to-transparent pointer-events-none" />

              {/* Column header */}
              <div className="sticky top-16 z-10 backdrop-blur-md bg-card/90 border-b border-border px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-hashview-purple/15 text-hashview-purple text-[11px] font-semibold mb-0.5">
                      For Customers
                    </span>
                    <h2 className="font-display text-lg font-bold leading-tight">
                      Your Perfect Dining{" "}
                      <span className="gradient-text">Experience</span>
                    </h2>
                  </div>
                </div>
              </div>

              <div className="relative px-5 py-6 space-y-5 flex-1">
                {customerSteps.map((step, index) => (
                  <TimelineStepSimple
                    key={step.title}
                    step={step}
                    index={index}
                    isLast={index === customerSteps.length - 1}
                    variant="customer"
                  />
                ))}
              </div>
              <CustomerBenefitsInline />
            </div>

            {/* RIGHT: BUSINESSES */}
            <div
              id="for-businesses"
              className="relative bg-card flex flex-col"
            >
              <div className="absolute inset-0 bg-gradient-to-bl from-hashview-orange/5 via-transparent to-transparent pointer-events-none" />

              {/* Column header */}
              <div className="sticky top-16 z-10 backdrop-blur-md bg-card/90 border-b border-border px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-hashview-orange to-hashview-purple flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-hashview-orange/15 text-hashview-orange text-[11px] font-semibold mb-0.5">
                      For Businesses
                    </span>
                    <h2 className="font-display text-lg font-bold leading-tight">
                      Run Your Restaurant{" "}
                      <span className="gradient-text">Smarter</span>
                    </h2>
                  </div>
                </div>
              </div>

              <div className="relative px-5 py-6 space-y-5 flex-1">
                {businessSteps.map((step, index) => (
                  <TimelineStepSimple
                    key={step.title}
                    step={step}
                    index={index}
                    isLast={index === businessSteps.length - 1}
                    variant="business"
                  />
                ))}
              </div>
              <BusinessBenefitsInline />
            </div>
          </div>
        </div>
      </section>


      {/* ═══════════════════════════════════════════
          SECTION 6: COMPARISON TABLE
      ═══════════════════════════════════════════ */}
      <section
        className="py-16 md:py-24 bg-card relative overflow-hidden"
        aria-label="Traditional vs HashView comparison"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-hashview-purple/5 via-background/50 to-hashview-orange/5" />

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <SectionHeader
            badge="See The Difference"
            title="Traditional Restaurant"
            titleHighlight="vs HashView"
            description="See exactly what changes when a restaurant adopts the HashView platform."
            badgeVariant="purple"
          />

          <div className="max-w-4xl mx-auto">
            {/* Column headers */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <XCircle className="w-5 h-5 text-destructive" aria-hidden="true" />
                  <span className="font-display font-bold text-lg">Traditional</span>
                </div>
                <p className="text-muted-foreground text-sm">Old way of doing things</p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-hashview-purple/10 to-hashview-orange/10 border border-hashview-purple/20 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-hashview-purple" aria-hidden="true" />
                  <span className="font-display font-bold text-lg gradient-text">With HashView</span>
                </div>
                <p className="text-muted-foreground text-sm">Modern, intelligent platform</p>
              </div>
            </div>

            {/* Comparison rows */}
            <div className="space-y-3">
              {comparisons.map((row, index) => (
                <ComparisonRow
                  key={row.traditional}
                  row={row}
                  index={index}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 7: FAQ
      ═══════════════════════════════════════════ */}
      <section
        id="faq"
        className="py-16 md:py-24 relative overflow-hidden"
        aria-labelledby="faq-heading"
      >
        <div className="absolute top-1/4 left-0 w-80 h-80 bg-hashview-purple/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-hashview-orange/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <SectionHeader
            badge="Got Questions?"
            title="Frequently Asked"
            titleHighlight="Questions"
            description="Everything you need to know about HashView — for customers and business owners."
            badgeVariant="purple"
          />

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-3" id="faq-heading">
              {faqs.map((faq, index) => {
                return (
                  <FaqItem key={index} faq={faq} index={index} />
                );
              })}
            </Accordion>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 8: FINAL CTA
      ═══════════════════════════════════════════ */}
      <section
        className="py-16 md:py-24 relative overflow-hidden"
        aria-labelledby="cta-heading"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-hashview-purple/20 via-background to-hashview-orange/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-hashview-purple/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-hashview-orange/30 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto">
            <CtaSection />
          </div>
        </div>
      </section>
    </>
  );
}

// ─────────────────────────────────────────────
//  SPLIT TAB VIEW (mobile / tablet < lg)
// ─────────────────────────────────────────────

function SplitTabView() {
  const [activeTab, setActiveTab] = useState<"customer" | "business">("customer");

  return (
    <div className="lg:hidden mb-8">
      {/* Tab pills */}
      <div className="flex gap-2 p-1 rounded-2xl bg-card border border-border mb-6">
        <button
          onClick={() => setActiveTab("customer")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-display font-semibold text-sm transition-all duration-300 ${
            activeTab === "customer"
              ? "bg-gradient-to-r from-hashview-purple to-hashview-orange text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Smartphone className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>For Customers</span>
        </button>
        <button
          onClick={() => setActiveTab("business")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-display font-semibold text-sm transition-all duration-300 ${
            activeTab === "business"
              ? "bg-gradient-to-r from-hashview-orange to-hashview-purple text-primary-foreground shadow-md"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>For Businesses</span>
        </button>
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        {/* Content header */}
        <div
          className={`px-4 sm:px-6 py-4 border-b border-border ${
            activeTab === "customer"
              ? "bg-gradient-to-r from-hashview-purple/10 to-transparent"
              : "bg-gradient-to-r from-hashview-orange/10 to-transparent"
          }`}
        >
          <span
            className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold mb-1 ${
              activeTab === "customer"
                ? "bg-hashview-purple/15 text-hashview-purple"
                : "bg-hashview-orange/15 text-hashview-orange"
            }`}
          >
            {activeTab === "customer" ? "For Customers" : "For Businesses"}
          </span>
          <h3 className="font-display text-lg sm:text-xl font-bold">
            {activeTab === "customer" ? (
              <>Your Perfect Dining <span className="gradient-text">Experience</span></>
            ) : (
              <>Run Your Restaurant <span className="gradient-text">Smarter</span></>
            )}
          </h3>
        </div>

        {/* Timeline steps */}
        <div className="px-4 sm:px-6 py-6 space-y-5">
          {(activeTab === "customer" ? customerSteps : businessSteps).map((step, index, arr) => (
            <TimelineStepSimple
              key={step.title}
              step={step}
              index={index}
              isLast={index === arr.length - 1}
              variant={activeTab}
            />
          ))}
        </div>

        {/* Benefits */}
        {activeTab === "customer" ? <CustomerBenefitsInline /> : <BusinessBenefitsInline />}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  TIMELINE STEP SIMPLE (single-column, no alternating)
// ─────────────────────────────────────────────

function TimelineStepSimple({
  step,
  index,
  isLast,
  variant = "customer",
}: {
  step: (typeof customerSteps)[0];
  index: number;
  isLast: boolean;
  variant?: "customer" | "business";
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const accentFrom = variant === "customer" ? "from-hashview-purple" : "from-hashview-orange";
  const accentTo = variant === "customer" ? "to-hashview-orange" : "to-hashview-purple";

  return (
    <div ref={ref} className="relative flex gap-4">
      {/* Left: connector + icon */}
      <div className="flex flex-col items-center flex-shrink-0">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.1, type: "spring", stiffness: 250 }}
          className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${accentFrom} ${accentTo} p-0.5 shadow-md flex-shrink-0`}
        >
          <div className="w-full h-full rounded-xl bg-card flex items-center justify-center">
            <step.icon className="w-5 h-5 text-foreground" aria-hidden="true" />
          </div>
          {/* Step number badge */}
          <div
            className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gradient-to-br ${accentFrom} ${accentTo} flex items-center justify-center shadow-sm`}
          >
            <span className="text-[8px] font-bold text-primary-foreground leading-none">{index + 1}</span>
          </div>
        </motion.div>

        {/* Vertical line */}
        {!isLast && (
          <div
            className={`w-0.5 flex-1 mt-2 bg-gradient-to-b ${
              variant === "customer"
                ? "from-hashview-purple/40 to-hashview-orange/20"
                : "from-hashview-orange/40 to-hashview-purple/20"
            } min-h-[1.5rem]`}
          />
        )}
      </div>

      {/* Right: content */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.15 }}
        className={`group flex-1 pb-6 ${isLast ? "pb-0" : ""}`}
      >
        <h3 className="font-display font-bold text-base mb-1 leading-snug group-hover:gradient-text transition-all duration-300">
          {step.title}
        </h3>
        <p className="text-muted-foreground text-xs leading-relaxed mb-2">
          {step.description}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {step.benefits.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
            >
              <CheckCircle2
                className={`w-2.5 h-2.5 flex-shrink-0 ${
                  variant === "customer" ? "text-hashview-purple" : "text-hashview-orange"
                }`}
                aria-hidden="true"
              />
              {b}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  CUSTOMER BENEFITS INLINE (inside left column)
// ─────────────────────────────────────────────

function CustomerBenefitsInline() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div ref={ref} className="border-t border-border px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="mb-5"
      >
        <span className="inline-block px-3 py-1 rounded-full bg-hashview-orange/15 text-hashview-orange text-xs font-semibold mb-2">
          Why Customers Love It
        </span>
        <h3 className="font-display text-lg font-bold">
          Everything You Get{" "}
          <span className="gradient-text">as a Customer</span>
        </h3>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {customerBenefits.map((benefit, index) => (
          <motion.div
            key={benefit.title}
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: (index % 6) * 0.06 }}
            className="flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border hover:border-hashview-purple/40 transition-all duration-300 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-hashview-purple to-hashview-orange p-0.5 flex-shrink-0 mt-0.5">
              <div className="w-full h-full rounded-lg bg-card flex items-center justify-center">
                <benefit.icon className="w-3.5 h-3.5 text-hashview-purple" aria-hidden="true" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-xs leading-tight group-hover:gradient-text transition-all duration-300">
                {benefit.title}
              </p>
              <p className="text-muted-foreground text-[10px] leading-tight mt-0.5 line-clamp-2">
                {benefit.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  BUSINESS BENEFITS INLINE (inside right column)
// ─────────────────────────────────────────────

function BusinessBenefitsInline() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div ref={ref} className="border-t border-border px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="mb-5"
      >
        <span className="inline-block px-3 py-1 rounded-full bg-hashview-purple/15 text-hashview-purple text-xs font-semibold mb-2">
          Everything in One Platform
        </span>
        <h3 className="font-display text-lg font-bold">
          Complete Business{" "}
          <span className="gradient-text">Toolkit</span>
        </h3>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {businessBenefits.map((benefit, index) => (
          <motion.div
            key={benefit.title}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.35, delay: (index % 8) * 0.05 }}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background border border-border hover:border-hashview-orange/40 transition-all duration-300 group text-center"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-hashview-orange to-hashview-purple p-0.5">
              <div className="w-full h-full rounded-lg bg-card flex items-center justify-center">
                <benefit.icon className="w-4 h-4 text-hashview-orange" aria-hidden="true" />
              </div>
            </div>
            <span className="font-display font-semibold text-[10px] leading-tight group-hover:gradient-text transition-all duration-300">
              {benefit.title}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  COMPARISON ROW (extracted to avoid hook-in-loop)
// ─────────────────────────────────────────────

function ComparisonRow({
  row,
  index,
}: {
  row: { traditional: string; modern: string };
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.4, delay: (index % 5) * 0.07 }}
      className="grid grid-cols-2 gap-4"
    >
      <div className="p-4 rounded-xl bg-background border border-border flex items-center gap-3">
        <XCircle className="w-4 h-4 text-destructive flex-shrink-0" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">{row.traditional}</span>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-r from-hashview-purple/10 to-hashview-orange/10 border border-hashview-purple/20 flex items-center gap-3">
        <CheckCircle2 className="w-4 h-4 text-hashview-purple flex-shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium">{row.modern}</span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
//  FAQ ITEM (extracted to avoid hook-in-loop)
// ─────────────────────────────────────────────

function FaqItem({ faq, index }: { faq: (typeof faqs)[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: (index % 5) * 0.08 }}
    >
      <AccordionItem
        value={`item-${index}`}
        className="border border-border rounded-xl px-6 bg-card data-[state=open]:border-hashview-purple/50 data-[state=open]:shadow-lg data-[state=open]:shadow-hashview-purple/10 transition-all duration-300"
      >
        <AccordionTrigger className="font-display font-semibold text-left hover:no-underline hover:text-hashview-purple transition-colors duration-300 py-5">
          {faq.q}
        </AccordionTrigger>
        <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
          {faq.a}
        </AccordionContent>
      </AccordionItem>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
//  CTA SECTION (extracted for clean animation)
// ─────────────────────────────────────────────

function CtaSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const ctaBenefits = [
    "Free to download on iOS & Android",
    "Start earning cashback from your first visit",
    "Register your restaurant in minutes",
    "AI-powered menu upload — no manual data entry",
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7 }}
    >
      <div className="text-center mb-12">
        <h2
          id="cta-heading"
          className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6"
        >
          Ready to Transform Your{" "}
          <span className="gradient-text">Dining Experience?</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Whether you&apos;re a customer who loves great food or a restaurant owner ready to
          grow — HashView is built for you.
        </p>
      </div>

      <div className="glass rounded-3xl p-8 md:p-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Benefits list */}
          <div>
            <h3 className="font-display text-2xl font-bold mb-6">Get Started Today</h3>
            <ul className="space-y-4">
              {ctaBenefits.map((benefit, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-primary-foreground" aria-hidden="true" />
                  </div>
                  <span className="text-muted-foreground">{benefit}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="text-center md:text-right">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-end gap-3">
                <Button variant="hero" size="lg" className="w-full sm:w-auto" asChild>
                  <a
                    href="https://apps.apple.com/us/app/hashview/id6756681321"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    Download iOS
                  </a>
                </Button>
                <Button variant="hero" size="lg" className="w-full sm:w-auto" asChild>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.hashview.apps&pcampaignid=web_share"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                    Download Android
                  </a>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Free on iOS and Android</p>
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground mb-3">Restaurant owner?</p>
                <Button variant="hero-outline" size="default" className="w-full sm:w-auto" asChild>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.hashview.apps&pcampaignid=web_share"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    Register Your Business
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
