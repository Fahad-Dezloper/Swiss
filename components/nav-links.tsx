"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Inbox, BookUser } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/payroll", label: "Payroll", icon: Users },
  { href: "/received", label: "Received", icon: Inbox },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all duration-250 ${
              isActive
                ? "text-neutral-950 bg-neutral-100 font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 font-medium"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
