"use client";

/**
 * GuestGateModal
 * Shown to guest users when they try to use a feature that requires an account
 * (write review, claim coupon, add to favorites, etc.)
 * Mirrors the mobile app's guest-check pattern from BusinessDetailScreen.js
 */

import { X, UserPlus, LogIn, Sparkles } from "lucide-react";
import Link from "next/link";

interface GuestGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional action description, e.g. "write a review" */
  action?: string;
}

export function GuestGateModal({ isOpen, onClose, action = "use this feature" }: GuestGateModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-card rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "scale-in 0.2s ease-out" }}
      >
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-violet-600 to-purple-800 p-6 pb-10">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Sign up to continue</h2>
          <p className="text-white/80 text-sm leading-relaxed">
            Create a free account to {action} and unlock all HashView features.
          </p>
        </div>

        {/* Body */}
        <div className="-mt-5 bg-card rounded-t-3xl pt-6 px-6 pb-6">
          <p className="text-sm text-muted-foreground text-center mb-5">
            Join thousands of users already on HashView
          </p>
          <div className="space-y-3">
            <Link
              href="/register"
              onClick={onClose}
              className="flex items-center gap-3 p-4 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-white">Create Free Account</p>
                <p className="text-xs text-white/70">Takes less than a minute</p>
              </div>
            </Link>

            <Link
              href="/login"
              onClick={onClose}
              className="flex items-center gap-3 p-4 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <LogIn className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="font-bold text-foreground">Already have an account?</p>
                <p className="text-xs text-muted-foreground">Sign in to continue</p>
              </div>
            </Link>
          </div>
          <button
            onClick={onClose}
            className="w-full mt-4 py-3 rounded-2xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
