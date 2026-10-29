"use client";

import { CalendarClock, ChevronLeft, ChevronRight, MapPin, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { CreateSessionDialog } from "@/components/sessions/create-session-dialog";
import { AttendanceBadge, SessionBadge } from "@/components/sessions/status";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Segmented } from "@/components/ui/segmented";
import { useMe } from "@/features/auth/hooks";
import { useManagedGroups } from "@/features/groups/hooks";
import { useSessions } from "@/features/sessions/hooks";
import { formatSessionWindow } from "@/lib/formatters";
import { isAreaAdmin, isExecutive } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { SessionStatus } from "@/types/api";

type Filter = "all" | SessionStatus;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Live" },
  { value: "scheduled", label: "Upcoming" },
  { value: "closed", label: "Closed" },
];

export default function SessionsPage() {
  const { data: me } = useMe();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const sessions = useSessions({ status: filter === "all" ? undefined : filter, page });

  const areaAdmin = isAreaAdmin(me);
  const managed = useManagedGroups(areaAdmin);
  const manageableGroups = useMemo(() => {
    if (areaAdmin) return managed.data?.filter((g) => g.isActive) ?? [];
    if (isExecutive(me) && me?.membership) return [{ id: me.membership.groupId, name: me.membership.groupName }];
    return [];
  }, [areaAdmin, managed.data, me]);
  const canCreate = manageableGroups.length > 0;
  const totalPages = sessions.data ? Math.max(1, Math.ceil(sessions.data.total / sessions.data.pageSize)) : 1;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="CDS meetings"
        title="Sessions"
        description={canCreate ? "Schedule meetings, run live check-in and review attendance." : "Your group's CDS meetings and your attendance at each."}
        actions={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden /> New session
            </Button>
          )
        }
      />

      <div className="mb-6">
        <Segmented
          label="Filter sessions"
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(1);
          }}
          options={FILTERS}
        />
      </div>

      {sessions.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
      ) : sessions.isError ? (
        <Card>
          <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} retrying={sessions.isFetching} />
        </Card>
      ) : sessions.data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarClock className="size-6" />}
            title={filter === "all" ? "No sessions yet" : "Nothing here"}
            body={canCreate ? "Schedule your group's next CDS meeting to get started." : "Your executives haven't scheduled any sessions yet."}
            action={canCreate && filter === "all" ? <Button onClick={() => setCreating(true)}>Schedule a session</Button> : undefined}
          />
        </Card>
      ) : (
        <>
          <Stagger key={`${filter}-${page}`} className="space-y-3">
            {sessions.data.items.map((s) => (
              <StaggerItem key={s.id}>
                <Link
                  href={`/sessions/${s.id}`}
                  className={cn(
                    "group flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-hairline transition-shadow duration-500 hover:shadow-lift sm:flex-row sm:items-center",
                    s.status === "active" && "ring-2 ring-emerald-500/40",
                  )}
                >
                  <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-surface text-center leading-tight text-brand-deep">
                    <span className="text-[11px] font-medium uppercase">
                      {new Intl.DateTimeFormat("en-NG", { month: "short" }).format(new Date(s.scheduledStart))}
                    </span>
                    <span className="text-xl font-semibold">
                      {new Intl.DateTimeFormat("en-NG", { day: "numeric" }).format(new Date(s.scheduledStart))}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-semibold tracking-tight">{s.title}</h2>
                      <SessionBadge status={s.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted">{formatSessionWindow(s.scheduledStart, s.scheduledEnd)}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
                      {s.venue && (
                        <>
                          <MapPin className="size-3.5" aria-hidden /> {s.venue} ·{" "}
                        </>
                      )}
                      {s.groupName}
                    </p>
                  </div>
                  {s.myStatus ? (
                    <AttendanceBadge status={s.myStatus} />
                  ) : s.status === "active" && !s.canManage ? (
                    <span className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white">Check in</span>
                  ) : null}
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
          {totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-6 flex items-center justify-between">
              <Button size="sm" variant="ghost" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                <ChevronLeft className="size-4" aria-hidden /> Newer
              </Button>
              <span className="text-sm text-muted">
                Page {page} of {totalPages}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                Older <ChevronRight className="size-4" aria-hidden />
              </Button>
            </nav>
          )}
        </>
      )}

      {canCreate && <CreateSessionDialog open={creating} onClose={() => setCreating(false)} groups={manageableGroups} />}
    </PageContainer>
  );
}
