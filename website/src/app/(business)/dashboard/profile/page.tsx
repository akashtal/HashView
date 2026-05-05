"use client";

import { useEffect, useState, useRef } from "react";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Camera,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Upload,
  Save,
} from "lucide-react";
import ApiService from "@/lib/api";
import type { Business, OpeningHours, DayHours } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ─── Opening Hours Editor ─────────────────────────────────────────────────────

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type Day = typeof DAYS[number];

function HoursEditor({
  hours,
  onChange,
}: {
  hours: OpeningHours;
  onChange: (h: OpeningHours) => void;
}) {
  const setDay = (day: Day, field: keyof DayHours, value: string | boolean) => {
    onChange({
      ...hours,
      [day]: { ...(hours[day] ?? {}), [field]: value },
    });
  };

  return (
    <div className="space-y-2">
      {DAYS.map((day) => {
        const dh = hours[day] ?? {};
        const closed = dh.closed ?? false;
        return (
          <div key={day} className="flex items-center gap-3">
            <span className="w-24 text-sm capitalize text-foreground shrink-0">{day}</span>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
              <input
                type="checkbox"
                checked={!closed}
                onChange={(e) => setDay(day, "closed", !e.target.checked)}
                className="rounded"
              />
              Open
            </label>
            {!closed ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="time"
                  value={dh.open ?? "09:00"}
                  onChange={(e) => setDay(day, "open", e.target.value)}
                  className="rounded-lg text-xs h-8 flex-1"
                />
                <span className="text-muted-foreground text-xs shrink-0">to</span>
                <Input
                  type="time"
                  value={dh.close ?? "17:00"}
                  onChange={(e) => setDay(day, "close", e.target.value)}
                  className="rounded-lg text-xs h-8 flex-1"
                />
              </div>
            ) : (
              <span className="text-xs text-muted-foreground italic">Closed</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Image uploader ───────────────────────────────────────────────────────────

function ImageUploader({
  label,
  currentUrl,
  onUpload,
  type,
  businessId,
}: {
  label: string;
  currentUrl?: string;
  onUpload: (url: string) => void;
  type: "logo" | "cover";
  businessId: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append(type === "logo" ? "logo" : "coverImage", file);
      const fn = type === "logo"
        ? ApiService.uploadBusinessLogo
        : ApiService.uploadBusinessCover;
      const res = await fn(fd, businessId) as unknown as Record<string, unknown>;
      const url = (res.url ?? res.logoUrl ?? res.coverUrl ?? res.imageUrl) as string | undefined;
      if (url) onUpload(url);
    } catch (err) {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Label className="mb-2 block">{label}</Label>
      <div
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer overflow-hidden",
          type === "cover" ? "h-32" : "h-24 w-24"
        )}
      >
        {currentUrl ? (
          <img src={currentUrl} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <Camera className="w-5 h-5 mb-1" />
            <span className="text-xs">Upload</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
        <div className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-primary/80 flex items-center justify-center">
          <Upload className="w-3 h-3 text-white" />
        </div>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  // Address
  buildingNumber: string;
  street: string;
  area: string;
  city: string;
  county: string;
  country: string;
  postcode: string;
  // Images
  logoUrl: string;
  coverUrl: string;
  // Hours
  openingHours: OpeningHours;
}

export default function BusinessProfilePage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "", description: "", email: "", phone: "", website: "",
    buildingNumber: "", street: "", area: "", city: "", county: "", country: "United Kingdom", postcode: "",
    logoUrl: "", coverUrl: "",
    openingHours: {},
  });

  useEffect(() => {
    ApiService.getMyBusinesses()
      .then((res) => {
        const biz = res.businesses?.[0];
        if (!biz) return;
        setBusiness(biz);
        setForm({
          name: biz.name ?? "",
          description: biz.description ?? "",
          email: biz.email ?? "",
          phone: biz.phone ?? "",
          website: biz.socialMedia?.website ?? "",
          buildingNumber: biz.address?.buildingNumber ?? "",
          street: biz.address?.street ?? "",
          area: biz.address?.area ?? "",
          city: biz.address?.city ?? "",
          county: biz.address?.county ?? "",
          country: biz.address?.country ?? "United Kingdom",
          postcode: biz.address?.postcode ?? "",
          logoUrl: biz.logo?.url ?? "",
          coverUrl: biz.coverImage?.url ?? "",
          openingHours: biz.openingHours ?? {},
        });
      })
      .catch(() => setError("Failed to load business profile"))
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof FormState, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!business?._id) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await ApiService.updateBusiness(business._id, {
        name: form.name,
        description: form.description,
        email: form.email,
        phone: form.phone,
        socialMedia: { website: form.website },
        address: {
          buildingNumber: form.buildingNumber,
          street: form.street,
          area: form.area,
          city: form.city,
          county: form.county,
          country: form.country,
          postcode: form.postcode,
        },
        openingHours: form.openingHours,
      } as Partial<Business>);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse h-40" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Business Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your business information visible to customers
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !business}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Business profile updated successfully!
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {!business && !loading && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-foreground font-medium">No business registered yet</p>
          <p className="text-muted-foreground text-sm mt-1">
            <a href="/register-business" className="text-primary underline">Register your business</a> to get started.
          </p>
        </div>
      )}

      {business && (
        <>
          {/* Images */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
              <Camera className="w-4 h-4" /> Images
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ImageUploader
                label="Business Logo"
                currentUrl={form.logoUrl}
                type="logo"
                businessId={business._id}
                onUpload={(url) => set("logoUrl", url)}
              />
              <div className="flex-1">
                <ImageUploader
                  label="Cover Image"
                  currentUrl={form.coverUrl}
                  type="cover"
                  businessId={business._id}
                  onUpload={(url) => set("coverUrl", url)}
                />
              </div>
            </div>
          </div>

          {/* Basic info */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Basic Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Business Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className="mt-1 rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  className="mt-1 rounded-xl resize-none"
                  placeholder="Tell customers about your business..."
                />
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  type="email"
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  type="tel"
                  className="mt-1 rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Website</Label>
                <Input
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  type="url"
                  placeholder="https://yourwebsite.com"
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Address
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Building Number</Label>
                <Input value={form.buildingNumber} onChange={(e) => set("buildingNumber", e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>Street</Label>
                <Input value={form.street} onChange={(e) => set("street", e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>Area / Suburb</Label>
                <Input value={form.area} onChange={(e) => set("area", e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>County / State</Label>
                <Input value={form.county} onChange={(e) => set("county", e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>Postcode / ZIP</Label>
                <Input value={form.postcode} onChange={(e) => set("postcode", e.target.value)} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={form.country} onChange={(e) => set("country", e.target.value)} className="mt-1 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Opening Hours */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h2 className="font-display font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" /> Opening Hours
            </h2>
            <HoursEditor
              hours={form.openingHours}
              onChange={(h) => set("openingHours", h)}
            />
          </div>

          {/* Save button (bottom) */}
          <div className="flex justify-end pb-4">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
