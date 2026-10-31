"use client";

import { Bell } from "lucide-react";
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
        <div
          className={cn(
            "absolute right-0 z-40 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-hairline",
            placement === "top" ? "bottom-full mb-2" : "mt-2",
          )}
        >
          <div className="border-b border-hairline px-4 py-3 text-sm font-semibold">Notifications</div>
          <div className="max-h-96 overflow-y-auto">
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
