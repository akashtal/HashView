"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  ChevronLeft,
  Info,
  X,
  Image as ImageIcon,
} from "lucide-react";
import ApiService from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocKey =
  | "ownerIdProof"
  | "addressProof"
  | "selfie"
  | "businessLicense"
  | "foodSafetyCertificate";

interface DocConfig {
  key: DocKey;
  label: string;
  description: string;
  required: boolean;
}

const DOCUMENTS: DocConfig[] = [
  {
    key: "ownerIdProof",
    label: "Owner ID Proof",
    description: "Passport, driving licence, or national ID card",
    required: true,
  },
  {
    key: "addressProof",
    label: "Address Proof",
    description: "Utility bill, bank statement, or council tax letter (within 3 months)",
    required: true,
  },
  {
    key: "selfie",
    label: "Selfie with ID",
    description: "A clear photo of yourself holding your ID document",
    required: true,
  },
  {
    key: "businessLicense",
    label: "Business Licence",
    description: "Company registration, trading licence, or equivalent (if applicable)",
    required: false,
  },
  {
    key: "foodSafetyCertificate",
    label: "Food Safety Certificate",
    description: "Required only for food & beverage businesses",
    required: false,
  },
];

// ─── Upload zone ──────────────────────────────────────────────────────────────

interface UploadZoneProps {
  config: DocConfig;
  file: File | null;
  preview: string | null;
  onFileSelect: (file: File, preview: string) => void;
  onRemove: () => void;
}

function UploadZone({ config, file, preview, onFileSelect, onRemove }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    onFileSelect(f, url);
    e.target.value = "";
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{config.label}</p>
            {config.required && (
              <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded-full">
                Required
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
        </div>
      </div>

      {file ? (
        <div className="relative rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30">
          {preview && (
            <img src={preview} alt={config.label} className="w-full h-28 object-cover" />
          )}
          <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium truncate max-w-[180px]">
                {file.name}
              </span>
            </div>
            <button onClick={onRemove} className="w-6 h-6 rounded-full bg-white/80 dark:bg-black/30 flex items-center justify-center hover:opacity-70">
              <X className="w-3 h-3 text-foreground" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-primary/5 transition-all py-6 flex flex-col items-center gap-2"
        >
          <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <Upload className="w-4.5 h-4.5 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              <span className="text-primary font-medium">Click to upload</span> or drag & drop
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">JPG, PNG, PDF up to 10MB</p>
          </div>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function KYCPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = searchParams.get("businessId") ?? "";

  const [files, setFiles] = useState<Record<DocKey, File | null>>({
    ownerIdProof: null,
    addressProof: null,
    selfie: null,
    businessLicense: null,
    foodSafetyCertificate: null,
  });
  const [previews, setPreviews] = useState<Record<DocKey, string | null>>({
    ownerIdProof: null,
    addressProof: null,
    selfie: null,
    businessLicense: null,
    foodSafetyCertificate: null,
  });

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const setFile = (key: DocKey, file: File, preview: string) => {
    setFiles((f) => ({ ...f, [key]: file }));
    setPreviews((p) => ({ ...p, [key]: preview }));
  };

  const removeFile = (key: DocKey) => {
    setFiles((f) => ({ ...f, [key]: null }));
    setPreviews((p) => ({ ...p, [key]: null }));
  };

  const requiredDocs = DOCUMENTS.filter((d) => d.required);
  const requiredFilled = requiredDocs.every((d) => files[d.key] !== null);

  const handleSubmit = async () => {
    if (!businessId) return setError("Business ID not found. Go back and register your business first.");
    if (!requiredFilled) return setError("Please upload all required documents.");

    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      DOCUMENTS.forEach(({ key }) => {
        if (files[key]) fd.append(key, files[key]!);
      });
      await ApiService.uploadDocuments(businessId, fd);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-3">
            Documents Submitted! ✅
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Our team will review your documents within 1–3 business days. You&apos;ll receive a notification once your business is verified.
          </p>
          <Button onClick={() => router.push("/dashboard")}>
            Go to Dashboard →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-900 via-purple-800 to-violet-900 pt-10 pb-16 px-4 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
        <Link href="/register-business" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm mb-6 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">
          KYC Verification
        </h1>
        <p className="text-white/70 text-sm max-w-sm mx-auto">
          Upload your verification documents to get your business approved and listed on HashView.
        </p>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 -mt-8 pb-16">
        <div className="rounded-3xl border border-border bg-card shadow-xl p-6 sm:p-8 space-y-6">
          {/* Info note */}
          <div className="flex items-start gap-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              All documents are securely stored and used only for verification purposes. We comply with GDPR and UK data protection regulations.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 rounded-xl px-4 py-3">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {requiredDocs.filter((d) => files[d.key]).length}/{requiredDocs.length} required docs uploaded
            </span>
            <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-orange-500 transition-all"
                style={{
                  width: `${(requiredDocs.filter((d) => files[d.key]).length / requiredDocs.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Required docs */}
          <div>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              Required Documents
            </h2>
            <div className="space-y-3">
              {DOCUMENTS.filter((d) => d.required).map((doc) => (
                <UploadZone
                  key={doc.key}
                  config={doc}
                  file={files[doc.key]}
                  preview={previews[doc.key]}
                  onFileSelect={(f, p) => setFile(doc.key, f, p)}
                  onRemove={() => removeFile(doc.key)}
                />
              ))}
            </div>
          </div>

          {/* Optional docs */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Optional Documents
            </h2>
            <div className="space-y-3">
              {DOCUMENTS.filter((d) => !d.required).map((doc) => (
                <UploadZone
                  key={doc.key}
                  config={doc}
                  file={files[doc.key]}
                  preview={previews[doc.key]}
                  onFileSelect={(f, p) => setFile(doc.key, f, p)}
                  onRemove={() => removeFile(doc.key)}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2.5 text-sm text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSubmit}
              disabled={uploading || !requiredFilled}
              className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 h-11"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Submit Documents
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard")}
              disabled={uploading}
            >
              Skip for Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page export (wrap in Suspense for useSearchParams) ───────────────────────

export default function KYCPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <KYCPageInner />
    </Suspense>
  );
}
