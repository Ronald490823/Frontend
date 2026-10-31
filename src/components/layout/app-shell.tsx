"use client";

import { motion } from "framer-motion";
import { Building2, CalendarClock, LayoutGrid, LogOut, ScanLine, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLogout } from "@/features/auth/hooks";
import { initials } from "@/lib/formatters";
import { canManageMembers, isAreaAdmin, primaryRoleLabel } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { Me } from "@/types/api";
import { Brand } from "./brand";
import { NotificationBell } from "./notification-bell";

type NavItem = { href: string; label: string; icon: typeof LayoutGrid; show: (me: Me) => boolean };

// Navigation only lists screens that exist. Visibility is a convenience; the API enforces access.
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid, show: () => true },
  { href: "/sessions", label: "Sessions", icon: CalendarClock, show: () => true },
  { href: "/attendance", label: "Check in", icon: ScanLine, show: (me) => me.membership?.status === "approved" },
  { href: "/members", label: "Members", icon: Users, show: canManageMembers },
  { href: "/groups", label: "Groups", icon: Building2, show: isAreaAdmin },
  { href: "/settings", label: "Settings", icon: Settings, show: () => true },
];

export function AppShell({ me, children }: { me: Me; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  const items = NAV.filter((n) => n.show(me));
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  // Notifications are only ever generated for approved group members.
  const showBell = me.membership?.status === "approved";

  async function signOut() {
    await logout.mutateAsync().catch(() => undefined);
    toast.success("Signed out");
    router.replace("/login");
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="glass sticky top-0 hidden h-dvh flex-col border-r border-hairline px-4 py-6 lg:flex">
        <Brand href="/dashboard" className="px-3" />
        <nav aria-label="Primary" className="mt-10 flex-1 space-y-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-medium transition-colors",
                  active ? "text-brand-deep" : "text-ink/65 hover:text-ink",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-pill"
                    className="absolute inset-0 rounded-2xl bg-white shadow-soft ring-1 ring-hairline"
                    transition={{ type: "spring", stiffness: 480, damping: 38 }}
                  />
                )}
                <Icon className="relative size-[18px]" aria-hidden />
                <span className="relative">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 rounded-2xl p-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-brand text-sm font-semibold text-white">
            {initials(me.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{me.fullName}</p>
            <p className="truncate text-xs text-muted">{primaryRoleLabel(me)}</p>
          </div>
          {showBell && <NotificationBell placement="top" />}
          <button
            type="button"
            onClick={signOut}
            disabled={logout.isPending}
            aria-label="Sign out"
            className="grid size-9 place-items-center rounded-full text-ink/50 transition hover:bg-ink/5 hover:text-ink"
          >
            <LogOut className="size-4" aria-hidden />
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between border-b border-hairline px-4 lg:hidden">
        <Brand href="/dashboard" />
        <div className="flex items-center gap-1">
          {showBell && <NotificationBell />}
          <button type="button" onClick={signOut} aria-label="Sign out" className="grid size-9 place-items-center rounded-full hover:bg-ink/5">
            <LogOut className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      <div className="min-w-0 pb-28 lg:pb-0">{children}</div>

      {/* Mobile tab bar (iOS style). Kept clear of toasts, which render at the top. */}
      <nav
        aria-label="Primary"
        className="glass fixed inset-x-0 bottom-0 z-30 flex border-t border-hairline px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 lg:hidden"
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn("relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium", active ? "text-brand" : "text-ink/55")}
            >
              {active && <motion.span layoutId="tab-dot" className="absolute -top-1.5 h-0.5 w-8 rounded-full bg-brand" />}
              <Icon className="size-[22px]" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
