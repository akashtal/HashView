"use client";

import { useState, useEffect } from "react";
import { Settings, Bell, Moon, Sun, Globe, Shield, Trash2, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ApiService from "@/lib/api";

function SettingRow({
  icon: Icon,
  label,
  description,
  onClick,
  href,
  danger,
  toggle,
  checked,
}: {
  icon: React.ElementType;
  label: string;
  description?: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  toggle?: boolean;
  checked?: boolean;
}) {
  const content = (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors w-full text-left",
      danger && "hover:bg-destructive/5"
    )}>
      <div className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
        danger ? "bg-destructive/10" : "bg-primary/10"
      )}>
        <Icon className={cn("w-4 h-4", danger ? "text-destructive" : "text-primary")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("font-medium text-sm", danger ? "text-destructive" : "text-foreground")}>{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {toggle ? (
        <div className={cn(
          "w-11 h-6 rounded-full border-2 relative transition-colors duration-300 shrink-0",
          checked ? "bg-primary border-primary" : "bg-muted border-border"
        )}>
          <div className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300",
            checked ? "left-5" : "left-0.5"
          )} />
        </div>
      ) : (
        !danger && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      )}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  if (onClick) return <button onClick={onClick} className="w-full">{content}</button>;
  return content;
}

export default function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/account/settings');
    }
  }, [user, loading, router]);

  const [deletingAccount, setDeletingAccount] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  const isDark = theme === "dark";

  const handleDeleteAccount = async () => {
    const password = prompt("Enter your password to confirm account deletion:");
    if (!password) return;
    if (!confirm("Are you sure? This action cannot be undone.")) return;
    setDeletingAccount(true);
    try {
      await ApiService.deleteAccount({ password });
      logout();
      router.push("/");
    } catch {
      setDeletingAccount(false);
      alert("Failed to delete account. Please contact support.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-full">
      <div className="bg-gradient-to-br from-violet-900 via-purple-900 to-violet-800 pt-6 pb-8 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="max-w-xl mx-auto relative px-4 sm:px-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-display font-bold text-white">Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* Appearance */}
        <div className="bg-card rounded-3xl border border-border overflow-hidden">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4 pt-4 pb-2">Appearance</p>
          <SettingRow
            icon={isDark ? Moon : Sun}
            label={isDark ? "Dark Mode" : "Light Mode"}
            description="Switch between light and dark theme"
            toggle
            checked={isDark}
            onClick={() => setTheme(isDark ? "light" : "dark")}
          />
        </div>

        {/* Notifications */}
        <div className="bg-card rounded-3xl border border-border overflow-hidden divide-y divide-border">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4 pt-4 pb-2">Notifications</p>
          <SettingRow
            icon={Bell}
            label="Push Notifications"
            description="Alerts for new offers and updates"
            toggle
            checked={pushEnabled}
            onClick={() => setPushEnabled((v) => !v)}
          />
          <SettingRow
            icon={Globe}
            label="Email Notifications"
            description="Receive updates via email"
            toggle
            checked={emailEnabled}
            onClick={() => setEmailEnabled((v) => !v)}
          />
        </div>

        {/* Account */}
        <div className="bg-card rounded-3xl border border-border overflow-hidden divide-y divide-border">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4 pt-4 pb-2">Account</p>
          <SettingRow
            icon={Shield}
            label="Change Password"
            description="Update your account password"
            href="/account/change-password"
          />
          <SettingRow
            icon={Globe}
            label="Privacy Policy"
            href="/privacy"
          />
        </div>

        {/* Danger zone */}
        <div className="bg-card rounded-3xl border border-destructive/20 overflow-hidden">
          <p className="text-xs font-bold text-destructive/70 uppercase tracking-widest px-4 pt-4 pb-2">Danger Zone</p>
          <SettingRow
            icon={Trash2}
            label="Delete Account"
            description="Permanently delete your account and data"
            danger
            onClick={handleDeleteAccount}
          />
        </div>

        {deletingAccount && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-medium text-foreground">Deleting account...</p>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pt-2">
          HashView v1.0.0 · {user.email}
        </p>
      </div>
    </div>
  );
}
