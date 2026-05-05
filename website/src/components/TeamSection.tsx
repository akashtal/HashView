"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import Image, { type StaticImageData } from "next/image";
import logo from "@/assets/logo.png";
import sakshiImage from "@/assets/sakshi-mahajan.png";
import akashImage from "@/assets/dibya.png";
import ankitImage from "@/assets/ankit.png";



interface TeamMember {
  name: string;
  role: string;
  bio?: string;
  image?: string | StaticImageData; // Path to team member image or imported image
}

// Team members array
const teamMembers: TeamMember[] = [
  {
    name: "Sakshi Mahajan",
    role: "Director & CEO",
    bio: "With a strong foundation in digital marketing and strategic brand growth, Sakshi Mahajan leads our company with vision, innovation, and a deep understanding of the online ecosystem. Her journey began in the marketing world in 2018, where she discovered a powerful purpose: helping businesses—especially in the manufacturing industry—build their online presence and thrive in the digital era. Her mission is simple: empower businesses through digital inclusion. Sakshi expanded her global understanding by moving to the UK to pursue her Master's in International Business. This international exposure gave her deeper insights into global markets, business strategy, and consumer behavior. While studying, she worked in hospitality and admin roles—jobs that unexpectedly opened her eyes to a growing problem. Every day, she watched consumers struggle to trust online reviews. Too many of them were unverified, unreliable, and misleading. That's when the spark hit. Seeing this gap inspired Sakshi to create a solution built on honesty and transparency. And just like that, HASHVIEW was born—a platform dedicated to one powerful idea: Only Verified Reviews. With Hashview, Sakshi is redefining trust in the digital world—one genuine review at a time.",
    image: sakshiImage,
  },
  {
    name: "Dibyajyoti Talukdar",
    role: "Technical Associate",
    bio: "Dibyajyoti is the technical backbone of Hashview. He stepped in when we desperately needed in-house tech expertise—outsourcing simply wasn't working. His strong coding expertise paired with strategic thinking helped rebuild and strengthen the platform into the stable, reliable app Hashview is today. Dibyajyoti now oversees the entire technical development, ensuring smooth performance, clean architecture, and continuous improvement. His precision, problem-solving skills, and commitment make him an essential part of the team.",
    image: akashImage,
  },
  {
    name: "Ankit Sudan",
    role: "Chief Operating Officer (COO)",
    bio: "Ankit Sudan brings structure, strategy, and steady leadership to the team as our COO. As both Sakshi's husband and strongest partner, he has been part of this journey from the very beginning. Intense discussions and two-hour debates often led to our most unique and powerful features, proving that a partner in life can absolutely be a partner in business. Ankit oversees operations, planning, and sales insights—from aligning financial strategies to reviewing updates and mapping out growth plans. His ability to turn discussions into direction makes him invaluable to our team and vision.",
    image: ankitImage,
  },
];

interface TeamSectionProps {
  variant?: "home" | "about";
}

export function TeamSection({ variant = "about" }: TeamSectionProps) {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      className={`${
        variant === "home" ? "py-24" : "py-16 md:py-24"
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
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-hashview-purple/20 text-hashview-purple text-sm font-medium mb-4">
            Our Team
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Meet the <span className="gradient-text">Team</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            The passionate people behind HashView, dedicated to transforming customer engagement.
          </p>
        </motion.div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group"
            >
              <div className="bg-background rounded-2xl border border-border hover:border-hashview-purple/50 transition-all duration-300 overflow-hidden h-full flex flex-col">
                {/* Team Member Image */}
                <div className="relative p-4 md:p-6 pt-6 md:pt-8 overflow-hidden">
                  {/* Animated Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-hashview-purple/20 via-hashview-orange/20 to-hashview-purple/20 group-hover:from-hashview-purple/40 group-hover:via-hashview-orange/40 group-hover:to-hashview-purple/40 transition-all duration-500 ease-in-out" />
                  
                  {/* Animated Gradient Overlay */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-hashview-purple/30 via-transparent to-hashview-orange/30 animate-pulse" />
                  </div>
                  
                  {/* Animated Orb Effects */}
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-hashview-purple/20 rounded-full blur-2xl group-hover:bg-hashview-purple/40 group-hover:scale-150 transition-all duration-700 ease-out" />
                  <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-hashview-orange/20 rounded-full blur-2xl group-hover:bg-hashview-orange/40 group-hover:scale-150 transition-all duration-700 ease-out delay-100" />
                  
                  <div className="relative flex items-center justify-center z-10">
                    {member.image ? (
                      <div className={`relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-44 lg:h-44 rounded-full overflow-hidden border-4 border-background shadow-lg group-hover:shadow-2xl group-hover:shadow-hashview-purple/50 group-hover:border-hashview-purple/50 transition-all duration-300 ${member.name === "Ankit Sudan" ? "object-center" : ""}`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-hashview-purple/0 to-hashview-orange/0 group-hover:from-hashview-purple/30 group-hover:to-hashview-orange/30 transition-all duration-300 z-10" />
                        <Image
                          src={member.image}
                          alt={member.name}
                          width={200}
                          height={200}
                          className={`w-full h-full group-hover:scale-110 transition-transform duration-500 relative z-0 ${member.name === "Ankit Sudan" ? "object-cover object-center" : "object-cover"}`}
                          style={member.name === "Ankit Sudan" ? { objectPosition: "center top" } : undefined}
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-44 lg:h-44 rounded-full bg-gradient-to-br from-hashview-purple to-hashview-orange flex items-center justify-center border-4 border-background shadow-lg group-hover:shadow-2xl group-hover:shadow-hashview-purple/50 group-hover:border-hashview-purple/50 group-hover:scale-110 transition-all duration-300">
                        <Image
                          src={logo}
                          alt={member.name}
                          width={80}
                          height={80}
                          className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-contain opacity-50"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Member Info */}
                <div className="p-4 md:p-6 flex-1 flex flex-col">
                  <h3 className="font-display text-lg md:text-xl font-semibold mb-1 group-hover:gradient-text transition-all duration-300">
                    {member.name}
                  </h3>
                  <p className="text-hashview-purple font-medium mb-3 text-sm md:text-base">{member.role}</p>
                  {member.bio && (
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed flex-1">
                      {member.bio}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

