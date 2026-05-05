"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to an error reporting service in production
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-2xl font-display font-bold text-foreground mb-2">
          Something went wrong
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-sm mx-auto">
          We hit an unexpected error. Don&apos;t worry — your data is safe. Try
          refreshing, or head back to the home screen.
        </p>

        {/* Error detail (dev only feel) */}
        {error.message && (
          <div className="mb-6 p-3 rounded-xl bg-muted text-left">
            <p className="text-xs font-mono text-muted-foreground break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/explore"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-border text-foreground font-semibold text-sm hover:bg-muted transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Explore
          </Link>
        </div>
      </div>
    </div>
  );
}
