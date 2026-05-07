"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Mail, Lock, User, Building2, ChevronRight, Loader2, ArrowLeft, Globe, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Role = "customer" | "business";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginAsGuest, loading, error, isAuthenticated, user, clearError } = useAuth();

  const [role, setRole] = useState<Role>("customer");
  const [step, setStep] = useState<"role" | "form">("role");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const redirectTo = searchParams.get("redirect") || null;

  // Redirect if already authenticated (but NOT if guest)
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'guest' || user.isGuest) {
        // Guests should be allowed to view the login page so they can sign in!
        return;
      }
      const dest =
        redirectTo ||
        (user.role === "business" ? "/dashboard" : "/explore");
      router.replace(dest);
    }
  }, [isAuthenticated, user, redirectTo, router]);

  const handleGuestLogin = () => {
    loginAsGuest();
    router.push('/explore');
  };

  // Clear API error on input change
  useEffect(() => {
    if (error) clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  const validate = () => {
    const errs: typeof fieldErrors = {};
    if (!formData.email.trim()) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = "Please enter a valid email";
    }
    if (!formData.password) errs.password = "Password is required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await login({ email: formData.email.trim().toLowerCase(), password: formData.password, role });
    } catch {
      // error shown from context
    }
  };

  const roleCards = [
    {
      role: "customer" as Role,
      icon: User,
      title: "Customer",
      description: "Discover and explore local businesses",
      gradient: "from-violet-600 to-purple-700",
      glow: "hover:shadow-[0_0_30px_hsl(263_70%_58%/0.4)]",
    },
    {
      role: "business" as Role,
      icon: Building2,
      title: "Business Owner",
      description: "Manage your business and analytics",
      gradient: "from-orange-500 to-amber-600",
      glow: "hover:shadow-[0_0_30px_hsl(24_95%_53%/0.4)]",
    },
  ];

  return (
    <div className="relative min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0a0015] items-center justify-center">
        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-orange-500/20 blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-purple-500/10 blur-2xl" />
        </div>

        {/* Grid overlay */}
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
            Welcome to <span className="gradient-text">HashView</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            The verified review platform trusted by all businesses and customers across the UK.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-12 w-full">
            {[
              { label: "Businesses", value: "100+" },
              { label: "Reviews", value: "50+" },
              { label: "Rating", value: "4.8★" },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-2xl p-4">
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-white/50 text-xs">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md animate-fade-in">

          {/* Step: Role Selection */}
          {step === "role" && (
            <>
              {/* Mobile logo */}
              <div className="flex lg:hidden justify-center mb-8">
                <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                  <Image src="/logo.png" alt="HashView" width={64} height={64} className="object-contain" />
                </div>
              </div>

              <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-bold text-foreground mb-2">
                  Welcome back
                </h2>
                <p className="text-muted-foreground">
                  Choose your account type to sign in
                </p>
              </div>

              <div className="space-y-4">
                {roleCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.role}
                      onClick={() => { setRole(card.role); setStep("form"); }}
                      className={cn(
                        "w-full group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 border border-border",
                        "bg-card hover:border-primary/50",
                        card.glow
                      )}
                    >
                      <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r", card.gradient, "opacity-5")} />
                      <div className="relative flex items-center gap-4">
                        <div className={cn("rounded-xl p-3 bg-gradient-to-br text-white shrink-0", card.gradient)}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-foreground text-lg">{card.title}</div>
                          <div className="text-muted-foreground text-sm mt-0.5">{card.description}</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Guest access */}
              <button
                onClick={handleGuestLogin}
                className="w-full mt-4 group flex items-center justify-between p-4 rounded-2xl border border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/30 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground text-sm">Continue as Guest</p>
                    <p className="text-muted-foreground text-xs">Explore businesses without an account</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </button>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-primary font-semibold hover:underline">
                  Create one free
                </Link>
              </p>
            </>
          )}

          {/* Step: Login Form */}
          {step === "form" && (
            <>
              <button
                onClick={() => { setStep("role"); setFieldErrors({}); clearError(); }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm">Back</span>
              </button>

              {/* Role badge */}
              <div className="flex items-center gap-3 mb-6">
                <div className={cn(
                  "rounded-xl p-2.5 text-white",
                  role === "customer" ? "bg-gradient-to-br from-violet-600 to-purple-700" : "bg-gradient-to-br from-orange-500 to-amber-600"
                )}>
                  {role === "customer" ? <User className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    {role === "customer" ? "Customer" : "Business"} Sign In
                  </h2>
                  <p className="text-muted-foreground text-sm">Sign in to your account</p>
                </div>
              </div>

              {/* API error */}
              {error && (
                <div className="mb-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData((d) => ({ ...d, email: e.target.value }));
                        if (fieldErrors.email) setFieldErrors((fe) => ({ ...fe, email: undefined }));
                      }}
                      className={cn("pl-10", fieldErrors.email && "border-destructive focus-visible:ring-destructive")}
                    />
                  </div>
                  {fieldErrors.email && <p className="text-destructive text-xs">{fieldErrors.email}</p>}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData((d) => ({ ...d, password: e.target.value }));
                        if (fieldErrors.password) setFieldErrors((fe) => ({ ...fe, password: undefined }));
                      }}
                      className={cn("pl-10 pr-10", fieldErrors.password && "border-destructive focus-visible:ring-destructive")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="text-destructive text-xs">{fieldErrors.password}</p>}
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "w-full h-11 font-semibold text-white transition-all duration-200",
                    role === "customer"
                      ? "bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 hover:shadow-[0_0_20px_hsl(263_70%_58%/0.4)]"
                      : "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 hover:shadow-[0_0_20px_hsl(24_95%_53%/0.4)]"
                  )}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-6">
                By signing in you agree to our{" "}
                <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </p>

              <p className="text-center text-sm text-muted-foreground mt-4">
                Don&apos;t have an account?{" "}
                <Link href={`/register?role=${role}`} className="text-primary font-semibold hover:underline">
                  Sign up free
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
