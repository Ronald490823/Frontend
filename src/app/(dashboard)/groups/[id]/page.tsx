"use client";

import { ArrowLeft, Building2, CalendarClock, ChevronRight, Crown, Users } from "lucide-react";
import Link from "next/link";
import { use, useMemo } from "react";
import { MonthlyBoxes, MonthlyLegend, formatMonth } from "@/components/attendance/monthly-boxes";
import { ActivityTable } from "@/components/audit/activity-table";
import { RateMeter, rateBand } from "@/components/dashboard/admin-overview";
import { PageContainer } from "@/components/layout/page-header";
import { SessionBadge } from "@/components/sessions/status";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { FullPageLoader } from "@/components/ui/loader";
import { useGroupMonthlyAttendance } from "@/features/attendance/hooks";
import { useGroupStats } from "@/features/dashboard/hooks";
import { useGroup } from "@/features/groups/hooks";
import { useGroupMemberships } from "@/features/memberships/hooks";
import { useSessions } from "@/features/sessions/hooks";
import { formatDate, formatSessionWindow, initials } from "@/lib/formatters";
import type { Group, MonthlyMark } from "@/types/api";

export default function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const group = useGroup(id);
  if (group.isPending) return <FullPageLoader label="Loading group…" />;
  if (!group.data) {
    return (
      <PageContainer>
        <BackLink />
        <Card>
          <ErrorState error={group.error} onRetry={() => group.refetch()} retrying={group.isFetching} />
        </Card>
      </PageContainer>
    );
  }
  return <GroupDetail group={group.data} />;
}

function BackLink() {
  return (
    <Link href="/groups" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden /> Groups
    </Link>
  );
}

function GroupDetail({ group: g }: { group: Group }) {
  const groups = useMemo(() => [g], [g]);
  const [stats] = useGroupStats(groups);

  return (
    <PageContainer>
      <BackLink />
      <header className="mb-8 flex items-start gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-surface text-brand">
          <Building2 className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{g.name}</h1>
            <Badge tone={g.isActive ? "success" : "neutral"}>{g.isActive ? "Active" : "Inactive"}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {g.code} · Created {formatDate(g.createdAt)}
          </p>
          {g.description && <p className="mt-2 max-w-2xl text-sm text-ink/70">{g.description}</p>}
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Members" value={stats?.approved} loading={stats?.loading} />
        <Tile label="Awaiting approval" value={stats?.pending} loading={stats?.loading} attention={!!stats?.pending} />
        <Tile label="Meeting days this month" value={stats?.sessionsThisMonth} loading={stats?.loading} />
        <div className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-hairline">
          <p className="text-xs font-medium text-muted">Attendance this month</p>
          {stats?.loading ? (
            <Skeleton className="mt-2 h-6" />
          ) : (
            <>
              <RateMeter rate={stats?.rate ?? null} className="mt-2" />
              <p className="mt-1 text-xs text-muted">
                {rateBand(stats?.rate ?? null).label}
                {stats && stats.atRisk > 0 && <span className="text-amber-700"> · {stats.atRisk} missed 2+</span>}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <MemberList groupId={g.id} />
          <ActivityTable title="Executive activity" groupId={g.id} />
        </div>
        <RecentSessions groupId={g.id} />
      </div>
    </PageContainer>
  );
}

function Tile({ label, value, loading, attention }: { label: string; value: number | null | undefined; loading?: boolean; attention?: boolean }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-soft ring-1 ${attention ? "ring-amber-500/40" : "ring-hairline"}`}>
      <p className="text-xs font-medium text-muted">{label}</p>
      {loading ? <Skeleton className="mt-2 h-8 w-12" /> : <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value ?? "—"}</p>}
    </div>
  );
}

function MemberList({ groupId }: { groupId: string }) {
  const members = useGroupMemberships({ groupId, status: "approved", page: 1 });
  const monthly = useGroupMonthlyAttendance(groupId);
  const marks = useMemo(
    () => new Map<string, MonthlyMark[]>(monthly.data?.members.map((m) => [m.userId, m.marks])),
    [monthly.data],
  );
  const items = members.data?.items ?? [];
  // Executives first, then everyone else A–Z.
  const sorted = [...items].sort((a, b) =>
    a.role === b.role ? a.fullName.localeCompare(b.fullName) : a.role === "executive" ? -1 : 1,
  );

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-4 py-3 text-sm font-medium">
        <Users className="size-4 text-brand" aria-hidden /> Members
        {monthly.data && <span className="text-xs font-normal text-muted">· {formatMonth(monthly.data.month)}</span>}
        <Link href="/members" className="ml-auto text-xs font-medium text-brand hover:text-brand-deep">
          Manage
        </Link>
      </div>
      {members.isPending ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : members.isError ? (
        <ErrorState error={members.error} onRetry={() => members.refetch()} />
      ) : sorted.length === 0 ? (
        <EmptyState icon={<Users className="size-6" />} title="No approved members yet" />
      ) : (
        <>
          <ul className="divide-y divide-hairline">
            {sorted.map((m) => (
              <li key={m.id}>
                <Link href={`/members/${m.userId}`} className="group flex flex-col gap-2 px-4 py-3 hover:bg-canvas sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold text-brand-deep">
                      {initials(m.fullName)}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                        <span className="truncate group-hover:text-brand-deep">{m.fullName}</span>
                        {m.role === "executive" && <Crown className="size-3.5 shrink-0 text-amber-600" aria-label="Executive" />}
                      </p>
                      <p className="truncate text-xs text-muted">{m.stateCode}</p>
                    </div>
                  </div>
                  {monthly.data && (
                    <MonthlyBoxes
                      required={monthly.data.required}
                      sessions={monthly.data.sessions}
                      marks={marks.get(m.userId) ?? []}
                      size="sm"
                      className="pl-12 sm:pl-0"
                    />
                  )}
                  <ChevronRight className="hidden size-4 shrink-0 text-ink/25 group-hover:text-brand sm:block" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-hairline px-4 py-3">
            <MonthlyLegend />
            {members.data && members.data.total > items.length && (
              <p className="mt-2 text-xs text-muted">
                Showing {items.length} of {members.data.total}.{" "}
                <Link href="/members" className="font-medium text-brand">
                  See everyone
                </Link>
              </p>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

function RecentSessions({ groupId }: { groupId: string }) {
  const sessions = useSessions({ groupId });
  const items = sessions.data?.items ?? [];
  return (
    <Card className="self-start overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3 text-sm font-medium">
        <CalendarClock className="size-4 text-brand" aria-hidden /> Sessions
        {sessions.data && <span className="ml-auto text-xs text-muted">{sessions.data.total}</span>}
      </div>
      {sessions.isPending ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : items.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted">No sessions yet.</p>
      ) : (
        <ul className="divide-y divide-hairline">
          {items.map((s) => (
            <li key={s.id}>
              <Link href={`/sessions/${s.id}`} className="group flex items-center gap-3 px-4 py-3 hover:bg-canvas">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.title}</p>
                  <p className="truncate text-xs text-muted">{formatSessionWindow(s.scheduledStart, s.scheduledEnd)}</p>
                  {(s.startedByName || s.closedByName) && (
                    <p className="truncate text-xs text-muted">
                      {s.startedByName && `Started by ${s.startedByName}`}
                      {s.startedByName && s.closedByName && " · "}
                      {s.closedByName && `Ended by ${s.closedByName}`}
                    </p>
                  )}
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
