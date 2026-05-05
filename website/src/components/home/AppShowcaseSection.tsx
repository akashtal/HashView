"use client";

import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";

const appScreens = [
  "/unnamed.png",
  "/unnamed (1).png",
  "/unnamed (2).png",
  "/unnamed (3).png",
  "/unnamed (4).png",
  "/unnamed (5).png",
  "/unnamed (6).png",
];

export const AppShowcaseSection = () => {
  const plugin = useRef(
    Autoplay({ delay: 2000, stopOnInteraction: false })
  );

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-card via-background to-card" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-4">
            <Smartphone className="w-4 h-4 text-hashview-orange" />
            <span className="text-sm text-muted-foreground">App Preview</span>
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            See <span className="gradient-text">HashView</span> in Action
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Experience the seamless interface that thousands of businesses trust for customer engagement.
          </p>
        </motion.div>

        {/* App Carousel */}
        <div className="relative max-w-5xl mx-auto">
          <Carousel
            plugins={[plugin.current]}
            className="w-full"
            opts={{
              align: "center",
              loop: true,
            }}
          >
            <CarouselContent className="-ml-4 flex items-center">
              {appScreens.map((screen, index) => (
                <CarouselItem key={index} className="pl-4 basis-[80%] sm:basis-[45%] md:basis-[33.33%] lg:basis-[25%]">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="relative group"
                  >
                    <div className="relative aspect-[9/18.5] bg-gradient-to-br from-hashview-purple/20 to-hashview-orange/20 p-1 rounded-[2.5rem] shadow-xl overflow-hidden group-hover:shadow-hashview-purple/20 transition-all duration-500">
                      <div className="w-full h-full bg-card rounded-[2.3rem] overflow-hidden border border-white/10">
                        <Image
                          src={screen}
                          alt={`HashView App Screen ${index + 1}`}
                          width={400}
                          height={800}
                          className="w-full h-full object-cover"
                          priority={index < 4}
                        />
                      </div>
                    </div>
                    {/* Shadow/Glow effect */}
                    <div className="absolute -inset-2 bg-gradient-to-br from-hashview-purple/5 to-hashview-orange/5 blur-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          {/* Decorative Phone Frame for the active center item could be added, 
              but for a continuous carousel, a simple grid of mockups works best. 
              Let's add a subtle reflection effect under the items. */}
          <div className="absolute -bottom-12 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent opacity-50 pointer-events-none" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-20"
        >
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="outline" className="px-8 h-12 rounded-xl" asChild>
              <a
                href="https://apps.apple.com/us/app/hashview/id6756681321"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.1 2.48-1.34.03-1.77-.79-3.29-.79-1.53 0-1.99.77-3.27.82-1.31.05-2.31-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.36 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                App Store
              </a>
            </Button>
            <Button variant="hero" className="px-8 h-12 rounded-xl" asChild>
              <a
                href="https://play.google.com/store/apps/details?id=com.hashview.apps&pcampaignid=web_share"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L18.81,13.12C19.46,12.47 19.46,11.53 18.81,10.88L16.81,8.88L14.44,11.25L13.69,12L14.44,12.75L16.81,15.12M4.56,2.15L14.44,12L16.81,9.63L4.56,2.15M14.44,12L4.56,21.85L16.81,14.37L14.44,12Z" />
                </svg>
                Google Play
              </a>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
