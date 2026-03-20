"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, Clock, Mail } from "lucide-react";

const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Charts", href: "/dashboard/budget", icon: BarChart3 },
    { name: "Transactions", href: "/transactions", icon: Clock },
    { name: "Alerts", href: "/alerts", icon: Mail },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-[#0B0F19]/95 backdrop-blur-xl border-t border-border h-14 lg:hidden">
            {navItems.map((item) => {
                const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors"
                    >
                        <item.icon
                            className={`h-5 w-5 ${isActive ? "text-emerald-400" : "text-zinc-600"}`}
                        />
                        <span
                            className={`text-[10px] font-medium ${isActive ? "text-emerald-400" : "text-zinc-600"}`}
                        >
                            {item.name}
                        </span>
                        {isActive && (
                            <span className="h-[3px] w-[3px] rounded-full bg-emerald-400 mt-0.5" />
                        )}
                    </Link>
                );
            })}
        </nav>
    );
}
