"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Trophy, ArrowRight, Loader2 } from "lucide-react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import AutoScroll from "embla-carousel-auto-scroll";

interface Achievement {
  _id: string;
  title: string;
  award?: string;
  description: string;
  logoUrl: string;
  storyLink: string;
  winner?: string;
  quote?: string;
  quoteAuthor?: string;
  date?: string;
  order: number;
}

interface AchievementSectionProps {
  variant?: "home" | "about";
}

export function AchievementSection({ variant = "about" }: AchievementSectionProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const plugin = useRef(
    AutoScroll({ speed: 1, stopOnInteraction: false, stopOnMouseEnter: false })
  );

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await fetch("/api/achievements");
        if (!response.ok) throw new Error("Failed to fetch achievements");
        const data = await response.json();
        // Sort by order
        const sorted = (data.achievements || []).sort((a: Achievement, b: Achievement) => (a.order || 0) - (b.order || 0));
        setAchievements(sorted);
      } catch (error) {
        console.error("Error fetching achievements:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`${variant === "home" ? "py-24" : "py-16 md:py-24"
        } relative overflow-hidden ${variant === "about" ? "bg-card" : ""}`}
    >
      {/* Background decoration */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-hashview-purple/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-hashview-orange/10 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-hashview-purple/20 text-hashview-purple text-sm font-medium mb-4">
            Recognition
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Our <span className="gradient-text">Achievement</span>
          </h2>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-hashview-purple" />
          </div>
        ) : achievements.length > 0 ? (
          <Carousel
            plugins={[plugin.current]}
            className="w-full max-w-7xl mx-auto"
            opts={{
              align: "start",
              loop: true,
            }}
          >
            <CarouselContent className="-ml-4 flex items-stretch">
              {achievements.map((achievement, index) => (
                <CarouselItem key={achievement._id} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="bg-background rounded-2xl border border-border p-6 md:p-8 shadow-lg flex flex-col h-full hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex-1 flex flex-col">
                      <div className="mb-6 h-12 flex items-center justify-center md:justify-start">
                        {achievement.logoUrl ? (
                          <Image
                            src={achievement.logoUrl}
                            alt={`${achievement.title} Logo`}
                            width={180}
                            height={60}
                            className="h-full w-auto object-contain opacity-80"
                          />
                        ) : (
                          <div className="h-full w-40 bg-muted/30 rounded animate-pulse" />
                        )}
                      </div>

                      {/* Headline */}
                      <motion.h3
                        initial={{ opacity: 0, y: 20 }}
                        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                        transition={{ duration: 0.5, delay: 0.15 }}
                        className="font-display text-xl md:text-2xl font-bold mb-4 line-clamp-3 text-center md:text-left"
                      >
                        <a
                          href={achievement.storyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-hashview-purple transition-colors"
                        >
                          {achievement.title}
                        </a>
                      </motion.h3>

                      {achievement.date && (
                        <div className="mb-4 text-center md:text-left text-xs font-medium text-hashview-orange">
                          {achievement.date}
                        </div>
                      )}

                      <div className="mb-6 flex flex-col gap-4">
                        <motion.p
                          initial={{ opacity: 0, y: 20 }}
                          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                          className="text-muted-foreground text-sm leading-relaxed line-clamp-4"
                        >
                          {achievement.description}
                        </motion.p>
                        
                        {achievement.quote && (
                          <div className="pt-4 border-t border-border/50">
                            <p className="text-muted-foreground text-xs leading-relaxed italic mb-2 line-clamp-3">
                              &ldquo;{achievement.quote}&rdquo;
                            </p>
                            {achievement.quoteAuthor && (
                              <p className="text-[10px] font-bold gradient-text">— {achievement.quoteAuthor}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {achievement.award && (
                        <div className="mt-auto pt-4">
                          <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="bg-gradient-to-br from-hashview-purple/10 via-hashview-orange/10 to-hashview-purple/10 rounded-xl border border-hashview-purple/20 p-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center flex-shrink-0">
                                <Trophy className="w-4 h-4 text-primary-foreground" />
                              </div>
                              <h4 className="font-display text-xs font-bold truncate">
                                {achievement.award}
                              </h4>
                            </div>
                            {achievement.winner && (
                              <p className="text-[10px] mt-2 font-semibold">Winner: {achievement.winner}</p>
                            )}
                          </motion.div>
                        </div>
                      )}

                      {!achievement.award && (
                        <div className="mt-auto pt-4 text-center md:text-left">
                          <a
                            href={achievement.storyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-hashview-purple text-xs font-medium hover:underline"
                          >
                            Read full story
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </a>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        ) : (
          <div className="text-center text-muted-foreground py-20">
            Achievements content being updated.
          </div>
        )}
      </div>
    </section>
  );
}
