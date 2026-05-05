"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building,
  Tag,
  Info,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import ApiService from "@/lib/api";
import { useCategories } from "@/lib/hooks/useBusinesses";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ─── Steps config ─────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Business Info", icon: Building2 },
  { id: 2, label: "Contact & Location", icon: MapPin },
  { id: 3, label: "Category & Details", icon: Tag },
  { id: 4, label: "Review & Submit", icon: CheckCircle2 },
];

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, idx) => {
        const isCompleted = step.id < current;
        const isActive = step.id === current;
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : isActive
                    ? "border-primary text-primary bg-primary/10"
                    : "border-border text-muted-foreground bg-muted/30"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4.5 h-4.5" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium hidden sm:block",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-12 sm:w-20 h-0.5 mx-1 mb-5 rounded-full transition-all duration-300",
                  isCompleted ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface RegistrationForm {
  // Step 1 — Business Info
  name: string;
  description: string;
  // Step 2 — Contact & Location
  email: string;
  phone: string;
  website: string;
  buildingNumber: string;
  street: string;
  area: string;
  city: string;
  county: string;
  country: string;
  postcode: string;
  // Step 3 — Category & Details
  category: string;
  radius: number;
}

const defaultForm = (): RegistrationForm => ({
  name: "", description: "",
  email: "", phone: "", website: "",
  buildingNumber: "", street: "", area: "", city: "",
  county: "", country: "United Kingdom", postcode: "",
  category: "", radius: 5000,
});

// ─── Field error checker ──────────────────────────────────────────────────────

function validateStep(step: number, form: RegistrationForm): string | null {
  if (step === 1) {
    if (!form.name.trim()) return "Business name is required";
    if (!form.description.trim()) return "Description is required";
  }
  if (step === 2) {
    if (!form.email.trim()) return "Email is required";
    if (!form.city.trim()) return "City is required";
    if (!form.postcode.trim()) return "Postcode is required";
  }
  if (step === 3) {
    if (!form.category) return "Please select a category";
  }
  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterBusinessPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<RegistrationForm>(defaultForm());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdBusinessId, setCreatedBusinessId] = useState<string | null>(null);

  const { data: categories } = useCategories();

  const set = (k: keyof RegistrationForm, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  const goNext = () => {
    const err = validateStep(step, form);
    if (err) return setError(err);
    setError(null);
    setStep((s) => Math.min(s + 1, 4));
  };

  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        email: form.email,
        phone: form.phone,
        category: form.category,
        radius: form.radius,
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
      };
      const res = await ApiService.registerBusiness(payload);
      setCreatedBusinessId(res.business._id);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register business");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────

  if (submitted && createdBusinessId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-3">
            Business Registered! 🎉
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Your business has been submitted for review. To get verified faster, complete your KYC verification.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => router.push(`/register-business/kyc?businessId=${createdBusinessId}`)}>
              Complete KYC Verification →
            </Button>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-violet-900 via-purple-800 to-violet-800 pt-10 pb-16 px-4 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">
          Register Your Business
        </h1>
        <p className="text-white/70 text-sm max-w-sm mx-auto">
          Get listed on HashView and start attracting local customers — it&apos;s free.
        </p>
      </div>

      {/* Card */}
      <div className="max-w-2xl mx-auto px-4 -mt-8 pb-16">
        <div className="rounded-3xl border border-border bg-card shadow-xl p-6 sm:p-8">
          {/* Step indicator */}
          <StepIndicator current={step} />

          {/* ── Step 1: Business Info ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-3">
                  <Building className="w-6 h-6 text-violet-500" />
                </div>
                <h2 className="text-lg font-display font-bold text-foreground">Business Information</h2>
                <p className="text-muted-foreground text-sm mt-1">Tell us about your business</p>
              </div>

              <div>
                <Label>Business Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. The Coffee House"
                  className="mt-1 rounded-xl"
                />
              </div>

              <div>
                <Label>Description *</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Describe your business — what you offer, your specialties, what makes you unique..."
                  rows={4}
                  className="mt-1 rounded-xl resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {form.description.length}/500 characters
                </p>
              </div>
            </div>
          )}

          {/* ── Step 2: Contact & Location ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-6 h-6 text-blue-500" />
                </div>
                <h2 className="text-lg font-display font-bold text-foreground">Contact & Location</h2>
                <p className="text-muted-foreground text-sm mt-1">Help customers find and contact you</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Phone</Label>
                  <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="mt-1 rounded-xl" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Website</Label>
                  <Input type="url" placeholder="https://" value={form.website} onChange={(e) => set("website", e.target.value)} className="mt-1 rounded-xl" />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Address
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Building No.</Label>
                    <Input value={form.buildingNumber} onChange={(e) => set("buildingNumber", e.target.value)} className="mt-1 rounded-xl" />
                  </div>
                  <div>
                    <Label>Street</Label>
                    <Input value={form.street} onChange={(e) => set("street", e.target.value)} className="mt-1 rounded-xl" />
                  </div>
                  <div>
                    <Label>Area</Label>
                    <Input value={form.area} onChange={(e) => set("area", e.target.value)} className="mt-1 rounded-xl" />
                  </div>
                  <div>
                    <Label>City *</Label>
                    <Input value={form.city} onChange={(e) => set("city", e.target.value)} className="mt-1 rounded-xl" />
                  </div>
                  <div>
                    <Label>County / State</Label>
                    <Input value={form.county} onChange={(e) => set("county", e.target.value)} className="mt-1 rounded-xl" />
                  </div>
                  <div>
                    <Label>Postcode *</Label>
                    <Input value={form.postcode} onChange={(e) => set("postcode", e.target.value)} className="mt-1 rounded-xl" />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input value={form.country} onChange={(e) => set("country", e.target.value)} className="mt-1 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Category & Details ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
                  <Tag className="w-6 h-6 text-orange-500" />
                </div>
                <h2 className="text-lg font-display font-bold text-foreground">Category & Details</h2>
                <p className="text-muted-foreground text-sm mt-1">Help customers discover your business</p>
              </div>

              <div>
                <Label>Business Category *</Label>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(categories ?? []).map((cat) => (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => set("category", cat.name)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-sm font-medium text-left transition-all",
                        form.category === cat.name
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-foreground hover:border-primary/40 hover:bg-muted/40"
                      )}
                    >
                      {cat.icon && <span className="mr-1.5">{cat.icon}</span>}
                      {cat.name}
                    </button>
                  ))}
                  {(categories ?? []).length === 0 && (
                    <div className="col-span-full">
                      <Input
                        value={form.category}
                        onChange={(e) => set("category", e.target.value)}
                        placeholder="Enter your business category"
                        className="rounded-xl"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Service Radius</Label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="range"
                    min={500}
                    max={50000}
                    step={500}
                    value={form.radius}
                    onChange={(e) => set("radius", Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium text-foreground w-20 text-right">
                    {form.radius >= 1000
                      ? `${(form.radius / 1000).toFixed(1)} km`
                      : `${form.radius} m`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Distance within which your business will appear in &ldquo;nearby&rdquo; searches
                </p>
              </div>
            </div>
          )}

          {/* ── Step 4: Review & Submit ── */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
                <h2 className="text-lg font-display font-bold text-foreground">Review & Submit</h2>
                <p className="text-muted-foreground text-sm mt-1">Confirm your business details before submitting</p>
              </div>

              {/* Summary cards */}
              <div className="space-y-3">
                {[
                  {
                    title: "Business Info",
                    icon: Building2,
                    rows: [
                      { label: "Name", value: form.name },
                      { label: "Description", value: form.description.substring(0, 80) + (form.description.length > 80 ? "..." : "") },
                    ],
                  },
                  {
                    title: "Contact & Location",
                    icon: MapPin,
                    rows: [
                      { label: "Email", value: form.email },
                      { label: "Phone", value: form.phone || "—" },
                      { label: "City", value: form.city },
                      { label: "Postcode", value: form.postcode },
                    ],
                  },
                  {
                    title: "Category",
                    icon: Tag,
                    rows: [
                      { label: "Category", value: form.category },
                      {
                        label: "Radius",
                        value: form.radius >= 1000
                          ? `${(form.radius / 1000).toFixed(1)} km`
                          : `${form.radius} m`,
                      },
                    ],
                  },
                ].map(({ title, icon: Icon, rows }) => (
                  <div key={title} className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" /> {title}
                      </h3>
                      <button
                        onClick={() => {
                          setStep(title === "Business Info" ? 1 : title === "Contact & Location" ? 2 : 3);
                          setError(null);
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="space-y-1">
                      {rows.map(({ label, value }) => (
                        <div key={label} className="flex items-baseline gap-2 text-sm">
                          <span className="text-muted-foreground min-w-[80px] shrink-0">{label}:</span>
                          <span className="text-foreground">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  After submission you&apos;ll be prompted to upload verification documents (KYC). Your business will be reviewed by our team before going live.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2.5 text-sm text-red-700 dark:text-red-400 mt-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <Button variant="outline" onClick={goBack} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
            )}
            {step < 4 ? (
              <Button onClick={goNext} className="flex-1">
                Continue
                <ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {submitting ? "Registering..." : "Register Business"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
