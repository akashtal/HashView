"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import ApiService from "@/lib/api";

type Status = "idle" | "loading" | "success" | "error";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [apiError, setApiError] = useState("");

  const validate = () => {
    if (!email.trim()) { setEmailError("Email is required"); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError("Please enter a valid email"); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus("loading");
    setApiError("");
    try {
      await ApiService.forgotPassword({ email: email.trim().toLowerCase() });
      setStatus("success");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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
            Forgot your <span className="gradient-text">password?</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            No worries — enter your email and we&apos;ll send you a secure reset link instantly.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md animate-fade-in">

          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Back to sign in</span>
          </Link>

          {/* Mobile logo */}
          <div className="flex lg:hidden justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg">
              <Image src="/logo.png" alt="HashView" width={52} height={52} className="object-contain" />
            </div>
          </div>

          {status === "success" ? (
            // ── Success state ──────────────────────────────────────────────
            <div className="text-center animate-scale-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-3">
                Check your email
              </h2>
              <p className="text-muted-foreground mb-2">
                We&apos;ve sent a password reset link to:
              </p>
              <p className="font-semibold text-foreground mb-6">{email}</p>
              <p className="text-sm text-muted-foreground mb-8">
                The link will expire in 1 hour. Check your spam folder if you don&apos;t see it.
              </p>
              <Button
                onClick={() => { setStatus("idle"); setEmail(""); }}
                variant="outline"
                className="w-full"
              >
                Try a different email
              </Button>
              <Link href="/login">
                <Button className="w-full mt-3 bg-gradient-to-r from-violet-600 to-purple-700 text-white hover:from-violet-700 hover:to-purple-800">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            // ── Form state ─────────────────────────────────────────────────
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-foreground mb-2">
                  Reset Password
                </h2>
                <p className="text-muted-foreground">
                  Enter your account email and we&apos;ll send you a reset link.
                </p>
              </div>

              {/* API error */}
              {apiError && (
                <div className="mb-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError("");
                        if (apiError) setApiError("");
                      }}
                      className={cn("pl-10", emailError && "border-destructive focus-visible:ring-destructive")}
                    />
                  </div>
                  {emailError && <p className="text-destructive text-xs">{emailError}</p>}
                </div>

                <Button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full h-11 font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 hover:shadow-[0_0_20px_hsl(263_70%_58%/0.4)] transition-all duration-200"
                >
                  {status === "loading" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Remembered your password?{" "}
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
