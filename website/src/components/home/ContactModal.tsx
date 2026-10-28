"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, User, Mail, Phone, MapPin, QrCode, ChevronDown, Building2 } from "lucide-react";

// ── Brand SVG Logos ─────────────────────────────────────────────────────────────
const BrandIcons: Record<string, JSX.Element> = {
  facebook: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#1877F2">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.031 4.388 11.031 10.125 11.927v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796v8.437C19.612 23.104 24 18.104 24 12.073z"/>
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="url(#ig-grad)">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F58529"/>
          <stop offset="50%" stopColor="#DD2A7B"/>
          <stop offset="100%" stopColor="#8134AF"/>
        </linearGradient>
      </defs>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  ),
  google: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.53V6.77a4.85 4.85 0 01-1.02-.08z"/>
    </svg>
  ),
  friend: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  other: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
};

const REFERRAL_SOURCES = [
  { value: "",          label: "Select an option…" },
  { value: "facebook",  label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "google",    label: "Google" },
  { value: "linkedin",  label: "LinkedIn" },
  { value: "twitter",   label: "X / Twitter" },
  { value: "tiktok",    label: "TikTok" },
  { value: "friend",    label: "Friend / Word of Mouth" },
  { value: "other",     label: "Other" },
];

const INITIAL_FORM = {
  businessName: "",
  address: "",
  name: "",
  email: "",
  phone: "",
  referralSource: "",
};

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Custom Select Dropdown ─────────────────────────────────────────────────────
function ReferralSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = REFERRAL_SOURCES.find((s) => s.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-input bg-background text-sm hover:border-hashview-purple/60 focus:outline-none focus:ring-2 focus:ring-hashview-purple/40 transition-all"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          {value && BrandIcons[value] && (
            <span className="flex-shrink-0 text-muted-foreground">{BrandIcons[value]}</span>
          )}
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {selected?.label || "Select an option…"}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 mt-1.5 bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
          >
            {REFERRAL_SOURCES.filter((s) => s.value !== "").map((src) => (
              <button
                key={src.value}
                type="button"
                onClick={() => { onChange(src.value); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors
                  ${value === src.value
                    ? "bg-hashview-purple/10 text-hashview-purple font-medium"
                    : "hover:bg-muted text-foreground"
                  }`}
              >
                <span className={`flex-shrink-0 ${value === src.value ? "text-hashview-purple" : "text-muted-foreground"}`}>
                  {BrandIcons[src.value]}
                </span>
                <span>{src.label}</span>
                {value === src.value && (
                  <svg className="ml-auto w-4 h-4 text-hashview-purple flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────
export const ContactModal = ({ open, onOpenChange }: ContactModalProps) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [errors, setErrors] = useState<Partial<typeof INITIAL_FORM>>({});
  const [serverError, setServerError] = useState("");

  const validate = () => {
    const e: Partial<typeof INITIAL_FORM> = {};
    if (!form.businessName.trim()) e.businessName = "Business name is required";
    if (!form.address.trim()) e.address = "Business address is required";
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setServerError("");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/qr-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { setServerError(json.error || "Something went wrong. Please try again."); return; }
      setIsComplete(true);
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm(INITIAL_FORM); setErrors({}); setServerError(""); setIsComplete(false);
    onOpenChange(false);
  };

  const field = (key: keyof typeof INITIAL_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((p) => ({ ...p, [key]: e.target.value }));
      if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
    };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-lg p-0 overflow-hidden gap-0 rounded-2xl">
        {/* Gradient top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-hashview-purple via-violet-500 to-hashview-orange" />

        <div className="overflow-y-auto max-h-[90vh] px-5 sm:px-7 pt-6 pb-7">
          {/* Header */}
          <DialogHeader className="mb-5 text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-hashview-purple/15 to-hashview-orange/15 ring-1 ring-hashview-purple/20">
                <QrCode className="w-6 h-6 text-hashview-orange" />
              </div>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold">
              {isComplete ? "You're on the list! 🎉" : "Get Your Free QR Code"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {isComplete
                ? "We've received your details and will be in touch shortly."
                : "Fill in your details and we'll set up your free QR code."}
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {isComplete ? (
              /* ── Success ── */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="text-center py-8 space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.12, type: "spring", stiffness: 220 }}
                  className="flex justify-center"
                >
                  <CheckCircle2 className="w-16 h-16 text-hashview-orange" />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}
                  className="text-muted-foreground text-sm max-w-xs mx-auto"
                >
                  Our team will reach out within 24 hours to get everything set up for{" "}
                  <strong className="text-foreground">{form.businessName || "your business"}</strong>.
                </motion.p>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <Button onClick={handleClose} variant="hero" size="lg" className="px-10 mt-1">
                    Done
                  </Button>
                </motion.div>
              </motion.div>
            ) : (
              /* ── Form ── */
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSubmit}
                noValidate
                className="space-y-4"
              >
                {/* ── Business Details ── */}
                <div className="space-y-3 p-3.5 rounded-xl bg-muted/40 border border-border/60">
                  <div className="text-xs font-semibold uppercase tracking-wider text-hashview-purple flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Business Details</span>
                  </div>

                  {/* Business Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="cf-business-name" className="text-sm font-medium">
                      Business Name <span className="text-hashview-orange">*</span>
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="cf-business-name"
                        value={form.businessName}
                        onChange={field("businessName")}
                        placeholder="e.g. Royal Oak Cafe, Bella Salon"
                        autoComplete="organization"
                        className={`pl-9 h-10 text-sm ${errors.businessName ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                      />
                    </div>
                    {errors.businessName && <p className="text-xs text-destructive">{errors.businessName}</p>}
                  </div>

                  {/* Business Address */}
                  <div className="space-y-1.5">
                    <Label htmlFor="cf-address" className="text-sm font-medium">
                      Business Address <span className="text-hashview-orange">*</span>
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="cf-address"
                        value={form.address}
                        onChange={field("address")}
                        placeholder="e.g. 123 High Street, London, EC1A 1BB"
                        autoComplete="street-address"
                        className={`pl-9 h-10 text-sm ${errors.address ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                      />
                    </div>
                    {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
                  </div>
                </div>

                {/* ── Contact Details ── */}
                <div className="space-y-3 p-3.5 rounded-xl bg-muted/40 border border-border/60">
                  <div className="text-xs font-semibold uppercase tracking-wider text-hashview-purple flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>Contact Details</span>
                  </div>

                  {/* Name + Phone — 2 col on sm+ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="cf-name" className="text-sm font-medium">
                        Full Name <span className="text-hashview-orange">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="cf-name"
                          value={form.name}
                          onChange={field("name")}
                          placeholder="John Smith"
                          autoComplete="name"
                          className={`pl-9 h-10 text-sm ${errors.name ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                        />
                      </div>
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>

                    {/* Phone */}
                    <div className="space-y-1.5">
                      <Label htmlFor="cf-phone" className="text-sm font-medium">
                        Phone <span className="text-hashview-orange">*</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="cf-phone"
                          type="tel"
                          value={form.phone}
                          onChange={field("phone")}
                          placeholder="+44 7700 900000"
                          autoComplete="tel"
                          className={`pl-9 h-10 text-sm ${errors.phone ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                        />
                      </div>
                      {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="cf-email" className="text-sm font-medium">
                      Email Address <span className="text-hashview-orange">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="cf-email"
                        type="email"
                        value={form.email}
                        onChange={field("email")}
                        placeholder="john@example.com"
                        autoComplete="email"
                        className={`pl-9 h-10 text-sm ${errors.email ? "border-destructive focus-visible:ring-destructive/30" : ""}`}
                      />
                    </div>
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>
                </div>

                {/* Referral Source — custom dropdown */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    How did you hear about us?{" "}
                    <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                  </Label>
                  <ReferralSelect
                    value={form.referralSource}
                    onChange={(v) => setForm((p) => ({ ...p, referralSource: v }))}
                  />
                </div>

                {/* Server error */}
                {serverError && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                    <span className="mt-0.5">⚠️</span>
                    <span>{serverError}</span>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full h-11 text-sm font-semibold mt-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Sending…
                    </span>
                  ) : (
                    <>Get My Free QR Code <span className="ml-1">→</span></>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  We respect your privacy. No spam, ever.
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
