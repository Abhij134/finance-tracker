"use client";

import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    return (
        <div className="w-full h-full">
            {children}
        </div>
    );
}
