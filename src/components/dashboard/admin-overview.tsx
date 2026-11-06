"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CalendarRange,
  ChevronRight,
  Map as MapIcon,
  Percent,
  Radio,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { SessionBadge } from "@/components/sessions/status";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Segmented } from "@/components/ui/segmented";
import { type GroupStats, useGroupStats, useRecentSessions } from "@/features/dashboard/hooks";
import { useAreas, useManagedGroups } from "@/features/groups/hooks";
import { formatRelative, formatSessionWindow } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { CdsSession } from "@/types/api";

/** Attendance health bands. Always shown with the number and a word, never colour alone. */
export function rateBand(rate: number | null) {
  if (rate === null) return { label: "No data yet", bar: "bg-ink/20", text: "text-muted" };
  if (rate >= 75) return { label: "Healthy", bar: "bg-emerald-600", text: "text-emerald-700" };
  if (rate >= 50) return { label: "Watch", bar: "bg-amber-500", text: "text-amber-700" };
  return { label: "Low", bar: "bg-rose-600", text: "text-rose-700" };
}

export function RateMeter({ rate, className }: { rate: number | null; className?: string }) {
  const band = rateBand(rate);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-ink/[0.06]" aria-hidden>
        <motion.div
          className={cn("h-full rounded-full", band.bar)}
          initial={{ width: 0 }}
          animate={{ width: `${rate ?? 0}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 24 }}
        />
      </div>
      <span className={cn("w-10 shrink-0 text-right text-sm font-semibold tabular-nums", band.text)}>
        {rate === null ? "—" : `${rate}%`}
      </span>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  href,
  loading,
  attention,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string | null;
  sub?: string;
  href?: string;
  loading?: boolean;
  attention?: boolean;
}) {
  const body = (
    <div
      className={cn(
        "h-full rounded-3xl bg-white p-5 shadow-soft ring-1 ring-hairline transition-shadow",
        href && "hover:shadow-lift",
        attention && "ring-amber-500/40",
      )}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-muted">
        <span className="grid size-8 place-items-center rounded-xl bg-surface text-brand">{icon}</span>
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-4 h-9 w-20" />
      ) : (
        <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
          {typeof value === "number" ? <AnimatedNumber value={value} /> : (value ?? "—")}
        </p>
      )}
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full rounded-3xl">
      {body}
    </Link>
  ) : (
    body
  );
}

type SortKey = "name" | "rate" | "pending";

/** Area-wide overview for LGIs and super admins. */
export function AdminOverview({ superAdmin }: { superAdmin: boolean }) {
  const groups = useManagedGroups();
  const areas = useAreas(superAdmin);
  const stats = useGroupStats(groups.data);
  const sessions = useRecentSessions();
  const [sort, setSort] = useState<SortKey>("name");

  const totals = useMemo(() => {
    const ready = stats.filter((s) => !s.loading);
    const attended = ready.reduce((n, s) => n + s.attended, 0);
    const marked = ready.reduce((n, s) => n + s.attended + s.absent + s.excused, 0);
    return {
      loading: stats.some((s) => s.loading),
      members: ready.reduce((n, s) => n + (s.approved ?? 0), 0),
      pending: ready.reduce((n, s) => n + (s.pending ?? 0), 0),
      atRisk: ready.reduce((n, s) => n + s.atRisk, 0),
      rate: marked ? Math.round((attended / marked) * 100) : null,
    };
  }, [stats]);

  const sessionStats = useMemo(() => {
    const items = sessions.data?.items ?? [];
    const now = new Date();
    const thisMonth = items.filter((s) => {
      const d = new Date(s.scheduledStart);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    return {
      live: items.filter((s) => s.status === "active"),
      held: thisMonth.filter((s) => s.status === "closed" || s.status === "archived" || s.status === "active").length,
      upcoming: items
        .filter((s) => s.status === "scheduled")
        .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart)),
      recent: items.filter((s) => s.status === "closed" || s.status === "archived").slice(0, 5),
      cancelled: thisMonth.filter((s) => s.status === "cancelled").length,
    };
  }, [sessions.data]);

  const sorted = useMemo(() => {
    const list = [...stats];
    if (sort === "rate") list.sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101));
    else if (sort === "pending") list.sort((a, b) => (b.pending ?? 0) - (a.pending ?? 0));
    else list.sort((a, b) => a.group.name.localeCompare(b.group.name));
    return list;
  }, [stats, sort]);

  const liveByGroup = new Set(sessionStats.live.map((s) => s.groupId));
  const activeGroups = groups.data?.filter((g) => g.isActive).length ?? 0;

  return (
    <section aria-labelledby="admin-overview" className="mb-10 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 id="admin-overview" className="text-lg font-semibold tracking-tight">
            Jurisdiction overview
          </h2>
          <p className="text-sm text-muted">This month across every CDS group you oversee.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi
          icon={<Building2 className="size-4" />}
          label="Groups"
          value={groups.data ? activeGroups : null}
          sub={groups.data ? `${groups.data.length} total · ${groups.data.length - activeGroups} inactive` : undefined}
          href="/groups"
          loading={groups.isPending}
        />
        {superAdmin && (
          <Kpi
            icon={<MapIcon className="size-4" />}
            label="Areas"
            value={areas.data ? areas.data.filter((a) => a.isActive).length : null}
            sub={areas.data ? `${areas.data.length} total` : undefined}
            loading={areas.isPending}
          />
        )}
        <Kpi
          icon={<Users className="size-4" />}
          label="Members"
          value={totals.members}
          sub="approved corps members"
          loading={groups.isPending || totals.loading}
        />
        <Kpi
          icon={<ShieldCheck className="size-4" />}
          label="Pending"
          value={totals.pending}
          sub="awaiting approval"
          href="/members"
          loading={groups.isPending || totals.loading}
          attention={totals.pending > 0}
        />
        <Kpi
          icon={<Radio className="size-4" />}
          label="Live now"
          value={sessions.data ? sessionStats.live.length : null}
          sub={sessions.data ? `${sessionStats.held} held this month` : undefined}
          href="/sessions"
          loading={sessions.isPending}
        />
        <Kpi
          icon={<Percent className="size-4" />}
          label="Attendance"
          value={totals.rate === null ? "—" : `${totals.rate}%`}
          sub={totals.rate === null ? "nothing marked yet" : `${rateBand(totals.rate).label} · this month`}
          loading={groups.isPending || totals.loading}
        />
        {!superAdmin && (
          <Kpi
            icon={<AlertTriangle className="size-4" />}
            label="At risk"
            value={totals.atRisk}
            sub="missed 2+ meetings"
            loading={groups.isPending || totals.loading}
            attention={totals.atRisk > 0}
          />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <GroupTable
          stats={sorted}
          liveByGroup={liveByGroup}
          sort={sort}
          onSort={setSort}
          loading={groups.isPending}
          error={groups.isError ? groups.error : null}
          onRetry={() => void groups.refetch()}
        />
        <div className="space-y-6">
          <SessionList
            title="Live now"
            icon={<Radio className="size-4" />}
            sessions={sessionStats.live}
            loading={sessions.isPending}
            empty="No session is taking attendance."
          />
          <SessionList
            title="Coming up"
            icon={<CalendarClock className="size-4" />}
            sessions={sessionStats.upcoming.slice(0, 5)}
            loading={sessions.isPending}
            empty="Nothing scheduled."
            relative
          />
          <SessionList
            title="Recently held"
            icon={<CalendarRange className="size-4" />}
            sessions={sessionStats.recent}
            loading={sessions.isPending}
            empty="No sessions held yet."
          />
        </div>
      </div>
    </section>
  );
}

function GroupTable({
  stats,
  liveByGroup,
  sort,
  onSort,
  loading,
  error,
  onRetry,
}: {
  stats: GroupStats[];
  liveByGroup: Set<string>;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-col gap-3 border-b border-hairline p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium">Groups at a glance</p>
        <div className="-mx-1 overflow-x-auto px-1">
          <Segmented
            label="Sort groups"
            value={sort}
            onChange={onSort}
            options={[
              { value: "name", label: "A–Z" },
              { value: "rate", label: "Lowest turnout" },
              { value: "pending", label: "Most pending" },
            ]}
          />
        </div>
      </div>
      {error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : loading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : stats.length === 0 ? (
        <EmptyState icon={<Building2 className="size-6" />} title="No groups yet" body="Create a CDS group from the Groups page." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th scope="col" className="px-4 py-2.5 font-medium">Group</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Members</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Pending</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Held</th>
                <th scope="col" className="w-44 px-4 py-2.5 font-medium">Attendance this month</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {stats.map((s) => (
                <tr key={s.group.id} className={cn(!s.group.isActive && "opacity-60")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{s.group.name}</span>
                      {liveByGroup.has(s.group.id) && <SessionBadge status="active" />}
                      {!s.group.isActive && <Badge>Inactive</Badge>}
                    </div>
                    <p className="text-xs text-muted">
                      {s.group.code}
                      {s.atRisk > 0 && (
                        <span className="ml-2 text-amber-700">
                          · {s.atRisk} missed 2+
                        </span>
                      )}
                    </p>
                  </td>
                  {s.loading ? (
                    <td colSpan={4} className="px-4 py-3">
                      <Skeleton className="h-4" />
                    </td>
                  ) : s.error ? (
                    <td colSpan={4} className="px-4 py-3 text-xs text-muted">
                      Couldn&apos;t load this group&apos;s numbers.
                    </td>
                  ) : (
                    <>
                      <td className="px-3 py-3 text-right tabular-nums">{s.approved ?? "—"}</td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {s.pending ? (
                          <span className="font-semibold text-amber-700">{s.pending}</span>
                        ) : (
                          <span className="text-muted">0</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{s.sessionsThisMonth ?? "—"}</td>
                      <td className="px-4 py-3">
                        <RateMeter rate={s.rate} />
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-hairline px-4 py-3 text-xs text-muted">
        Attendance = meetings attended out of meetings marked this month. 75%+ healthy · 50–74% watch · under 50% low.
      </p>
    </Card>
  );
}

function SessionList({
  title,
  icon,
  sessions,
  loading,
  empty,
  relative,
}: {
  title: string;
  icon: React.ReactNode;
  sessions: CdsSession[];
  loading: boolean;
  empty: string;
  relative?: boolean;
}) {
  return (
    <Card className="p-0">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3 text-sm font-medium">
        <span className="text-brand">{icon}</span> {title}
        {!loading && sessions.length > 0 && <span className="ml-auto text-xs text-muted">{sessions.length}</span>}
      </div>
      {loading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-hairline">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link href={`/sessions/${s.id}`} className="group flex items-center gap-3 px-4 py-3 hover:bg-canvas">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.title}</p>
                  <p className="truncate text-xs text-muted">
                    {s.groupName} · {relative ? formatRelative(s.scheduledStart) : formatSessionWindow(s.scheduledStart, s.scheduledEnd)}
                  </p>
                </div>
                <SessionBadge status={s.status} />
                <ChevronRight className="size-4 shrink-0 text-ink/30 group-hover:text-brand" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
