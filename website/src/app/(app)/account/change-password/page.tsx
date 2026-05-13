"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
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

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/account/change-password');
    }
  }, [user, loading, router]);

  const [form, setForm] = useState({ current: "", newPass: "", confirm: "" });
  const [show, setShow] = useState({ current: false, newPass: false, confirm: false });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [apiError, setApiError] = useState("");

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (fieldErrors[field]) setFieldErrors((fe) => { const n = { ...fe }; delete n[field]; return n; });
    if (apiError) setApiError("");
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.current) errs.current = "Current password is required";
    if (!form.newPass) errs.newPass = "New password is required";
    else if (form.newPass.length < 6) errs.newPass = "Password must be at least 6 characters";
    if (form.newPass !== form.confirm) errs.confirm = "Passwords do not match";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus("loading");
    setApiError("");
    try {
      await ApiService.changePassword({ currentPassword: form.current, newPassword: form.newPass });
      setStatus("success");
      setTimeout(() => router.push("/account/profile"), 2000);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to change password. Please check your current password.");
      setStatus("error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-full">
      <div className="bg-gradient-to-br from-violet-900 via-purple-900 to-violet-800 pt-6 pb-12 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="max-w-xl mx-auto relative text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-display font-bold text-white">Change Password</h1>
          <p className="text-white/70 text-sm mt-1">Keep your account secure</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-6 pb-8">
        <div className="bg-card rounded-3xl border border-border shadow-sm p-5">
          {status === "success" ? (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-1">Password Changed!</h3>
              <p className="text-muted-foreground text-sm">Redirecting you back...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {apiError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">{apiError}</div>
              )}

              {/* Current password */}
              <div className="space-y-1.5">
                <Label htmlFor="cp-current">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="cp-current"
                    type={show.current ? "text" : "password"}
                    value={form.current}
                    onChange={update("current")}
                    placeholder="Your current password"
                    className={cn("pl-10 pr-10", fieldErrors.current && "border-destructive")}
                  />
                  <button type="button" onClick={() => setShow((s) => ({ ...s, current: !s.current }))} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {show.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.current && <p className="text-destructive text-xs">{fieldErrors.current}</p>}
              </div>

              {/* New password */}
              <div className="space-y-1.5">
                <Label htmlFor="cp-new">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="cp-new"
                    type={show.newPass ? "text" : "password"}
                    value={form.newPass}
                    onChange={update("newPass")}
                    placeholder="Create a strong password"
                    className={cn("pl-10 pr-10", fieldErrors.newPass && "border-destructive")}
                  />
                  <button type="button" onClick={() => setShow((s) => ({ ...s, newPass: !s.newPass }))} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {show.newPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.newPass && <p className="text-destructive text-xs">{fieldErrors.newPass}</p>}
                {/* Strength bar */}
                {form.newPass && (
                  <div className="flex gap-1.5 mt-1">
                    {PASSWORD_RULES.map((r) => (
                      <div key={r.label} title={r.label} className={cn("flex-1 h-1 rounded-full transition-all duration-300", r.test(form.newPass) ? "bg-primary" : "bg-muted")} />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label htmlFor="cp-confirm">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="cp-confirm"
                    type={show.confirm ? "text" : "password"}
                    value={form.confirm}
                    onChange={update("confirm")}
                    placeholder="Confirm your new password"
                    className={cn("pl-10 pr-10", fieldErrors.confirm && "border-destructive")}
                  />
                  <button type="button" onClick={() => setShow((s) => ({ ...s, confirm: !s.confirm }))} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {show.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.confirm && <p className="text-destructive text-xs">{fieldErrors.confirm}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1" disabled={status === "loading"}>Cancel</Button>
                <Button type="submit" disabled={status === "loading"} className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700 text-white hover:from-violet-700 hover:to-purple-800">
                  {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
