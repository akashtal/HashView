"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { QrCode, MessageSquare, Gift } from "lucide-react";

const steps = [
  {
    icon: QrCode,
    title: "Deploy",
    description: "Register and receive your unique QR stand. Place it on counters or tables in minutes.",
    color: "from-hashview-purple to-hashview-purple-dark",
  },
  {
    icon: MessageSquare,
    title: "Collect",
    description: "Customers scan to win. You get instant, private feedback and public ratings.",
    color: "from-hashview-purple to-hashview-orange",
  },
  {
    icon: Gift,
    title: "Retain",
    description: "Customers receive a time-limited reward, driving them back to your business immediately.",
    color: "from-hashview-orange to-hashview-orange-light",
  },
];

export const HowItWorksSection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section ref={sectionRef} className="py-24 bg-card relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-transparent" />
      
      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-hashview-orange/20 text-hashview-orange text-sm font-medium mb-4">
            How It Works
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Start Your <span className="gradient-text">Business Journey</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Three simple steps to transform your customer engagement and boost your business reputation.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-hashview-purple via-hashview-orange to-hashview-orange-light" />

          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="relative text-center"
            >
              {/* Step number */}
              <motion.div
                initial={{ scale: 0 }}
                animate={isInView ? { scale: 1 } : { scale: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 + 0.3, type: "spring" }}
                className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br p-0.5"
                style={{ backgroundImage: `linear-gradient(135deg, ${step.color === "from-hashview-purple to-hashview-purple-dark" ? "#a855f7, #7c3aed" : step.color === "from-hashview-purple to-hashview-orange" ? "#a855f7, #f97316" : "#f97316, #fb923c"})` }}
              >
                <div className="w-full h-full rounded-2xl bg-card flex items-center justify-center">
                  <step.icon className="w-8 h-8 text-foreground" />
                </div>
              </motion.div>

              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center text-primary-foreground font-bold text-sm">
                {index + 1}
              </div>

              <h3 className="font-display text-2xl font-bold mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
