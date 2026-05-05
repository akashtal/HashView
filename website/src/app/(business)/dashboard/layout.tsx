"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/app/DashboardSidebar";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";

// NOTE: Metadata export must be in a Server Component; title is set per page.

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <div className="hidden lg:flex h-screen sticky top-0 shrink-0">
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      {/* ── Mobile sidebar overlay ───────────────────────────────── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          {/* Drawer */}
          <div
            className="absolute left-0 top-0 bottom-0 z-10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <DashboardSidebar collapsed={false} />
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center h-14 px-4 bg-card/90 backdrop-blur-xl border-b border-border gap-3">
          <button
            onClick={() => setMobileSidebarOpen((v) => !v)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            aria-label="Toggle sidebar"
          >
            {mobileSidebarOpen ? (
              <X className="w-4.5 h-4.5 text-foreground" />
            ) : (
              <Menu className="w-4.5 h-4.5 text-foreground" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center">
              <span className="text-white font-black text-xs">#</span>
            </div>
            <span className="font-display font-bold text-sm text-foreground">Business Dashboard</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
