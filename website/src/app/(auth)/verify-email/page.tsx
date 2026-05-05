"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mail, Loader2, CheckCircle2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ApiService from "@/lib/api";

const OTP_LENGTH = 6;

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "resending">("idle");
  const [apiError, setApiError] = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otpValue = otp.join("");
  const isComplete = otpValue.length === OTP_LENGTH && otp.every((d) => d !== "");

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const newOtp = [...otp];

    if (value.length > 1) {
      // Handle paste
      const digits = value.slice(0, OTP_LENGTH).split("");
      digits.forEach((d, i) => { if (index + i < OTP_LENGTH) newOtp[index + i] = d; });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (apiError) setApiError("");
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (!isComplete) return;
    setStatus("loading");
    setApiError("");
    try {
      await ApiService.verifyEmailOTP({ email, otp: otpValue });
      setStatus("success");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Invalid code. Please try again.");
      setStatus("error");
      setOtp(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    setStatus("resending");
    setApiError("");
    setResendMsg("");
    try {
      await ApiService.sendEmailOTP({ email });
      setResendMsg("A new verification code has been sent to your email.");
      setStatus("idle");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to resend. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0a0015] items-center justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-orange-500/15 blur-3xl animate-pulse delay-700" />
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
            Verify your <span className="gradient-text">email</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            We&apos;ve sent a 6-digit verification code to your email address. Enter it to confirm your account.
          </p>

          <div className="mt-10 glass rounded-2xl px-6 py-5 w-full text-left">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-primary" />
              <span className="text-white/60 text-sm">Sent to</span>
            </div>
            <p className="text-white font-semibold break-all">{email || "your email"}</p>
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

          {/* Success */}
          {status === "success" ? (
            <div className="text-center animate-scale-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground mb-3">Email Verified!</h2>
              <p className="text-muted-foreground">Your account is confirmed. Redirecting you to sign in...</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-foreground mb-2">
                  Verify Email
                </h2>
                <p className="text-muted-foreground">
                  Enter the 6-digit code sent to{" "}
                  <span className="font-semibold text-foreground">{email || "your email"}</span>
                </p>
              </div>

              {/* API error */}
              {apiError && (
                <div className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                  {apiError}
                </div>
              )}

              {/* Resend success */}
              {resendMsg && (
                <div className="mb-5 p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm animate-fade-in">
                  {resendMsg}
                </div>
              )}

              {/* OTP inputs */}
              <div className="flex gap-3 justify-center mb-8">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onFocus={(e) => e.target.select()}
                    className={cn(
                      "w-12 h-14 text-center text-xl font-bold rounded-xl border-2 bg-card text-foreground",
                      "transition-all duration-200 outline-none",
                      "focus:border-primary focus:shadow-[0_0_0_3px_hsl(263_70%_58%/0.15)]",
                      digit ? "border-primary/60" : "border-border",
                      apiError ? "border-destructive" : ""
                    )}
                  />
                ))}
              </div>

              {/* Verify button */}
              <Button
                onClick={handleVerify}
                disabled={!isComplete || status === "loading"}
                className={cn(
                  "w-full h-11 font-semibold text-white transition-all duration-200",
                  "bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800",
                  "hover:shadow-[0_0_20px_hsl(263_70%_58%/0.4)]",
                  (!isComplete) && "opacity-50 cursor-not-allowed"
                )}
              >
                {status === "loading" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Verify Email"
                )}
              </Button>

              {/* Resend */}
              <div className="text-center mt-6">
                <p className="text-sm text-muted-foreground mb-2">Didn&apos;t receive the code?</p>
                <button
                  onClick={handleResend}
                  disabled={status === "resending"}
                  className="inline-flex items-center gap-2 text-primary text-sm font-semibold hover:underline disabled:opacity-50"
                >
                  {status === "resending" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCcw className="w-3.5 h-3.5" />
                  )}
                  {status === "resending" ? "Sending..." : "Resend Code"}
                </button>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-6">
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Back to Sign In
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
