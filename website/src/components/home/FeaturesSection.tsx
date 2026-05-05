"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import {
  RotateCcw,
  MapPin,
  Clock,
  Gamepad2,
  Settings,
  Sparkles
} from "lucide-react";

const features = [
  {
    icon: RotateCcw,
    title: "Boost Repeat Visits",
    description: "Rewards expire in 2 hours – encouraging customers to engage and return sooner.",
  },
  {
    icon: MapPin,
    title: "Digital Boundaries",
    description: "Eliminate fake reviews. Our location technology ensures only customers physically inside your store can leave feedback.",
  },
  {
    icon: Clock,
    title: "Real Time Feedback",
    description: "Only people near at the location can post reviews. It's trust you can count on.",
  },
  {
    icon: Gamepad2,
    title: "Gamified Customer Retention",
    description: "Our digital scratch cards create excitement, ensuring customers return within 2 hours to redeem their offers.",
  },
  {
    icon: Settings,
    title: "Smart Campaign Control",
    description: "You control the budget. Set custom offers—from free coffees to percentage discounts—that fit your margins.",
  },
  {
    icon: Sparkles,
    title: "Instant Rewards",
    description: "Customers scan to win. You get instant, private feedback and public ratings.",
  },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0]; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative p-6 rounded-2xl bg-card border border-border hover:border-hashview-purple/50 transition-all duration-500"
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-hashview-purple/10 to-hashview-orange/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-hashview-purple to-hashview-orange p-0.5 mb-6">
          <div className="w-full h-full rounded-xl bg-card flex items-center justify-center">
            <feature.icon className="w-6 h-6 text-hashview-purple" />
          </div>
        </div>

        <h3 className="font-display text-xl font-semibold mb-3 text-foreground group-hover:gradient-text transition-all duration-300">
          {feature.title}
        </h3>

        <p className="text-muted-foreground leading-relaxed">
          {feature.description}
        </p>
      </div>
    </motion.div>
  );
};

export const FeaturesSection = () => {
  const headerRef = useRef(null);
  const isHeaderInView = useInView(headerRef, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-hashview-purple/10 rounded-full blur-3xl -translate-y-1/2" />
      <div className="absolute top-1/2 right-0 w-72 h-72 bg-hashview-orange/10 rounded-full blur-3xl -translate-y-1/2" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-hashview-purple/20 text-hashview-purple text-sm font-medium mb-4">
            Best Features
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Features <span className="gradient-text">Never Stop</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            We&apos;re not your average review app. HashView is a next-gen customer engagement platform that transforms everyday experiences into opportunities.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};
