import type { Metadata } from "next";
import { AppNavbar } from "@/components/app/AppNavbar";

export const metadata: Metadata = {
  title: "HashView — Discover Local Businesses",
  description: "Explore and discover verified local businesses near you on HashView.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      {/* Top padding for desktop navbar, bottom padding for mobile tab bar */}
      <main className="md:pt-16 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
