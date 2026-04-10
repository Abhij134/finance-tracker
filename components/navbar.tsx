"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserDropdown } from "@/components/user-dropdown";
import { ExportDropdown } from "@/components/export-dropdown";

export function Navbar({ userName, userEmail, userBirthdate, userImage }: { userName?: string; userEmail?: string; userBirthdate?: string; userImage?: string; }) {
  const router = useRouter();

  const handleSignOut = async () => {
    const { handleSignOut: signOutAction } = await import("@/app/actions/auth");
    await signOutAction();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2 sm:px-5">
        <Link href="/login" className="flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt="FinanceNeo"
            width={36}
            height={36}
            className="rounded-lg object-contain"
            priority
          />
          <span className="text-lg font-bold tracking-tight text-white">
            Finance<span className="text-[#4ecca3]">Neo</span>
          </span>
        </Link>

        {/* Right side: Settings dropdown + AI button (AI button rendered by layout) */}
        <div className="flex items-center gap-1 sm:gap-2">
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
          {/* AI Chat button is at fixed top-3 right-4 from FloatingAiChat — leave gap */}
          <div className="w-14 sm:w-36" /> {/* reduced spacer for mobile to avoid crowding */}
        </div>
      </div>
    </header>
  );
}