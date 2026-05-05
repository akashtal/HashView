"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import ApiService from "@/lib/api";

const PASSWORD_RULES = [
  { label: "At least 6 characters", test: (p: string) => p.length >= 6 },
  { label: "At least one number", test: (p: string) => /\d/.test(p) },
  { label: "At least one uppercase", test: (p: string) => /[A-Z]/.test(p) },
];

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [formData, setFormData] = useState({ password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [apiError, setApiError] = useState("");

  // No token — show error immediately
  const hasToken = !!token;

  const validate = () => {
    const errs: typeof fieldErrors = {};
    if (!formData.password) errs.password = "Password is required";
    else if (formData.password.length < 6) errs.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword)
      errs.confirmPassword = "Passwords do not match";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus("loading");
    setApiError("");
    try {
      await ApiService.resetPassword({ token, password: formData.password });
      setStatus("success");
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to reset password. The link may have expired.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0a0015] items-center justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl animate-pulse" />
          <div className="absolute bottom-1/3 right-1/3 w-72 h-72 rounded-full bg-orange-500/15 blur-3xl animate-pulse delay-700" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-md">
          <div className="w-28 h-28 rounded-3xl bg-white flex items-center justify-center shadow-2xl shadow-purple-500/20 mb-8 floating">
            <Image src="/logo.png" alt="HashView" width={96} height={96} className="object-contain" />
          </div>
          <h1 className="text-4xl font-display font-bold text-white mb-4">
            Create a <span className="gradient-text">new password</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            Choose something strong and unique. Your account security matters to us.
          </p>
          {/* Tips */}
          <div className="mt-10 space-y-3 text-left w-full">
            {PASSWORD_RULES.map((rule) => (
              <div key={rule.label} className={cn(
                "flex items-center gap-3 glass rounded-xl px-4 py-3 transition-all duration-300",
                formData.password && rule.test(formData.password) ? "border-primary/40" : ""
              )}>
                <CheckCircle2 className={cn(
                  "w-4 h-4 shrink-0 transition-colors duration-300",
                  formData.password && rule.test(formData.password) ? "text-primary" : "text-white/30"
                )} />
                <span className="text-white/70 text-sm">{rule.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md animate-fade-in">

          {/* Mobile logo */}
          <div className="flex lg:hidden justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg">
              <Image src="/logo.png" alt="HashView" width={52} height={52} className="object-contain" />
            </div>
          </div>

          {/* No token */}
          {!hasToken && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
                <Lock className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-3">Invalid Reset Link</h2>
              <p className="text-muted-foreground mb-8">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link href="/forgot-password">
                <Button className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white">
                  Request New Link
                </Button>
              </Link>
            </div>
          )}

          {/* Success */}
          {hasToken && status === "success" && (
            <div className="text-center animate-scale-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-3">Password Updated!</h2>
              <p className="text-muted-foreground mb-2">
                Your password has been reset successfully.
              </p>
              <p className="text-sm text-muted-foreground">Redirecting you to sign in...</p>
            </div>
          )}

          {/* Form */}
          {hasToken && status !== "success" && (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-foreground mb-2">
                  New Password
                </h2>
                <p className="text-muted-foreground">Enter and confirm your new password below.</p>
              </div>

              {apiError && (
                <div className="mb-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                  {apiError}{" "}
                  {apiError.toLowerCase().includes("expired") && (
                    <Link href="/forgot-password" className="underline font-semibold">
                      Get a new link
                    </Link>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={(e) => {
                        setFormData((d) => ({ ...d, password: e.target.value }));
                        if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
                      }}
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

                  {/* Strength bar */}
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
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm your new password"
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={(e) => {
                        setFormData((d) => ({ ...d, confirmPassword: e.target.value }));
                        if (fieldErrors.confirmPassword) setFieldErrors((f) => ({ ...f, confirmPassword: undefined }));
                      }}
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
                  {fieldErrors.confirmPassword && (
                    <p className="text-destructive text-xs">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full h-11 font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 hover:shadow-[0_0_20px_hsl(263_70%_58%/0.4)] transition-all duration-200"
                >
                  {status === "loading" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Remembered it?{" "}
                <Link href="/login" className="text-primary font-semibold hover:underline">
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
