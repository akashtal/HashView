import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In — HashView",
  description: "Sign in or create your HashView account to discover verified local businesses.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
