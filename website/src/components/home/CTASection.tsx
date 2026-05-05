"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  "Get a unique QR code and start collecting real reviews immediately",
  "Customize your rewards — from discounts to freebies",
  "Access valuable customer insights and analytics",
  "Request free stickers and stands anytime",
];

export const CTASection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section ref={sectionRef} className="py-24 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-hashview-purple/20 via-background to-hashview-orange/20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-hashview-purple/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-hashview-orange/30 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Grow Your Business with{" "}
              <span className="gradient-text">Real Reviews</span> &{" "}
              <span className="gradient-text">Loyal Customers</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Join thousands of verified businesses using HashView to collect authentic customer feedback and boost engagement through instant rewards.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass rounded-3xl p-8 md:p-12"
          >
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="font-display text-2xl font-bold mb-6">
                  Start Business Today
                </h3>
                <ul className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                      transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                      <span className="text-muted-foreground">{benefit}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="text-center md:text-right">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="space-y-4"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-3 w-full">
                    <Button variant="outline" className="w-full sm:w-auto flex-1" asChild>
                      <a
                        href="https://apps.apple.com/us/app/hashview/id6756681321"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center"
                      >
                        Download iOS
                      </a>
                    </Button>
                    <Button variant="hero" className="w-full sm:w-auto flex-1" asChild>
                      <a
                        href="https://play.google.com/store/apps/details?id=com.hashview.apps&pcampaignid=web_share"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center"
                      >
                        Download Android
                      </a>
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Available on iOS and Android
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
