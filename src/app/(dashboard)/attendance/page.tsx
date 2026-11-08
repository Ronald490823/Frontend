"use client";

import {
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Navigation,
  PencilLine,
  Radio,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckInPanel } from "@/components/attendance/check-in-panel";
import { formatMonth, MonthlyBoxes, MonthlyLegend } from "@/components/attendance/monthly-boxes";
import { SuccessMark } from "@/components/attendance/success-mark";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { SelfCheckIn } from "@/components/sessions/self-check-in";
import { ATTENDANCE_LABEL, AttendanceBadge } from "@/components/sessions/status";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { useMyAttendance, useMyMonthlyAttendance } from "@/features/attendance/hooks";
import { useMe } from "@/features/auth/hooks";
import { useActiveSessions, useSessions } from "@/features/sessions/hooks";
import { formatDate, formatRelative, formatSessionWindow, formatTime } from "@/lib/formatters";
import type { CdsSession, MyAttendanceItem } from "@/types/api";

const METHOD = {
  qr: { icon: Smartphone, label: "Scanned QR" },
  location: { icon: Navigation, label: "Checked in by location" },
  manual: { icon: PencilLine, label: "Recorded by executive" },
} as const;

export default function AttendancePage() {
  const { data: me } = useMe();
  const hasGroup = me?.membership?.status === "approved";

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Attendance"
        title="Check in"
        description={hasGroup ? `${me?.membership?.groupName} CDS` : undefined}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="space-y-5">
          {hasGroup ? (
            <CheckInArea />
          ) : (
            <Card>
              <EmptyState
                icon={<CalendarCheck2 className="size-6" />}
                title="No CDS group"
                body="Check-in is for approved members of a CDS group."
              />
            </Card>
          )}
          {hasGroup && <ThisMonth />}
        </div>

        <History />
      </div>
    </PageContainer>
  );
}

/** Shows what's open right now and the right way in for this person. */
function CheckInArea() {
  const active = useActiveSessions();
  const groupId = useMe().data?.membership?.groupId;
  const session = active.data?.find((s) => s.groupId === groupId);

  if (active.isPending) return <Skeleton className="h-80 rounded-[2rem]" />;
  if (!session) return <NoSessionOpen />;

  return (
    <div className="space-y-4">
      <LiveStrip session={session} />
      {session.myStatus ? (
        <Card className="py-10 text-center">
          <SuccessMark tone={session.myStatus === "late" ? "warning" : "success"} />
          <h2 className="mt-6 text-2xl font-semibold tracking-tight">You&apos;re checked in</h2>
          <p className="mt-2 text-muted">Recorded as {ATTENDANCE_LABEL[session.myStatus].toLowerCase()}.</p>
        </Card>
      ) : session.canManage ? (
        // An executive's own screen shows the code, so they check in from here instead of scanning.
        <div className="space-y-3">
          <SelfCheckIn sessionId={session.id} requiresLocation={session.requiresLocation} myRecord={null} />
          <Link
            href={`/sessions/${session.id}`}
            className="flex items-center justify-center gap-1.5 text-sm font-medium text-brand hover:text-brand-deep"
          >
            Show the QR code to members <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <>
          <CheckInPanel />
          <p className="px-2 text-center text-xs text-muted">
            Trouble checking in? Your executive can record your attendance manually.
          </p>
        </>
      )}
    </div>
  );
}

function LiveStrip({ session: s }: { session: CdsSession }) {
  return (
    <Link
      href={`/sessions/${s.id}`}
      className="group flex items-center gap-3 rounded-3xl bg-brand-deep p-4 text-white shadow-lift"
    >
      <span className="relative grid size-10 shrink-0 place-items-center rounded-2xl bg-white/15">
        <Radio className="size-5" aria-hidden />
        <span className="absolute -right-0.5 -top-0.5 flex size-2.5" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-75 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white/70">Check-in is open</p>
        <p className="truncate font-semibold">{s.title}</p>
        <p className="flex flex-wrap gap-x-3 text-xs text-white/70">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden /> until {formatTime(s.scheduledEnd)}
          </span>
          {s.venue && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" aria-hidden /> {s.venue}
            </span>
          )}
        </p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-white/60 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

function NoSessionOpen() {
  const scheduled = useSessions({ status: "scheduled" });
  const next = useMemo(() => {
    const now = Date.now();
    return (scheduled.data?.items ?? [])
      .filter((s) => new Date(s.scheduledEnd).getTime() > now)
      .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart))[0];
  }, [scheduled.data]);

  return (
    <Card className="py-10 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-surface text-brand">
        <CalendarClock className="size-7" aria-hidden />
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-tight">No session is open right now</h2>
      {scheduled.isPending ? (
        <Skeleton className="mx-auto mt-3 h-4 w-48" />
      ) : next ? (
        <>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            Next up: <span className="font-medium text-ink">{next.title}</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            {formatSessionWindow(next.scheduledStart, next.scheduledEnd)} · {formatRelative(next.scheduledStart)}
          </p>
          {next.venue && (
            <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted">
              <MapPin className="size-3.5" aria-hidden /> {next.venue}
            </p>
          )}
        </>
      ) : (
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">Nothing is scheduled yet.</p>
      )}
      <p className="mx-auto mt-5 max-w-xs text-xs text-muted">
        This page updates by itself — the check-in button appears as soon as a session starts, and you&apos;ll get a
        notification.
      </p>
    </Card>
  );
}

