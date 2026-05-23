"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function ThemeToggle() {
  // Dark-only site: render a static dark-mode indicator and disable toggling
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9 rounded-full"
      aria-label="Dark mode"
      disabled
    >
      <Moon className="h-5 w-5 text-foreground" />
    </Button>
  );
}
