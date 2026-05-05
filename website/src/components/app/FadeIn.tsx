"use client";

import { motion, type Variants } from "framer-motion";

// ─── FadeIn: single element fade + slide ──────────────────────────────────────
interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.4,
  direction = "up",
  className,
}: FadeInProps) {
  const offset = 20;
  const initial = {
    opacity: 0,
    y: direction === "up" ? offset : direction === "down" ? -offset : 0,
    x: direction === "left" ? offset : direction === "right" ? -offset : 0,
  };

  return (
    <motion.div
      initial={initial}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerList: parent that cascades children in one by one ─────────────────
interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delayStart?: number;
}

const staggerVariants: Variants = {
  hidden: {},
  show: (custom: { stagger: number; delayStart: number }) => ({
    transition: {
      staggerChildren: custom.stagger,
      delayChildren: custom.delayStart,
    },
  }),
};

const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export function StaggerList({
  children,
  className,
  stagger = 0.07,
  delayStart = 0,
}: StaggerListProps) {
  return (
    <motion.div
      variants={staggerVariants}
      initial="hidden"
      animate="show"
      custom={{ stagger, delayStart }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

// ─── ScaleIn: scale from center (good for modals / cards) ─────────────────────
export function ScaleIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── PageTransition: wraps a whole page ───────────────────────────────────────
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
