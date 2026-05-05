"use client";

import { useState } from "react";
import { HelpCircle, MessageSquare, Phone, Mail, ChevronDown, ChevronUp, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import ApiService from "@/lib/api";

const FAQ = [
  { q: "How do I leave a review?", a: "Reviews can only be submitted in-person via the HashView mobile app. Download the app, visit a business, scan their QR code and submit your verified review." },
  { q: "How does coupon redemption work?", a: "To redeem coupons, download the HashView app, earn coupons by reviewing businesses, and present the coupon QR code at checkout." },
  { q: "How do I claim my business listing?", a: "Go to the business detail page and tap 'Claim this Business'. Fill out the claim form and our team will verify your ownership within 2-3 business days." },
  { q: "How are reviews verified?", a: "All HashView reviews are in-person verified. Customers must be physically present at the business and scan the QR code to submit a review, ensuring authenticity." },
  { q: "Can I edit or delete my review?", a: "You can edit your review within 7 days of submission via the mobile app. Reviews cannot be deleted to maintain trust and authenticity." },
  { q: "What is the Pro subscription?", a: "HashView Pro for Business Owners gives you advanced analytics, unlimited updates/offers, priority support, and enhanced visibility in search results." },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ subject: "", message: "", email: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim() || !form.email.trim()) return;
    setStatus("loading");
    setError("");
    try {
      await ApiService.submitContactForm({
        name: "HashView User",
        email: form.email,
        subject: form.subject,
        message: form.message,
      });
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-900 via-purple-900 to-violet-800 pt-6 pb-8 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto relative px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-white">Help & Support</h1>
              <p className="text-white/70 text-sm">We&apos;re here to help</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Quick contact */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href="mailto:support@hashview.co.uk"
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Email Us</span>
            <span className="text-[11px] text-muted-foreground">support@hashview.co.uk</span>
          </a>
          <a
            href="tel:+441234567890"
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-center"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Call Us</span>
            <span className="text-[11px] text-muted-foreground">Mon–Fri, 9am–5pm</span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* FAQ */}
        <div>
          <h2 className="font-display font-bold text-foreground text-lg mb-3">
            Frequently Asked Questions
          </h2>
          <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
            {FAQ.map((item, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left hover:bg-muted/40 transition-colors"
                >
                  <span className="font-semibold text-foreground text-sm">{item.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 animate-fade-in">
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact form */}
        <div>
          <h2 className="font-display font-bold text-foreground text-lg mb-3">
            <MessageSquare className="w-5 h-5 inline mr-2 text-primary" />
            Send a Message
          </h2>

          {status === "success" ? (
            <div className="flex flex-col items-center justify-center py-10 text-center rounded-2xl border border-border bg-card animate-scale-in">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-2">Message Sent!</h3>
              <p className="text-muted-foreground text-sm">We&apos;ll get back to you within 24 hours.</p>
              <Button variant="ghost" className="mt-4" onClick={() => { setStatus("idle"); setForm({ subject: "", message: "", email: "" }); }}>
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-4 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="help-email">Your Email</Label>
                <Input
                  id="help-email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="help-subject">Subject</Label>
                <Input
                  id="help-subject"
                  placeholder="What do you need help with?"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="help-message">Message</Label>
                <textarea
                  id="help-message"
                  placeholder="Describe your issue in detail..."
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  required
                  rows={5}
                  className={cn(
                    "w-full px-3 py-2 rounded-xl border border-input bg-background text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
                    "resize-none placeholder:text-muted-foreground"
                  )}
                />
              </div>
              <Button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white hover:from-violet-700 hover:to-purple-800"
              >
                {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Message"}
              </Button>
            </form>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
