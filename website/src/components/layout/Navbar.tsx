"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import Image from "next/image";
import logo from "@/assets/logo.png";
import { DownloadAppModal } from "@/components/app/DownloadAppModal";
import type { FeatureGateKey } from "@/lib/feature-gates";

// Note: You may need to configure next.config.ts to handle .png imports

const navLinks = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
  { name: "Pricing", path: "/pricing" },
  { name: "Blog", path: "/blog" },
  { name: "Contact", path: "/contact" },
  { name: "Browse Businesses", path: "/explore" },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showDownloadGate, setShowDownloadGate] = useState<FeatureGateKey | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled || isOpen ? "glass py-3" : "bg-transparent py-5"
        }`}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image src={logo} alt="HashView Logo" height={40} width={40} className="h-10 w-auto" />
            <span className="font-display text-xl font-bold gradient-text">
              HashView
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.path}
                className={`relative font-medium transition-colors duration-300 ${pathname === link.path
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {link.name}
                {pathname === link.path && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-hashview-purple to-hashview-orange"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Theme Toggle & CTA Button */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="default" asChild>
              <Link href="/login">Log In</Link>
            </Button>
            <Button
              variant="outline"
              size="default"
              className="flex items-center gap-2"
              onClick={() => setShowDownloadGate('GENERAL_DOWNLOAD')}
            >
              Download App
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-b border-border/10 pb-4">
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.name}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        href={link.path}
                        onClick={() => setIsOpen(false)}
                        className={`block py-1 font-medium ${pathname === link.path
                          ? "gradient-text"
                          : "text-muted-foreground"
                          }`}
                      >
                        {link.name}
                      </Link>
                    </motion.div>
                  ))}
                </div>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-col gap-4"
                >
                  <Button variant="default" className="w-full" asChild>
                    <Link href="/login" onClick={() => setIsOpen(false)}>Log In</Link>
                  </Button>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1 flex items-center justify-center"
                      onClick={() => setShowDownloadGate('GENERAL_DOWNLOAD')}
                    >
                      Download App
                    </Button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DownloadAppModal
        feature={showDownloadGate}
        onClose={() => setShowDownloadGate(null)}
      />
    </motion.header>
  );
};
