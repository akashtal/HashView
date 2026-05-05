"use client";

import { motion } from "framer-motion";
import { Target, Users, Zap, Award, Heart, Globe } from "lucide-react";
import Image from "next/image";
import logo from "@/assets/logo.png";
import { TeamSection } from "@/components/TeamSection";
import { AchievementSection } from "@/components/AchievementSection";

const values = [
  {
    icon: Target,
    title: "Mission-Driven",
    description: "We're on a mission to make every customer voice heard and every business thrive through authentic engagement.",
  },
  {
    icon: Users,
    title: "Customer-Centric",
    description: "Everything we build starts with understanding the needs of businesses and their customers.",
  },
  {
    icon: Zap,
    title: "Innovation First",
    description: "We constantly push boundaries with real-time verification, gamification, and real-time feedback systems.",
  },
  {
    icon: Award,
    title: "Quality Obsessed",
    description: "We ensure only authentic, verified reviews make it to your business profile.",
  },
  {
    icon: Heart,
    title: "Community Focused",
    description: "Building lasting relationships between local businesses and their loyal customers.",
  },
  {
    icon: Globe,
    title: "Global Vision",
    description: "Starting in the UK, expanding worldwide to transform customer engagement everywhere.",
  },
];

const stats = [
  // { value: "2023", label: "Founded" },
  // { value: "50K+", label: "App Downloads" },
  // { value: "1000+", label: "Partner Businesses" },
  // { value: "99%", label: "Verified Reviews" },
];

export function AboutContent() {
  return (
    <>
      {/* Hero Section */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-hashview-purple/10 to-transparent" />
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-hashview-purple/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-hashview-orange/20 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <span className="inline-block px-4 py-2 rounded-full bg-hashview-purple/20 text-hashview-purple text-sm font-medium mb-6">
              About Us
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              We&apos;re Building the Future of{" "}
              <span className="gradient-text">Customer Engagement</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              At HashView, we believe every experience deserves a voice—and every voice deserves a reward. We&apos;re transforming how businesses connect with their customers through authentic, real-time feedback.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-card border-y border-border">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="font-display text-3xl md:text-4xl font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                Our <span className="gradient-text">Story</span>
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  HashView was born from a simple observation: businesses struggle to get authentic customer feedback, while customers rarely feel appreciated for sharing their experiences.
                </p>
                <p>
                  Founded in 2025 in Wales, UK, we set out to bridge this gap with a revolutionary approach. By combining real-time verification technology with instant rewards, we created a platform where every review is authentic and every reviewer is rewarded.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-hashview-purple/20 to-hashview-orange/20 p-1">
                <div className="w-full h-full rounded-3xl bg-card flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-32 h-32 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center glow-mixed p-4">
                      <Image src={logo} alt="HashView Logo" width={96} height={96} className="w-full h-full object-contain" />
                    </div>
                    <h3 className="font-display text-2xl font-bold mb-2">HashView</h3>
                    <p className="text-muted-foreground">Real Reviews. Real Rewards.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
              Our <span className="gradient-text">Values</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              The principles that guide everything we do at HashView.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-background border border-border hover:border-hashview-purple/50 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-2">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Achievement Section */}
      <AchievementSection variant="about" />

      {/* Team Section */}
      <TeamSection variant="about" />
    </>
  );
}

