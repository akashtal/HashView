"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { MessageCircle, MapPin, Gift, RotateCcw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

import logo from "@/assets/logo.png";

const highlights = [
  { icon: MessageCircle, text: "Real Reviews, Real Rewards" },
  { icon: MapPin, text: "Real Time Feedback" },
  { icon: Gift, text: "Scratch, Win, Redeem" },
  { icon: RotateCcw, text: "Boost Repeat Visits" },
];

export const IntroSection = () => {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section ref={sectionRef} className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-2 rounded-full bg-hashview-purple/20 text-hashview-purple text-sm font-medium mb-4">
              Introduction
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Explore More And Get More{" "}
              <span className="gradient-text">With Our App</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              At HashView, we believe every experience deserves a voice—and every voice deserves a reward. Transform everyday experiences into opportunities with our next-gen customer engagement platform.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {highlights.map((item, index) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.text}</span>
                </motion.div>
              ))}
            </div>

            <Button variant="hero" size="lg">
              <a
                href="/about"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center"
              >
                Discover More
                <ArrowRight className="ml-2" />
              </a>
            </Button>
          </motion.div>

          {/* Right Content - Decorative Elements */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-square max-w-md mx-auto">
              {/* Main circle */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-hashview-purple/20 to-hashview-orange/20 animate-pulse-glow" />

              {/* Inner decorative circles */}
              <div className="absolute inset-8 rounded-full border border-hashview-purple/30 animate-spin-slow" />
              <div className="absolute inset-16 rounded-full border border-hashview-orange/30 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '25s' }} />

              {/* Center content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-hashview-purple to-hashview-orange p-0.5 glow-mixed">
                    <div className="w-full h-full rounded-2xl bg-card flex items-center justify-center">
                      <Image src={logo} alt="HashView Logo" className="w-14 h-14 object-contain" />
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center gap-3">
                    <Button variant="outline" size="sm" className="w-full max-w-[160px]" asChild>
                      <a
                        href="https://apps.apple.com/us/app/hashview/id6756681321"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center text-xs"
                      >
                        Download iOS
                      </a>
                    </Button>
                    <Button variant="hero" size="sm" className="w-full max-w-[160px]" asChild>
                      <a
                        href="https://play.google.com/store/apps/details?id=com.hashview.apps&pcampaignid=web_share"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center text-xs"
                      >
                        Download Android
                      </a>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-10 right-10 w-16 h-16 rounded-xl glass flex items-center justify-center"
              >
                <Gift className="w-8 h-8 text-hashview-orange" />
              </motion.div>
              <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-10 left-10 w-16 h-16 rounded-xl glass flex items-center justify-center"
              >
                <MessageCircle className="w-8 h-8 text-hashview-purple" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