function ThisMonth() {
  const monthly = useMyMonthlyAttendance();
  if (monthly.isPending) return <Skeleton className="h-36 rounded-3xl" />;
  if (monthly.isError) return null;
  const { marks, required, sessions } = monthly.data;
  const attended = marks.filter((m) => m === "attended").length;
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">{formatMonth(monthly.data.month)}</p>
        <p className="text-sm text-muted">
          <span className="font-semibold tabular-nums text-ink">{attended}</span> of {Math.max(required, sessions.length)} meetings
        </p>
      </div>
      <MonthlyBoxes required={required} sessions={sessions} marks={marks} className="mt-4" />
      <MonthlyLegend className="mt-3" />
    </Card>
  );
}

function History() {
  const [page, setPage] = useState(1);
  const history = useMyAttendance(page);
  const totalPages = history.data ? Math.max(1, Math.ceil(history.data.total / history.data.pageSize)) : 1;

  // Group the page into months so a long history scans easily.
  const months = useMemo(() => {
    const groups: { key: string; items: MyAttendanceItem[] }[] = [];
    for (const item of history.data?.items ?? []) {
      const key = formatDate(item.scheduledStart, { month: "long", year: "numeric" });
      const last = groups[groups.length - 1];
      if (last?.key === key) last.items.push(item);
      else groups.push({ key, items: [item] });
    }
    return groups;
  }, [history.data]);

  return (
    <section aria-labelledby="history-heading">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 id="history-heading" className="text-lg font-semibold tracking-tight">
          Your history
        </h2>
        {history.data && history.data.total > 0 && (
          <p className="text-sm text-muted">
            {history.data.total} session{history.data.total === 1 ? "" : "s"} recorded
          </p>
        )}
      </div>
      {history.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-3xl" />
          ))}
        </div>
      ) : history.isError ? (
        <Card>
          <ErrorState error={history.error} onRetry={() => history.refetch()} retrying={history.isFetching} />
        </Card>
      ) : history.data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarCheck2 className="size-6" />}
            title="No attendance yet"
            body="Sessions you check in to will appear here."
          />
        </Card>
      ) : (
        <>
          <Stagger key={page} className="space-y-6">
            {months.map((m) => (
              <div key={m.key}>
                <p className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-muted">{m.key}</p>
                <div className="space-y-3">
                  {m.items.map((item) => {
                    const Method = METHOD[item.method];
                    return (
                      <StaggerItem key={item.id}>
                        <Link
                          href={`/sessions/${item.sessionId}`}
                          className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-hairline transition-shadow hover:shadow-lift"
                        >
                          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface text-brand">
                            <Method.icon className="size-5" aria-label={Method.label} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{item.sessionTitle}</p>
                            <p className="truncate text-sm text-muted">
                              {formatDate(item.scheduledStart, { weekday: "short", day: "numeric", month: "short" })} ·
                              in at {formatTime(item.checkedInAt)}
                              <span className="hidden sm:inline"> · {Method.label}</span>
                            </p>
                          </div>
                          <AttendanceBadge status={item.status} />
                        </Link>
                      </StaggerItem>
                    );
                  })}
                </div>
              </div>
            ))}
          </Stagger>
          {totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-5 flex items-center justify-between">
              <Button size="sm" variant="ghost" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                <ChevronLeft className="size-4" aria-hidden /> Newer
              </Button>
              <span className="text-sm text-muted">
                {page} / {totalPages}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                Older <ChevronRight className="size-4" aria-hidden />
              </Button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
