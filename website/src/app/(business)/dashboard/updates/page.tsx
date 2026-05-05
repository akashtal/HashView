"use client";

import { useEffect, useState } from "react";
import {
  Megaphone,
  Plus,
  Trash2,
  Edit2,
  X,
  Loader2,
  AlertCircle,
  Calendar,
  Eye,
  RefreshCw,
  Tag,
} from "lucide-react";
import ApiService from "@/lib/api";
import type { BusinessUpdate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ─── Update Form ──────────────────────────────────────────────────────────────

interface UpdateFormData {
  type: BusinessUpdate["type"];
  title: string;
  description: string;
  discountType: "percentage" | "fixed" | "none";
  discountValue: number;
  validFrom: string;
  validUntil: string;
}

const emptyUpdateForm = (): UpdateFormData => ({
  type: "offer",
  title: "",
  description: "",
  discountType: "percentage",
  discountValue: 10,
  validFrom: new Date().toISOString().split("T")[0],
  validUntil: new Date(Date.now() + 30 * 86400_000).toISOString().split("T")[0],
});

interface UpdateFormProps {
  initialData?: Partial<BusinessUpdate>;
  businessId: string;
  onSuccess: () => void;
  onCancel: () => void;
  freeUpdatesLeft?: number;
}

function UpdateForm({
  initialData,
  businessId,
  onSuccess,
  onCancel,
  freeUpdatesLeft = 0,
}: UpdateFormProps) {
  const [form, setForm] = useState<UpdateFormData>({
    type: initialData?.type ?? "offer",
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    discountType: (initialData?.discountType as UpdateFormData["discountType"]) ?? "percentage",
    discountValue: initialData?.discountValue ?? 10,
    validFrom: initialData?.validFrom
      ? new Date(initialData.validFrom).toISOString().split("T")[0]
      : emptyUpdateForm().validFrom,
    validUntil: initialData?.validUntil
      ? new Date(initialData.validUntil).toISOString().split("T")[0]
      : emptyUpdateForm().validUntil,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initialData?._id;
  const set = (k: keyof UpdateFormData, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return setError("Title is required");
    if (!form.description.trim()) return setError("Description is required");
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<BusinessUpdate> = {
        ...form,
        business: businessId,
        validFrom: form.type === "offer" ? new Date(form.validFrom).toISOString() : undefined,
        validUntil: form.type === "offer" ? new Date(form.validUntil).toISOString() : undefined,
        discountType: form.type === "offer" ? form.discountType : undefined,
        discountValue: form.type === "offer" && form.discountType !== "none" ? Number(form.discountValue) : undefined,
      };
      if (isEdit && initialData?._id) {
        await ApiService.updateBusinessUpdate(initialData._id, payload);
      } else {
        await ApiService.createBusinessUpdate(payload as Partial<BusinessUpdate> & { business: string });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type selector */}
      <div>
        <Label>Type</Label>
        <div className="flex gap-2 mt-1">
          {(["offer", "update", "announcement"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("type", t)}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                form.type === t
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Title *</Label>
        <Input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder={
            form.type === "offer"
              ? "e.g. Weekend Special — Buy 1 Get 1"
              : form.type === "announcement"
              ? "e.g. We're now open on Sundays!"
              : "e.g. New Menu Available"
          }
          className="mt-1 rounded-xl"
        />
      </div>

      <div>
        <Label>Description *</Label>
        <Textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Tell customers more details..."
          rows={3}
          className="mt-1 rounded-xl resize-none"
        />
      </div>

      {form.type === "offer" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Discount Type</Label>
            <select
              value={form.discountType}
              onChange={(e) => set("discountType", e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed (£)</option>
              <option value="none">None</option>
            </select>
          </div>
          {form.discountType !== "none" && (
            <div>
              <Label>{form.discountType === "percentage" ? "Discount %" : "Amount £"}</Label>
              <Input
                type="number"
                min={0}
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
        </div>
      )}

      {!isEdit && freeUpdatesLeft <= 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Free update limit reached. Upgrade to Pro for unlimited updates.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEdit ? "Update" : "Post Update"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── Update card ──────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  offer: {
    bg: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
    label: "Offer",
  },
  announcement: {
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    label: "Announcement",
  },
  update: {
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    label: "Update",
  },
};

function UpdateCard({
  update,
  onEdit,
  onDelete,
}: {
  update: BusinessUpdate;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const style = TYPE_STYLES[update.type] ?? TYPE_STYLES.update;
  const date = new Date(update.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const u = update as unknown as Record<string, unknown>;
  const discountType = u.discountType as string | undefined;
  const discountValue = u.discountValue as number | undefined;
  const discountLabel =
    discountType === "percentage"
      ? `${discountValue}% OFF`
      : discountType === "fixed"
      ? `£${discountValue} OFF`
      : null;
  const validUntil = update.validUntil
    ? new Date(update.validUntil).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-xs font-bold rounded-full px-2.5 py-0.5", style.bg, style.text)}>
            {style.label}
          </span>
          {discountLabel && (
            <span className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold rounded-full px-2.5 py-0.5">
              {discountLabel}
            </span>
          )}
          <span
            className={cn(
              "text-[10px] font-medium rounded-full px-2 py-0.5",
              update.isActive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            {update.isActive ? "Active" : "Ended"}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-foreground text-sm">{update.title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{update.description}</p>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {date}
        </span>
        {validUntil && (
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3" />
            Until {validUntil}
          </span>
        )}
        {typeof update.viewCount === "number" && (
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {update.viewCount} views
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UpdatesPage() {
  const [myBusinessId, setMyBusinessId] = useState<string | null>(null);
  const [updates, setUpdates] = useState<BusinessUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<BusinessUpdate | null>(null);
  const [freeUpdatesLeft, setFreeUpdatesLeft] = useState(25);

  const fetchData = async (id: string) => {
    setLoading(true);
    try {
      const res = await ApiService.getBusinessUpdates(id);
      setUpdates(res.updates ?? []);
    } catch {
      setError("Failed to load updates");
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

    ApiService.getSubscriptionStatus()
      .then((sub) => {
        setFreeUpdatesLeft(sub.freeTrial?.remaining ?? 0);
      })
      .catch(() => { /* silent */ });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this update?")) return;
    await ApiService.deleteBusinessUpdate(id);
    if (myBusinessId) fetchData(myBusinessId);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingUpdate(null);
    if (myBusinessId) fetchData(myBusinessId);
  };

  const activeUpdates = updates.filter((u) => u.isActive);
  const endedUpdates = updates.filter((u) => !u.isActive);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Business Updates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {activeUpdates.length} active · {updates.length} total
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
          <Button size="sm" onClick={() => { setEditingUpdate(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Update
          </Button>
        </div>
      </div>

      {/* Free trial indicator */}
      {freeUpdatesLeft > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 px-4 py-2.5 text-sm text-violet-700 dark:text-violet-400">
          <Megaphone className="w-4 h-4 shrink-0" />
          <span>{freeUpdatesLeft} free updates remaining on your plan</span>
        </div>
      )}

      {/* Form */}
      {(showForm || editingUpdate) && myBusinessId && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-foreground">
              {editingUpdate ? "Edit Update" : "Create Update"}
            </h2>
            <button
              onClick={() => { setShowForm(false); setEditingUpdate(null); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <UpdateForm
            initialData={editingUpdate ?? undefined}
            businessId={myBusinessId}
            freeUpdatesLeft={freeUpdatesLeft}
            onSuccess={handleFormSuccess}
            onCancel={() => { setShowForm(false); setEditingUpdate(null); }}
          />
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4 animate-pulse h-28" />
          ))}
        </div>
      ) : updates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
            <Megaphone className="w-8 h-8 text-violet-500" />
          </div>
          <h2 className="font-display font-bold text-foreground mb-2">No updates yet</h2>
          <p className="text-muted-foreground text-sm max-w-xs mb-5">
            Post offers, announcements and updates to engage your customers.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Post First Update
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeUpdates.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Active ({activeUpdates.length})
              </h2>
              <div className="space-y-3">
                {activeUpdates.map((u) => (
                  <UpdateCard
                    key={u._id}
                    update={u}
                    onEdit={() => { setEditingUpdate(u); setShowForm(false); }}
                    onDelete={() => handleDelete(u._id)}
                  />
                ))}
              </div>
            </div>
          )}
          {endedUpdates.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Ended ({endedUpdates.length})
              </h2>
              <div className="space-y-3">
                {endedUpdates.map((u) => (
                  <UpdateCard
                    key={u._id}
                    update={u}
                    onEdit={() => { setEditingUpdate(u); setShowForm(false); }}
                    onDelete={() => handleDelete(u._id)}
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
