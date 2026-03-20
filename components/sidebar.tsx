"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Clock,
  Mail,
  User,
  ChevronLeft,
  ChevronRight,
  Home,
  LogOut,
  Settings,
  BarChart3,
} from "lucide-react";
import { handleSignOut } from "@/app/actions/auth";

const mainNavItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Financial Reports", href: "/dashboard/budget", icon: BarChart3 },
  { name: "Transactions", href: "/transactions", icon: Clock },
  { name: "Alerts", href: "/alerts", icon: Mail },
];

function NavLink({ item, isOpen, pathname }: { item: { name: string; href: string; icon: React.ElementType }, isOpen: boolean, pathname: string }) {
  const isActive = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      key={item.name}
      className={`flex items-center p-2 rounded-lg transition-colors ${isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
    >
      <item.icon className="h-6 w-6 flex-shrink-0" />
      <span
        className={`ml-4 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${isOpen ? "w-28 opacity-100" : "w-0 opacity-0"
          }`}
      >
        {item.name}
      </span>
    </Link>
  );
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className={`relative flex h-screen flex-col bg-card border-r border-border transition-all duration-300 ease-in-out ${isOpen ? "w-64" : "w-16"
        }`}
    >
      <div className={`flex items-center justify-center p-4 border-b border-border h-14`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg bg-background hover:bg-muted transition-colors"
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-2">
        {mainNavItems.map((item) => (
          <NavLink key={item.name} item={item} isOpen={isOpen} pathname={pathname} />
        ))}
      </nav>
    </div>
  );
}