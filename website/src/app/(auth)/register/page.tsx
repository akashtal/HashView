"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Eye, EyeOff, Mail, Lock, User, Building2,
  ChevronRight, Loader2, ArrowLeft, Phone, CheckCircle2,
  Home, MapPin, Globe, Flag, Navigation
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Role = "customer" | "business";

type FormData = {
  name: string;
  email: string;
  phone: string;
  buildingNumber: string;
  street: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  landmark: string;
  password: string;
  confirmPassword: string;
};

type FieldErrors = Partial<Record<keyof FormData, string>> & { terms?: string };

const PASSWORD_RULES = [
  { label: "At least 6 characters", test: (p: string) => p.length >= 6 },
  { label: "At least one number", test: (p: string) => /\d/.test(p) },
  { label: "At least one uppercase", test: (p: string) => /[A-Z]/.test(p) },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, loading, error, isAuthenticated, user, clearError } = useAuth();

  const [role, setRole] = useState<Role>(
    (searchParams.get("role") as Role) || "customer"
  );
  const [step, setStep] = useState<"role" | "form">(
    searchParams.get("role") ? "form" : "role"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    buildingNumber: "",
    street: "",
    city: "",
    county: "",
    postcode: "",
    country: "United Kingdom",
    landmark: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Redirect if already authenticated (but NOT if guest)
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'guest' || user.isGuest) {
        // Guests should be allowed to view the register page so they can sign up!
        return;
      }
      router.replace(user.role === "business" ? "/dashboard" : "/explore");
    }
  }, [isAuthenticated, user, router]);

  // Clear API error on input change
  useEffect(() => {
    if (error) clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  const updateField = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((d) => ({ ...d, [field]: e.target.value }));
    if (fieldErrors[field]) setFieldErrors((fe) => ({ ...fe, [field]: undefined }));
  };

  const validate = (): boolean => {
    const errs: FieldErrors = {};
    if (!formData.name.trim() || formData.name.trim().length < 2)
      errs.name = "Please enter your full name (min 2 characters)";
    if (!formData.email.trim())
      errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errs.email = "Please enter a valid email";
    if (!formData.password)
      errs.password = "Password is required";
    else if (formData.password.length < 6)
      errs.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword)
      errs.confirmPassword = "Passwords do not match";

    const hasAnyAddressField = formData.buildingNumber.trim() ||
      formData.street.trim() ||
      formData.city.trim() ||
      formData.postcode.trim();

    if (hasAnyAddressField) {
      if (!formData.buildingNumber.trim()) errs.buildingNumber = "Building number is required";
      if (!formData.street.trim()) errs.street = "Street name is required";
      if (!formData.city.trim()) errs.city = "Town/City is required";
      if (!formData.postcode.trim()) {
        errs.postcode = "Postcode is required";
      } else if (!/^[A-Z]{1,2}\\d[A-Z\\d]?\\s?\\d[A-Z]{2}$/i.test(formData.postcode.trim())) {
        errs.postcode = "Please enter a valid UK postcode";
      }
    }

    if (!agreedToTerms) {
      errs.terms = "You must agree to the Terms & Conditions to create an account";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload: Parameters<typeof register>[0] = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      role,
    };
    if (formData.phone.trim()) payload.phone = formData.phone.trim();

    const hasAnyAddressField = formData.buildingNumber.trim() ||
      formData.street.trim() ||
      formData.city.trim() ||
      formData.postcode.trim();

    if (hasAnyAddressField) {
      payload.buildingNumber = formData.buildingNumber.trim();
      payload.street = formData.street.trim();
      payload.city = formData.city.trim();
      payload.county = formData.county.trim();
      payload.postcode = formData.postcode.trim().toUpperCase();
      payload.country = formData.country;
      payload.landmark = formData.landmark.trim();
    }
    try {
      await register(payload);
    } catch {
      // error shown from context
    }
  };

  const roleCards = [
    {
      role: "customer" as Role,
      icon: User,
      title: "Customer",
      description: "Discover verified local businesses and earn rewards",
      gradient: "from-violet-600 to-purple-700",
      perks: ["Browse verified businesses", "Read authentic reviews", "Earn loyalty rewards"],
    },
    {
      role: "business" as Role,
      icon: Building2,
      title: "Business Owner",
      description: "Build trust, collect reviews and grow your business",
      gradient: "from-orange-500 to-amber-600",
      perks: ["Collect verified reviews", "Analytics dashboard", "Manage offers & coupons"],
    },
  ];

  return (
    <div className="relative min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0a0015] items-center justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-orange-500/20 blur-3xl animate-pulse delay-1000" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-lg">
          <div className="w-28 h-28 rounded-3xl bg-white flex items-center justify-center shadow-2xl shadow-purple-500/20 mb-8 floating">
            <Image src="/logo.png" alt="HashView" width={96} height={96} className="object-contain" />
          </div>
          <h1 className="text-4xl font-display font-bold text-white mb-4">
            Join <span className="gradient-text">HashView</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            Join thousands of businesses and customers building trust through verified reviews.
          </p>

          {/* Feature highlights */}
          <div className="mt-12 space-y-4 w-full text-left">
            {[
              { icon: "🔒", text: "Verified, tamper-proof reviews" },
              { icon: "🎁", text: "Instant rewards for customers" },
              { icon: "📊", text: "Real-time analytics for businesses" },
              { icon: "🇬🇧", text: "Trusted across the UK" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-white/80 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-y-auto">
        <div className="w-full max-w-md animate-fade-in py-8">

          {/* Step 1: Role Selection */}
          {step === "role" && (
            <>
              <div className="flex lg:hidden justify-center mb-8">
                <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                  <Image src="/logo.png" alt="HashView" width={64} height={64} className="object-contain" />
                </div>
              </div>

              <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-bold text-foreground mb-2">Create your account</h2>
                <p className="text-muted-foreground">What best describes you?</p>
              </div>

              <div className="space-y-4">
                {roleCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.role}
                      onClick={() => { setRole(card.role); setStep("form"); }}
                      className={cn(
                        "w-full group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 border border-border bg-card",
                        "hover:border-primary/50 hover:shadow-lg"
                      )}
                    >
                      <div className="relative flex items-start gap-4">
                        <div className={cn("rounded-xl p-3 bg-gradient-to-br text-white shrink-0 mt-0.5", card.gradient)}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-foreground text-lg flex items-center gap-2">
                            {card.title}
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all ml-auto" />
                          </div>
                          <div className="text-muted-foreground text-sm mt-0.5 mb-3">{card.description}</div>
                          <ul className="space-y-1">
                            {card.perks.map((perk) => (
                              <li key={perk} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                {perk}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-center text-sm text-muted-foreground mt-8">
                Already have an account?{" "}
                <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
              </p>
            </>
          )}

          {/* Step 2: Registration Form */}
          {step === "form" && (
            <>
              <button
                onClick={() => { setStep("role"); setFieldErrors({}); clearError(); }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm">Change account type</span>
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className={cn(
                  "rounded-xl p-2.5 text-white",
                  role === "customer" ? "bg-gradient-to-br from-violet-600 to-purple-700" : "bg-gradient-to-br from-orange-500 to-amber-600"
                )}>
                  {role === "customer" ? <User className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    {role === "customer" ? "Customer" : "Business Owner"} Account
                  </h2>
                  <p className="text-muted-foreground text-sm">Create your free account</p>
                </div>
              </div>

              {/* API error */}
              {error && (
                <div className="mb-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder={role === "business" ? "Business owner's full name" : "Your full name"}
                      autoComplete="name"
                      value={formData.name}
                      onChange={updateField("name")}
                      className={cn("pl-10", fieldErrors.name && "border-destructive")}
                    />
                  </div>
                  {fieldErrors.name && <p className="text-destructive text-xs">{fieldErrors.name}</p>}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={formData.email}
                      onChange={updateField("email")}
                      className={cn("pl-10", fieldErrors.email && "border-destructive")}
                    />
                  </div>
                  {fieldErrors.email && <p className="text-destructive text-xs">{fieldErrors.email}</p>}
                </div>

                {/* Phone (optional) */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone">
                    Phone <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+44 7700 000000"
                      autoComplete="tel"
                      value={formData.phone}
                      onChange={updateField("phone")}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* UK Address Fields (optional) */}
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-base font-semibold">UK Address <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-1/3 space-y-1.5">
                      <Label htmlFor="buildingNumber" className="text-xs">Building No.</Label>
                      <Input
                        id="buildingNumber"
                        placeholder="123"
                        value={formData.buildingNumber}
                        onChange={updateField("buildingNumber")}
                        className={cn(fieldErrors.buildingNumber && "border-destructive")}
                      />
                      {fieldErrors.buildingNumber && <p className="text-destructive text-[10px]">{fieldErrors.buildingNumber}</p>}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="street" className="text-xs">Street Name</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          id="street"
                          placeholder="Baker Street"
                          value={formData.street}
                          onChange={updateField("street")}
                          className={cn("pl-9", fieldErrors.street && "border-destructive")}
                        />
                      </div>
                      {fieldErrors.street && <p className="text-destructive text-[10px]">{fieldErrors.street}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs">Town/City</Label>
                    <div className="relative">
                      <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        id="city"
                        placeholder="London"
                        value={formData.city}
                        onChange={updateField("city")}
                        className={cn("pl-9", fieldErrors.city && "border-destructive")}
                      />
                    </div>
                    {fieldErrors.city && <p className="text-destructive text-[10px]">{fieldErrors.city}</p>}
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="county" className="text-xs">County <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <div className="relative">
                        <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          id="county"
                          placeholder="Greater London"
                          value={formData.county}
                          onChange={updateField("county")}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="postcode" className="text-xs">Postcode</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          id="postcode"
                          placeholder="SW1A 1AA"
                          value={formData.postcode}
                          onChange={e => {
                            setFormData(d => ({ ...d, postcode: e.target.value.toUpperCase() }));
                            if (fieldErrors.postcode) setFieldErrors(fe => ({ ...fe, postcode: undefined }));
                          }}
                          className={cn("pl-9 uppercase", fieldErrors.postcode && "border-destructive")}
                          maxLength={8}
                        />
                      </div>
                      {fieldErrors.postcode && <p className="text-destructive text-[10px]">{fieldErrors.postcode}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Country</Label>
                    <div className="relative bg-muted/50 rounded-md border border-input px-3 py-2 text-sm flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">🇬🇧 {formData.country}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="landmark" className="text-xs">Landmark <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <div className="relative">
                      <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        id="landmark"
                        placeholder="e.g., Near Tesco"
                        value={formData.landmark}
                        onChange={updateField("landmark")}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="reg-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={updateField("password")}
                      className={cn("pl-10 pr-10", fieldErrors.password && "border-destructive")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="text-destructive text-xs">{fieldErrors.password}</p>}
                  {/* Password strength indicators */}
                  {formData.password && (
                    <div className="flex gap-2 mt-1.5">
                      {PASSWORD_RULES.map((rule) => (
                        <div
                          key={rule.label}
                          title={rule.label}
                          className={cn(
                            "flex-1 h-1 rounded-full transition-all duration-300",
                            rule.test(formData.password) ? "bg-primary" : "bg-muted"
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirm"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={updateField("confirmPassword")}
                      className={cn("pl-10 pr-10", fieldErrors.confirmPassword && "border-destructive")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && <p className="text-destructive text-xs">{fieldErrors.confirmPassword}</p>}
                </div>

                <div className="flex items-start gap-3 mt-4">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={agreedToTerms}
                    onClick={() => {
                      setAgreedToTerms(!agreedToTerms);
                      if (fieldErrors.terms) setFieldErrors(fe => ({ ...fe, terms: undefined }));
                    }}
                    className={cn(
                      "w-5 h-5 mt-0.5 rounded flex items-center justify-center shrink-0 transition-colors border",
                      agreedToTerms
                        ? (role === "customer" ? "bg-violet-600 border-violet-600" : "bg-orange-500 border-orange-500")
                        : (fieldErrors.terms ? "border-destructive bg-background" : "border-input bg-background hover:bg-muted")
                    )}
                  >
                    {agreedToTerms && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </button>
                  <div className="text-sm text-muted-foreground leading-snug">
                    I agree to the{" "}
                    <Link href="/terms" className="text-primary font-medium hover:underline">
                      Terms & Conditions
                    </Link>
                    {" "}and{" "}
                    <Link href="/privacy" className="text-primary font-medium hover:underline">
                      Privacy Policy
                    </Link>
                    {" "}of HashView.
                    {fieldErrors.terms && (
                      <p className="text-destructive text-xs mt-1 block">{fieldErrors.terms}</p>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "w-full h-11 font-semibold text-white mt-4 transition-all duration-200",
                    role === "customer"
                      ? "bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 hover:shadow-[0_0_20px_hsl(263_70%_58%/0.4)]"
                      : "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 hover:shadow-[0_0_20px_hsl(24_95%_53%/0.4)]"
                  )}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-4">
                Already have an account?{" "}
                <Link href={`/login?role=${role}`} className="text-primary font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
