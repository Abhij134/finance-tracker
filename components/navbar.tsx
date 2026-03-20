"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserDropdown } from "@/components/user-dropdown";
import { ExportDropdown } from "@/components/export-dropdown";
import { Wallet } from "lucide-react";

export function Navbar({ userName }: { userName?: string }) {
  const router = useRouter();

  const handleSignOut = async () => {
    if (window.confirm("Sign out of FinanceNeo?")) {
      const { handleSignOut: signOutAction } = await import("@/app/actions/auth");
      await signOutAction();
      router.push("/login");
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-5">
        <Link href="/login" className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 shrink-0 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
            <Wallet className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            Finance<span className="text-emerald-400">Neo</span>
          </span>
        </Link>

        {/* Right side: Settings dropdown + AI button (AI button rendered by layout) */}
        <div className="flex items-center gap-1 sm:gap-2">
          <ExportDropdown />
          <div className="h-4 w-px bg-white/10" />
          <UserDropdown
            userName={userName || "Abhijeet Gautam"}
            userHandle={userName ? userName.split(" ")[0] + "Neo" : "AbhijNeo"}
            onSignOut={handleSignOut}
          />
          {/* AI Chat button is at fixed top-3 right-4 from FloatingAiChat — leave gap */}
          <div className="w-32 sm:w-36" /> {/* spacer for the fixed AI button */}
        </div>
      </div>
    </header>
  );
}