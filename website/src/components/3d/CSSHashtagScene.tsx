"use client";

import { motion } from "framer-motion";

export function CSSHashtagScene() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Animated Hashtag using CSS */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-32 h-32 md:w-48 md:h-48">
          {/* Vertical bars */}
          <motion.div
            className="absolute w-3 bg-hashview-purple rounded-full shadow-lg shadow-hashview-purple/50"
            style={{
              left: "35%",
              top: "50%",
              height: "80%",
              transform: "translate(-50%, -50%)",
            }}
            animate={{
              rotate: [0, 5, -5, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute w-3 bg-hashview-orange rounded-full shadow-lg shadow-hashview-orange/50"
            style={{
              left: "65%",
              top: "50%",
              height: "80%",
              transform: "translate(-50%, -50%)",
            }}
            animate={{
              rotate: [0, -5, 5, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.2,
            }}
          />
          
          {/* Horizontal bars */}
          <motion.div
            className="absolute h-3 bg-hashview-purple rounded-full shadow-lg shadow-hashview-purple/50"
            style={{
              left: "50%",
              top: "30%",
              width: "60%",
              transform: "translate(-50%, -50%)",
            }}
            animate={{
              rotate: [0, 3, -3, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.1,
            }}
          />
          <motion.div
            className="absolute h-3 bg-hashview-orange rounded-full shadow-lg shadow-hashview-orange/50"
            style={{
              left: "50%",
              top: "70%",
              width: "60%",
              transform: "translate(-50%, -50%)",
            }}
            animate={{
              rotate: [0, -3, 3, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.3,
            }}
          />
        </div>
      </div>

      {/* Floating orbs */}
      <motion.div
        className="absolute w-32 h-32 bg-hashview-purple/20 rounded-full blur-3xl"
        style={{
          top: "20%",
          left: "20%",
        }}
        animate={{
          x: [0, 30, 0],
          y: [0, 20, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute w-24 h-24 bg-hashview-orange/20 rounded-full blur-3xl"
        style={{
          bottom: "20%",
          right: "20%",
        }}
        animate={{
          x: [0, -30, 0],
          y: [0, -20, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />
      <motion.div
        className="absolute w-20 h-20 bg-hashview-purple/15 rounded-full blur-2xl"
        style={{
          top: "60%",
          right: "15%",
        }}
        animate={{
          x: [0, -20, 0],
          y: [0, 30, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
      />
    </div>
  );
}

