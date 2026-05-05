"use client";

import { useEffect, useState } from "react";
import {
  Ticket,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Edit2,
  X,
  Loader2,
  AlertCircle,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import ApiService from "@/lib/api";
import type { BusinessCoupon } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ─── Coupon Form ──────────────────────────────────────────────────────────────

interface CouponFormData {
  title: string;
  description: string;
  /** 'free_item' is used locally as a 'no discount value' freebie option */
  discountType: BusinessCoupon["discountType"] | "free_item";
  discountValue: number;
  validFrom: string;
  validUntil: string;
  maxUsage: number;
}

const emptyForm = (): CouponFormData => ({
  title: "",
  description: "",
  discountType: "percentage",
  discountValue: 10,
  validFrom: new Date().toISOString().split("T")[0],
  validUntil: new Date(Date.now() + 30 * 86400_000).toISOString().split("T")[0],
  maxUsage: 100,
});

interface CouponFormProps {
  initialData?: Partial<BusinessCoupon>;
  businessId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function CouponForm({ initialData, businessId, onSuccess, onCancel }: CouponFormProps) {
  const [form, setForm] = useState<CouponFormData>({
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    discountType: (initialData?.discountType as CouponFormData["discountType"]) ?? "percentage",
    discountValue: initialData?.discountValue ?? 10,
    validFrom: initialData?.validFrom
      ? new Date(initialData.validFrom).toISOString().split("T")[0]
      : emptyForm().validFrom,
    validUntil: initialData?.validUntil
      ? new Date(initialData.validUntil).toISOString().split("T")[0]
      : emptyForm().validUntil,
    maxUsage: initialData?.maxUsage ?? 100,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initialData?._id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return setError("Title is required");
    setSaving(true);
    setError(null);
    try {
      const apiDiscountType: BusinessCoupon["discountType"] =
        form.discountType === "free_item" ? "free_item" : form.discountType as BusinessCoupon["discountType"];
      const payload: Partial<BusinessCoupon> = {
        title: form.title,
        description: form.description,
        business: businessId,
        discountType: apiDiscountType,
        discountValue: Number(form.discountValue),
        validFrom: new Date(form.validFrom).toISOString(),
        validUntil: new Date(form.validUntil).toISOString(),
        maxUsage: Number(form.maxUsage),
      };

      if (isEdit && initialData?._id) {
        await ApiService.updateBusinessCoupon(initialData._id, payload);
      } else {
        await ApiService.createBusinessCoupon(payload);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof CouponFormData, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label>Title *</Label>
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Summer Sale — 20% Off"
            className="mt-1 rounded-xl"
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Details about this coupon..."
            rows={2}
            className="mt-1 rounded-xl resize-none"
          />
        </div>
        <div>
          <Label>Discount Type</Label>
          <select
            value={form.discountType}
            onChange={(e) => set("discountType", e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount (£)</option>
            <option value="free_item">Freebie / Free Item</option>
          </select>
        </div>
        {form.discountType !== "free_item" && (
          <div>
            <Label>
              {form.discountType === "percentage" ? "Discount %" : "Amount (£)"}
            </Label>
            <Input
              type="number"
              min={0}
              max={form.discountType === "percentage" ? 100 : 10000}
              value={form.discountValue}
              onChange={(e) => set("discountValue", e.target.value)}
              className="mt-1 rounded-xl"
            />
          </div>
        )}
        <div>
          <Label>Valid From</Label>
          <Input
            type="date"
            value={form.validFrom}
            onChange={(e) => set("validFrom", e.target.value)}
            className="mt-1 rounded-xl"
          />
        </div>
        <div>
          <Label>Valid Until</Label>
          <Input
            type="date"
            value={form.validUntil}
            onChange={(e) => set("validUntil", e.target.value)}
            className="mt-1 rounded-xl"
          />
        </div>
        <div>
          <Label>Max Uses</Label>
          <Input
            type="number"
            min={1}
            value={form.maxUsage}
            onChange={(e) => set("maxUsage", e.target.value)}
            className="mt-1 rounded-xl"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Update Coupon" : "Create Coupon"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Coupon card ──────────────────────────────────────────────────────────────

function CouponCard({
  coupon,
  onToggle,
  onEdit,
  onDelete,
}: {
  coupon: BusinessCoupon;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const c = coupon as unknown as Record<string, unknown>;
  const discountType = c.discountType as string | undefined;
  const discountValue = c.discountValue as number | undefined;
  const validUntil = c.validUntil ? new Date(c.validUntil as string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;
  const maxRed = coupon.maxUsage;
  const currentRed = coupon.usageCount;

  const discountLabel =
    discountType === "percentage"
      ? `${discountValue}% OFF`
      : discountType === "fixed"
      ? `£${discountValue} OFF`
      : "Freebie";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 transition-all duration-200",
        coupon.isActive
          ? "border-orange-200 dark:border-orange-800/60"
          : "border-border opacity-60"
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-bold",
            coupon.isActive
              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
              : "bg-muted text-muted-foreground"
          )}>
            {discountLabel}
          </div>
          {!coupon.isActive && (
            <span className="text-[10px] text-muted-foreground font-medium bg-muted rounded-full px-2 py-0.5">
              Paused
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onToggle} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            {coupon.isActive ? <ToggleRight className="w-4 h-4 text-orange-500" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
          <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <h3 className="font-semibold text-foreground text-sm mb-1">{coupon.title}</h3>
      {coupon.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{coupon.description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {validUntil && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Expires {validUntil}
          </span>
        )}
        {maxRed !== undefined && currentRed !== undefined && (
          <span className="flex items-center gap-1">
            <Ticket className="w-3 h-3" />
            {currentRed}/{maxRed} redeemed
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CouponsPage() {
  const [myBusinessId, setMyBusinessId] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<BusinessCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<BusinessCoupon | null>(null);

  const fetchData = async (id: string) => {
    setLoading(true);
    try {
      const res = await ApiService.getBusinessCouponsList(id);
      setCoupons(res.coupons ?? []);
    } catch {
      setError("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    ApiService.getMyBusinesses()
      .then((res) => {
        const id = res.businesses?.[0]?._id;
        setMyBusinessId(id ?? null);
        if (id) fetchData(id);
        else setLoading(false);
      })
      .catch(() => { setError("Failed to load business"); setLoading(false); });
  }, []);

  const handleToggle = async (coupon: BusinessCoupon) => {
    await ApiService.toggleCouponStatus(coupon._id);
    if (myBusinessId) fetchData(myBusinessId);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    await ApiService.deleteBusinessCoupon(id);
    if (myBusinessId) fetchData(myBusinessId);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCoupon(null);
    if (myBusinessId) fetchData(myBusinessId);
  };

  const activeCoupons = coupons.filter((c) => c.isActive);
  const inactiveCoupons = coupons.filter((c) => !c.isActive);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Coupons</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeCoupons.length} active · {coupons.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => myBusinessId && fetchData(myBusinessId)}
            disabled={loading}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          </Button>
          <Button
            size="sm"
            onClick={() => { setEditingCoupon(null); setShowForm(true); }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Coupon
          </Button>
        </div>
      </div>

      {/* Create / Edit Form */}
      {(showForm || editingCoupon) && myBusinessId && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-foreground">
              {editingCoupon ? "Edit Coupon" : "Create Coupon"}
            </h2>
            <button
              onClick={() => { setShowForm(false); setEditingCoupon(null); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <CouponForm
            initialData={editingCoupon ?? undefined}
            businessId={myBusinessId}
            onSuccess={handleFormSuccess}
            onCancel={() => { setShowForm(false); setEditingCoupon(null); }}
          />
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Coupons list */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse h-32" />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
            <Ticket className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="font-display font-bold text-foreground mb-2">No coupons yet</h2>
          <p className="text-muted-foreground text-sm max-w-xs mb-5">
            Create promotional coupons to attract customers and reward loyalty.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create First Coupon
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeCoupons.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Active ({activeCoupons.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeCoupons.map((c) => (
                  <CouponCard
                    key={c._id}
                    coupon={c}
                    onToggle={() => handleToggle(c)}
                    onEdit={() => { setEditingCoupon(c); setShowForm(false); }}
                    onDelete={() => handleDelete(c._id)}
                  />
                ))}
              </div>
            </div>
          )}
          {inactiveCoupons.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Paused ({inactiveCoupons.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {inactiveCoupons.map((c) => (
                  <CouponCard
                    key={c._id}
                    coupon={c}
                    onToggle={() => handleToggle(c)}
                    onEdit={() => { setEditingCoupon(c); setShowForm(false); }}
                    onDelete={() => handleDelete(c._id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
