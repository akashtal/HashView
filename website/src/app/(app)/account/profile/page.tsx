"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User, Settings, Lock, Ticket, History,
  HelpCircle, LogOut, ChevronRight, Building2, Star, Crown,
  Shield, Mail, Globe, UserPlus, LogIn
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = ["#6C47FF", "#F59E0B", "#10B981", "#EF4444", "#3B82F6", "#EC4899"];

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, isPro } = useAuth();

  if (!user) return null;

  const isGuest = user.role === 'guest' || user.isGuest;

  // ── Guest profile ────────────────────────────────────────────────────────────
  if (isGuest) {
    return (
      <div className="min-h-full">
        <div className="bg-gradient-to-br from-violet-600 to-purple-800 pt-6 pb-12 px-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, #fff 0%, transparent 60%)' }} />
          <div className="relative max-w-lg mx-auto text-center pt-8 pb-4">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <Globe className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-display font-bold text-white mb-1">Guest User</h1>
            <p className="text-white/70 text-sm">Exploring without an account</p>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 -mt-6 pb-8 space-y-4">
          <div className="bg-card rounded-2xl p-6 shadow-lg border border-border">
            <p className="text-center text-muted-foreground text-sm mb-5">Create a free account to unlock reviews, favorites, coupons, and more.</p>
            <div className="space-y-3">
              <Link href="/register" className="flex items-center gap-3 p-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <UserPlus className="w-5 h-5" />
                <div>
                  <p className="font-bold text-sm">Create Free Account</p>
                  <p className="text-xs text-white/70">Takes less than a minute</p>
                </div>
              </Link>
              <Link href="/login" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                <LogIn className="w-5 h-5 text-foreground" />
                <div>
                  <p className="font-bold text-sm text-foreground">Sign In</p>
                  <p className="text-xs text-muted-foreground">Already have an account</p>
                </div>
              </Link>
            </div>
          </div>
          <div className="bg-card rounded-2xl divide-y divide-border border border-border">
            <Link href="/help" className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors rounded-t-2xl">
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium text-foreground">Help &amp; Support</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors rounded-b-2xl">
              <LogOut className="w-5 h-5 text-muted-foreground" />
              <span className="flex-1 text-left text-sm font-medium text-foreground">Exit Guest Mode</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const initial = user.name.charAt(0).toUpperCase();
  const avatarColor = AVATAR_COLORS[initial.charCodeAt(0) % AVATAR_COLORS.length];
  const isBusiness = user.role === "business";

  const menuGroups = [
    {
      title: "Account Details",
      items: [
        { icon: User, label: "Edit Profile", href: "/account/edit", color: "text-blue-500", bg: "bg-blue-500/10" },
        { icon: Lock, label: "Change Password", href: "/account/change-password", color: "text-rose-500", bg: "bg-rose-500/10" },
        { icon: Settings, label: "Preferences", href: "/account/settings", color: "text-slate-500", bg: "bg-slate-500/10" },
      ],
    },
    ...(!isBusiness ? [{
      title: "My Activity",
      items: [
        { icon: Ticket, label: "My Coupons", href: "/coupons", color: "text-orange-500", bg: "bg-orange-500/10" },
        { icon: Star, label: "My Reviews", href: "/account/reviews", color: "text-amber-500", bg: "bg-amber-500/10" },
        { icon: History, label: "Visit History", href: "/history", color: "text-indigo-500", bg: "bg-indigo-500/10" },
      ],
    }] : [{
      title: "Business Center",
      items: [
        { icon: Building2, label: "My Dashboard", href: "/dashboard", color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { icon: Crown, label: "Subscription", href: "/dashboard/subscription", color: "text-yellow-500", bg: "bg-yellow-500/10" },
      ],
    }]),
    {
      title: "Support & Help",
      items: [
        { icon: HelpCircle, label: "Help & FAQ", href: "/help", color: "text-violet-500", bg: "bg-violet-500/10" },
        { icon: Shield, label: "Privacy Policy", href: "/privacy", color: "text-teal-500", bg: "bg-teal-500/10" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Banner */}
      <div className={cn(
        "relative pt-12 pb-24 px-6 overflow-hidden",
        isBusiness
          ? "bg-gradient-to-br from-orange-500 via-amber-600 to-orange-700"
          : "bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800"
      )}>
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="max-w-3xl mx-auto relative z-10 flex flex-col items-center text-center">
          {/* Avatar Ring */}
          <div className="relative mb-5 group">
            <div className="absolute inset-0 bg-white/30 rounded-[2.25rem] blur-xl scale-110 group-hover:scale-125 transition-transform duration-500" />
            <div
              className="relative w-28 h-28 rounded-[2rem] flex items-center justify-center text-white text-5xl font-black shadow-2xl border-4 border-white/40 overflow-hidden transform transition-transform duration-500 hover:scale-105 hover:rotate-3"
              style={{ backgroundColor: avatarColor }}
            >
              {user.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
              ) : initial}
            </div>
            
            {/* Pro Badge overlapping avatar */}
            {isPro && (
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-yellow-400 to-amber-600 text-white p-2 rounded-xl shadow-lg border-2 border-white transform rotate-12">
                <Crown className="w-5 h-5" />
              </div>
            )}
          </div>

          <h1 className="text-3xl font-display font-black text-white mb-2 tracking-tight drop-shadow-md">
            {user.name}
          </h1>
          <div className="flex items-center justify-center gap-2 text-white/90 text-sm font-medium bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-md">
            <Mail className="w-4 h-4 opacity-70" />
            {user.email}
          </div>

          {/* Role Pill */}
          <div className={cn(
            "mt-6 flex items-center gap-2 px-5 py-2 rounded-2xl text-sm font-bold shadow-lg backdrop-blur-md border",
            isBusiness 
              ? "bg-amber-500/20 text-amber-50 border-amber-400/30" 
              : "bg-purple-500/20 text-purple-50 border-purple-400/30"
          )}>
            {isBusiness ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
            {isBusiness ? "Business Owner Account" : "Customer Account"}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-10 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuGroups.map((group, groupIdx) => (
            <div 
              key={group.title} 
              className="bg-card/90 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-border shadow-xl shadow-black/5 flex flex-col"
              style={{ animationDelay: `${groupIdx * 100}ms` }}
            >
              <div className="px-6 pt-6 pb-3">
                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">
                  {group.title}
                </h3>
              </div>
              
              <div className="flex-1 flex flex-col p-3 pt-0 gap-1.5">
                {group.items.map(({ icon: Icon, label, href, color, bg }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-muted transition-all duration-300"
                  >
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm", bg, color)}>
                      <Icon className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                    <span className="flex-1 font-semibold text-foreground text-[15px]">{label}</span>
                    <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center shadow-sm border border-border/50 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 group-hover:border-primary/20 transition-all duration-300 group-hover:translate-x-1">
                      <ChevronRight className="w-4 h-4" strokeWidth={3} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Logout Section */}
        <div className="mt-8 mb-12">
          <Button
            variant="outline"
            onClick={logout}
            className="w-full sm:w-auto sm:min-w-[250px] mx-auto flex items-center justify-center border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 rounded-2xl h-14 text-base font-bold shadow-sm transition-all duration-300 hover:shadow-rose-100 dark:border-rose-900/50 dark:hover:bg-rose-950/30"
          >
            <LogOut className="w-5 h-5 mr-3" strokeWidth={2.5} />
            Sign Out of HashView
          </Button>
        </div>
      </div>
    </div>
  );
}
