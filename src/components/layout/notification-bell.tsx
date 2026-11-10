"use client";

import { Bell, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMarkNotificationsRead, useNotifications, useUnreadCount } from "@/features/notifications/hooks";
import { formatRelative } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types/api";

export function NotificationBell({ className, placement = "bottom" }: { className?: string; placement?: "top" | "bottom" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const unread = useUnreadCount();
  const list = useNotifications(open);
  const markRead = useMarkNotificationsRead();
  const count = unread.data ?? 0;

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Opening the panel clears the badge (everything is marked read server-side).
  useEffect(() => {
    if (open && count > 0 && !markRead.isPending) markRead.mutate();
    // Only react to the panel opening, not to count/mutation changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function openItem(n: AppNotification) {
    setOpen(false);
    if (n.entityType === "session" && n.entityId) router.push(`/sessions/${n.entityId}`);
  }

  const items = list.data?.items ?? [];

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
        aria-expanded={open}
        className="relative grid size-9 place-items-center rounded-full text-ink/55 transition hover:bg-ink/5 hover:text-ink"
      >
        <Bell className="size-[18px]" aria-hidden />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-[1.1rem] place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-4 text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        // Lined up with the page, not the bell: on phones it spans the content gutters under the
        // top bar; on desktop it opens beside the sidebar, bottom-aligned with the account row.
        // (Both chrome bars use backdrop-filter, which makes them the containing block for `fixed`;
        // they sit at the viewport's top/left edge, so these offsets land the same either way.)
        <div
          role="dialog"
          aria-label="Notifications"
          className={cn(
            "fixed z-40 overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-hairline",
            placement === "top"
              ? "bottom-6 left-[calc(17rem+1.5rem)] w-96"
              : "inset-x-5 top-16 sm:left-auto sm:right-8 sm:w-96",
          )}
        >
          <div className="flex items-center justify-between border-b border-hairline py-2 pl-4 pr-2">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              className="grid size-8 place-items-center rounded-full text-ink/50 transition hover:bg-ink/5 hover:text-ink"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div
            className={cn(
              "overflow-y-auto overscroll-contain",
              // Phones: stop short of the bottom tab bar.
              placement === "top" ? "max-h-[min(28rem,calc(100dvh-8rem))]" : "max-h-[calc(100dvh-13rem)]",
            )}
          >
            {list.isPending ? (
              <p className="px-4 py-8 text-center text-sm text-muted">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">You&apos;re all caught up.</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openItem(n)}
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-4 py-3 text-left transition hover:bg-ink/[0.03]",
                        !n.readAt && "bg-brand/[0.04]",
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {!n.readAt && <span className="size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />}
                        {n.title}
                      </span>
                      {n.body && <span className="text-[13px] text-muted">{n.body}</span>}
                      <span className="text-[11px] text-muted">{formatRelative(n.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
