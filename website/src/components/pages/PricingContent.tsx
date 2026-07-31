"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, HelpCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CTASection } from "@/components/home/CTASection";
import { SurveyModal } from "@/components/home/SurveyModal";
import { PartnerSurveyModal } from "@/components/home/PartnerSurveyModal";

const faqs = [
  {
    question: "Do I need to buy special hardware?",
    answer: "Not at all! We provide you with beautifully designed physical QR code stands. Just place them on your tables or counters, and customers use their own smartphones to scan and review.",
  },
  {
    question: "Am I locked into a long-term contract?",
    answer: "No. Our Growth plan is billed month-to-month, and you can cancel anytime. If you choose annual billing to get the 20% discount, that entails a one-year commitment.",
  },
  {
    question: "How do the instant rewards work?",
    answer: "You decide the reward (e.g., a free coffee, or 10% off the next order). When a customer leaves a verified review, they receive a digital scratch card unlocking your offer, which expires in 2 hours to encourage an immediate return!",
  },
  {
    question: "Can I change my reward offers later?",
    answer: "Absolutely. With the Growth plan, you have smart campaign control to adjust your offers instantly through your dashboard.",
  },
];

export function PricingContent() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [partnerSurveyOpen, setPartnerSurveyOpen] = useState(false);

  return (
    <>
      <section className="py-16 md:py-24 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-hashview-purple/10 to-transparent" />
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-hashview-purple/20 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-hashview-orange/20 rounded-full blur-3xl -z-10" />

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center mb-16"
          >
            <span className="inline-block px-4 py-2 rounded-full bg-hashview-purple/20 text-hashview-purple text-sm font-medium mb-6">
              Pricing Plans
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Pricing that Pays for Itself in{" "}
              <span className="gradient-text">Repeat Visits</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-10">
              Start turning real feedback into revenue today. No hidden fees, just simple pricing designed for local businesses of all sizes.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <span className={`text-sm font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
              <Switch checked={isAnnual} onCheckedChange={setIsAnnual} className="data-[state=checked]:bg-hashview-purple" />
              <span className={`text-sm font-medium flex items-center gap-2 ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
                Annually
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-hashview-orange/20 text-hashview-orange">
                  {/*          Save 20% */}
                </span>
              </span>
            </div>

            {/* Free Trial Banner */}
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-green-100 text-green-700 text-sm font-bold shadow-sm border border-green-200">
                🎁 30 Days Free Trial on all paid plans!
              </span>
            </div>
          </motion.div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-24">
            {/* Starter Plan */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="relative p-8 rounded-3xl bg-card border border-border flex flex-col"
            >
              <div className="mb-6">
                <h3 className="font-display text-2xl font-bold mb-2">Starter</h3>
                <p className="text-muted-foreground text-sm">For small businesses ready to grow.</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">£0</span>
                </div>
                <div className="flex flex-col gap-2 mt-1">
                  <span className="text-muted-foreground text-sm">/mo</span>
                  <span className="text-sm font-bold text-green-600 bg-green-50 self-start px-2 py-0.5 rounded border border-green-100">
                    + 30 Days Free Trial
                  </span>
                </div>
              </div>
              <Button onClick={() => setSurveyOpen(true)} className="w-full mb-8" variant="outline">
                Start 30-Day Free Trial
              </Button>
              <div className="space-y-4 flex-grow">
                <p className="text-sm font-medium text-foreground mb-4">Features Include:</p>
                {[
                  "1 Physical Location",
                  "Standard QR Code Stand",
                  "1 Active Coupons Campaign",
                  "Limit: 50 review scans per month",
                ].map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Growth Plan */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative p-8 rounded-3xl bg-background border-2 border-hashview-purple transform md:scale-105 shadow-2xl flex flex-col z-10"
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-hashview-purple to-hashview-orange text-white text-xs font-bold uppercase tracking-wider">
                Most Popular
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-hashview-purple/5 to-transparent rounded-3xl pointer-events-none" />

              <div className="mb-6 relative z-10">
                <h3 className="font-display text-2xl font-bold mb-2">Growth</h3>
                <p className="text-muted-foreground text-sm">For established venues maximizing retention.</p>
              </div>
              <div className="mb-6 relative z-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">£{isAnnual ? "228" : "19"}</span>
                  <span className="text-xl text-muted-foreground line-through decoration-hashview-orange/50">£{isAnnual ? "468" : "39"}</span>
                </div>
                <div className="flex flex-col gap-2 mt-1">
                  <span className="text-muted-foreground text-sm">/mo {isAnnual ? "billed annually" : "per location"}</span>
                  <span className="text-sm font-bold text-green-600 bg-green-50 self-start px-2 py-0.5 rounded border border-green-100">
                    + 30 Days Free Trial
                  </span>
                </div>
              </div>
              <Button onClick={() => setSurveyOpen(true)} className="w-full mb-8 relative z-10" variant="hero">
                Start 30-Day Free Trial
              </Button>
              <div className="space-y-4 flex-grow relative z-10">
                <p className="text-sm font-medium text-foreground mb-4">Everything in Starter, plus:</p>
                {[
                  "Unlimited Reviews",
                  "Unlimited Active Coupons Campaigns",
                  "Send Push Notifications to users",
                  "Advanced Analytics & Insights Dashboard",
                  "Customer retension tools",
                ].map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-hashview-orange shrink-0 mt-0.5" />
                    <span className="text-foreground text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Enterprise Plan */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="relative p-8 rounded-3xl bg-card border border-border flex flex-col"
            >
              <div className="mb-6">
                <h3 className="font-display text-2xl font-bold mb-2">Enterprise</h3>
                <p className="text-muted-foreground text-sm">For multi-location franchises & groups.</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">Custom</span>
                <div className="flex flex-col gap-2 mt-1">
                  <span className="text-sm font-bold text-green-600 bg-green-50 self-start px-2 py-0.5 rounded border border-green-100 mt-2">
                    + 30 Days Free Trial
                  </span>
                </div>
              </div>
              <Button onClick={() => setPartnerSurveyOpen(true)} className="w-full mb-8" variant="outline">
                Start 30-Day Free Trial
              </Button>

            </motion.div>
          </div>

          {/* Feature Comparison Table */}
          <div className="max-w-4xl mx-auto mb-24">
            <h2 className="font-display text-3xl font-bold text-center mb-10">Compare plans feature by feature</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-4 px-6 font-semibold text-muted-foreground">Feature</th>
                    <th className="py-4 px-6 font-semibold text-center">Starter</th>
                    <th className="py-4 px-6 font-semibold text-center text-hashview-purple">Growth</th>
                    <th className="py-4 px-6 font-semibold text-center">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { name: "Locations", starter: "1", growth: "1 (Add more for £19/ea)", enterprise: "Unlimited" },
                    { name: "Review Scans", starter: "50 / month", growth: "Unlimited", enterprise: "Unlimited" },
                    { name: "Active Campaigns", starter: "1", growth: "3", enterprise: "Unlimited" },
                    { name: "Digital Scratch Cards", starter: "Yes", growth: "Yes (Customizable)", enterprise: "Yes (White-labeled)" },
                    { name: "Analytics Dashboard", starter: "Basic", growth: "Advanced", enterprise: "Multi-location" },
                    { name: "Support", starter: "Email", growth: "Priority", enterprise: "Dedicated Manager" },
                  ].map((row) => (
                    <tr key={row.name} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6 text-sm font-medium">{row.name}</td>
                      <td className="py-4 px-6 text-sm text-muted-foreground text-center">{row.starter}</td>
                      <td className="py-4 px-6 text-sm text-foreground font-medium text-center">{row.growth}</td>
                      <td className="py-4 px-6 text-sm text-muted-foreground text-center">{row.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQs */}
          <div className="max-w-3xl mx-auto mb-24">
            <h2 className="font-display text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left font-medium text-lg">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CTASection />

      {/* Survey Modals */}
      <SurveyModal open={surveyOpen} onOpenChange={setSurveyOpen} />
      <PartnerSurveyModal open={partnerSurveyOpen} onOpenChange={setPartnerSurveyOpen} />
    </>
  );
}
