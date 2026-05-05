"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Phone, Camera, Loader2, CheckCircle2, ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import ApiService from "@/lib/api";
import Link from "next/link";

const AVATAR_COLORS = ["#6C47FF", "#F59E0B", "#10B981", "#EF4444", "#3B82F6", "#EC4899"];

export default function EditProfilePage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((d) => ({ ...d, [field]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { setError("Name is required"); return; }
    setStatus("loading");
    setError("");
    try {
      const res = await ApiService.updateProfile({ name: formData.name.trim(), phone: formData.phone.trim() || undefined });
      
      let finalProfileImage = res.user?.profileImage || user?.profileImage;

      if (imageFile) {
        const uploadData = new FormData();
        uploadData.append("profileImage", imageFile);
        const uploadRes = await ApiService.uploadProfileImage(uploadData) as any;
        if (uploadRes?.user?.profileImage) {
           finalProfileImage = uploadRes.user.profileImage;
        }
      }

      updateUser({ name: formData.name.trim(), phone: formData.phone.trim(), profileImage: finalProfileImage });
      
      setStatus("success");
      setTimeout(() => router.push("/account/profile"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile. Please try again.");
      setStatus("error");
    }
  };

  if (!user) return null;
  const initial = user.name.charAt(0).toUpperCase();
  const avatarColor = AVATAR_COLORS[initial.charCodeAt(0) % AVATAR_COLORS.length];
  const isBusiness = user.role === "business";

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Banner */}
      <div className={cn(
        "relative pt-8 pb-24 px-6 overflow-hidden",
        isBusiness
          ? "bg-gradient-to-br from-orange-500 via-amber-600 to-orange-700"
          : "bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800"
      )}>
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="max-w-xl mx-auto relative z-10">
          <Link href="/account/profile" className="inline-flex items-center text-white/80 hover:text-white transition-colors mb-4 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-md">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Profile
          </Link>
          <div className="flex flex-col items-center text-center">
            {/* Avatar Ring */}
            <div className="relative mb-4 group">
              <div className="absolute inset-0 bg-white/30 rounded-[2.25rem] blur-xl scale-110 transition-transform duration-500" />
              <div
                className="relative w-28 h-28 rounded-[2rem] flex items-center justify-center text-white text-5xl font-black shadow-2xl border-4 border-white/40 overflow-hidden"
                style={{ backgroundColor: avatarColor }}
              >
                {previewImage || user.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewImage || user.profileImage || ""} alt={user.name} className="w-full h-full object-cover" />
                ) : initial}
              </div>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImageFile(file);
                    setPreviewImage(URL.createObjectURL(file));
                  }
                }}
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-white border-2 border-transparent flex items-center justify-center shadow-xl hover:scale-110 transition-transform duration-300 text-slate-800 hover:text-primary"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>
            <h1 className="text-3xl font-display font-black text-white mb-1 tracking-tight drop-shadow-md">
              Edit Profile
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-xl mx-auto px-4 sm:px-6 -mt-12 relative z-20">
        <div className="bg-card/90 backdrop-blur-xl rounded-[2rem] border border-border shadow-2xl shadow-black/5 p-6 sm:p-8">
          {status === "success" ? (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5 relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-75" />
                <CheckCircle2 className="w-10 h-10 text-primary relative z-10" />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-2">Profile Updated!</h3>
              <p className="text-muted-foreground font-medium">Redirecting you back to your profile...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium animate-fade-in flex items-start gap-3 dark:bg-rose-950/30 dark:border-rose-900/50">
                  <span className="shrink-0 text-xl leading-none">⚠️</span>
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-bold text-foreground">Full Name</Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={update("name")}
                    placeholder="Your full name"
                    className="pl-12 h-14 rounded-2xl bg-muted/50 border-transparent focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-base font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-sm font-bold text-foreground">Email Address</Label>
                <div className="relative group opacity-70">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="edit-email"
                    value={user.email}
                    disabled
                    className="pl-12 h-14 rounded-2xl bg-muted/50 border-transparent text-base font-medium"
                  />
                </div>
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-1">
                  Email addresses cannot be changed here.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone" className="text-sm font-bold text-foreground">Phone Number</Label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={update("phone")}
                    placeholder="e.g. +44 7700 900000"
                    type="tel"
                    className="pl-12 h-14 rounded-2xl bg-muted/50 border-transparent focus:bg-background focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-base font-medium"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={status === "loading"}
                  className={cn(
                    "w-full h-14 rounded-2xl text-base font-bold shadow-lg transition-all duration-300",
                    isBusiness 
                      ? "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 hover:shadow-orange-500/25"
                      : "bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 hover:shadow-violet-600/25"
                  )}
                >
                  {status === "loading" ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Saving Changes...</span>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
