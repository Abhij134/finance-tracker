"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calculator } from "lucide-react";
import { createPortal } from "react-dom";
import { UserDropdown } from "@/components/user-dropdown";
import { ExportDropdown } from "@/components/export-dropdown";

const CalculatorModal = dynamic(
  () => import("@/app/(auth)/login/_calculator_modal"),
  { ssr: false }
);

export function Navbar({ userName, userEmail, userBirthdate, userImage }: { userName?: string; userEmail?: string; userBirthdate?: string; userImage?: string; }) {
  const router = useRouter();
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleSignOut = async () => {
    const { handleSignOut: signOutAction } = await import("@/app/actions/auth");
    await signOutAction();
    router.push("/login");
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-5">
          <Link
            href="/dashboard"
            onClick={handleLogoClick}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer"
          >
            <Image
              src="/logo.svg"
              alt="FinanceNeo"
              width={36}
              height={36}
              className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg object-contain"
              priority
            />
            <span className="text-xs sm:text-lg font-bold tracking-tight text-white">
              Finance<span className="text-[#4ecca3]">Neo</span>
            </span>
          </Link>

          {/* Right side: Calculator + Export + Settings dropdown + AI button space */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setIsCalcOpen(true)}
              className="flex items-center gap-1 p-1.5 sm:p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-white/10 hover:border-white/20"
              title="Financial Calculators"
            >
              <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            <div className="h-4 w-px bg-white/10" />
            <ExportDropdown />
            <div className="h-4 w-px bg-white/10" />
            <UserDropdown
              userName={userName || "Abhijeet Gautam"}
              userHandle={userName ? userName.split(" ")[0] + "Neo" : "AbhijNeo"}
              userEmail={userEmail || "user@financneo.com"}
              userBirthdate={userBirthdate}
              userImage={userImage}
              onSignOut={handleSignOut}
            />
            {/* AI Chat button is at fixed top-3 right-3 from FloatingAiChat — leave gap */}
            <div className="w-6 sm:w-28" />
          </div>
        </div>
      </header>

      {/* Calculator modal rendered via portal at body level so fixed positioning works */}
      {mounted && isCalcOpen && createPortal(
        <CalculatorModal isOpen={isCalcOpen} onClose={() => setIsCalcOpen(false)} />,
        document.body
      )}
    </>
  );
}