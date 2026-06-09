"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Star, Users, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CSSHashtagScene } from "@/components/3d/CSSHashtagScene";
import { ContactModal } from "@/components/home/ContactModal";
import { PartnerSurveyModal } from "@/components/home/PartnerSurveyModal";
import { PromoVideo } from "@/components/home/PromoVideo";
import Image from "next/image";
import logo from "@/assets/logo.png";

const stats = [
  // { icon: Download, value: "50K+", label: "App Downloads" },
  // { icon: Users, value: "10X+", label: "More Users" },
  // { icon: Star, value: "4.9", label: "App Rating" },
];

export const HeroSection = () => {
  const [contactOpen, setContactOpen] = useState(false);
  const [partnerSurveyOpen, setPartnerSurveyOpen] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-hashview-purple/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-hashview-orange/20 rounded-full blur-3xl" />

      {/* Animated Hashtag Scene */}
      <CSSHashtagScene />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
          >
            <Image src={logo} alt="HashView Logo" width={20} height={20} className="w-5 h-5" />
            <span className="w-2 h-2 rounded-full bg-hashview-orange animate-pulse" />
            <span className="text-sm text-muted-foreground">Best App Performance</span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
          >
            Turn Real Feedback into{" "}
            <span className="gradient-text">Repeat Revenue</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            The automated customer engagement platform that trades instant rewards for verified, real-time reviews. Boost retention and grow your reputation—effortlessly.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            <a>would you like to collect verified reviews for free </a>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
          >
            <Button variant="hero" size="xl" onClick={() => setContactOpen(true)}>
              Get Your Free QR Code
              <ArrowRight className="ml-2" />
            </Button>
            <Button variant="hero-outline" size="xl" onClick={() => setPartnerSurveyOpen(true)}>
              Partner With Us
            </Button>
          </motion.div>

          {/* Promo Video Showcase */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="w-full max-w-4xl mx-auto mb-16 px-4 md:px-0"
          >
            <PromoVideo />
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="grid grid-cols-3 gap-8 max-w-xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                className="text-center"
              >
                <div className="flex items-center justify-center mb-2">
                  <stat.icon className="w-5 h-5 text-hashview-orange mr-2" />
                  <span className="font-display text-2xl md:text-3xl font-bold gradient-text">
                    {stat.value}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
        >
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-2.5 rounded-full bg-hashview-purple"
          />
        </motion.div>
      </motion.div>

      {/* Modals */}
      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />
      <PartnerSurveyModal open={partnerSurveyOpen} onOpenChange={setPartnerSurveyOpen} />
    </section>
  );
};
