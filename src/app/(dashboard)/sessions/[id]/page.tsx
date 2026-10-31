"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Clock, History, MapPin, Navigation, PencilLine, QrCode, Search, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/page-header";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { RevealText } from "@/components/motion/reveal-text";
import { EditSessionDialog } from "@/components/sessions/edit-session-dialog";
import { HistoryDialog } from "@/components/sessions/history-dialog";
import { ManualAttendanceDialog } from "@/components/sessions/manual-attendance-dialog";
import { QrPanel } from "@/components/sessions/qr-panel";
import { AttendanceBadge, SessionBadge } from "@/components/sessions/status";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { FullPageLoader, Loader } from "@/components/ui/loader";
import { useMe } from "@/features/auth/hooks";
import { type SessionAction, useRoster, useSession, useSessionAction } from "@/features/sessions/hooks";
import { formatRelative, formatSessionWindow, formatTime, initials } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { CdsSession, Roster, RosterEntry } from "@/types/api";

const ACTION_COPY: Record<SessionAction, { title: string; body: string; label: string; tone: "primary" | "danger"; done: string }> = {
  start: { title: "Start this session?", body: "Members can check in as soon as you show the QR code.", label: "Start session", tone: "primary", done: "Session started — show the code" },
  close: { title: "Close this session?", body: "The QR code stops working immediately. You can still correct attendance afterwards.", label: "Close session", tone: "danger", done: "Session closed" },
  archive: { title: "Archive this session?", body: "Archived sessions are read-only. Attendance can no longer be corrected.", label: "Archive", tone: "danger", done: "Session archived" },
  cancel: { title: "Cancel this session?", body: "Members will see it as cancelled. This can't be undone.", label: "Cancel session", tone: "danger", done: "Session cancelled" },
};

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const session = useSession(id);

  if (session.isPending) return <FullPageLoader label="Loading session…" />;
  if (session.isError) {
    return (
      <PageContainer>
        <Card>
          <ErrorState error={session.error} onRetry={() => session.refetch()} retrying={session.isFetching} />
        </Card>
      </PageContainer>
    );
  }
  return <SessionDetail session={session.data} />;
}

function SessionDetail({ session: s }: { session: CdsSession }) {
  const live = s.status === "active";
  const [editing, setEditing] = useState(false);
  const canEdit = s.canManage && (s.status === "scheduled" || s.status === "active");
  // Announce a scheduled → live flip that happened by itself (shares an id with "Start now").
  const prevStatus = useRef(s.status);
  useEffect(() => {
    if (prevStatus.current === "scheduled" && s.status === "active") {
      toast.success(s.canManage ? "Session is live — show the code" : "Check-in is open", { id: "session-live" });
    }
    prevStatus.current = s.status;
  }, [s.status, s.canManage]);
  const roster = useRoster(s.id, { enabled: s.canManage && s.status !== "scheduled" && s.status !== "cancelled", live });

  return (
    <PageContainer>
      <Link href="/sessions" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Sessions
      </Link>

      <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <SessionBadge status={s.status} />
            <span className="text-sm text-muted">{s.groupName}</span>
          </div>
          <RevealText text={s.title} className="text-3xl font-semibold tracking-[-0.04em] sm:text-[2.6rem] sm:leading-[1.1]" />
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden /> {formatSessionWindow(s.scheduledStart, s.scheduledEnd)}
            </span>
            {s.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden /> {s.venue}
              </span>
            )}
            {s.requiresLocation && (
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4" aria-hidden /> Location check within {s.radiusM} m
              </span>
            )}
          </div>
        </div>
        {s.canManage && (
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <PencilLine className="size-4" aria-hidden /> Edit
              </Button>
            )}
            <SessionControls session={s} />
          </div>
        )}
      </header>

      {canEdit && <EditSessionDialog open={editing} onClose={() => setEditing(false)} session={s} />}

      {s.canManage ? (
        <ManagerView session={s} roster={roster} />
      ) : (
        <MemberView session={s} />
      )}
    </PageContainer>
  );
}

function SessionControls({ session: s }: { session: CdsSession }) {
  const act = useSessionAction(s.id);
  const [pending, setPending] = useState<SessionAction | null>(null);
  const available: SessionAction[] =
    s.status === "scheduled" ? ["cancel", "start"] : s.status === "active" ? ["close"] : s.status === "closed" ? ["archive"] : [];
  if (!available.length) return null;

  async function run(action: SessionAction) {
    await act.mutateAsync(action);
    toast.success(ACTION_COPY[action].done, { id: action === "start" ? "session-live" : undefined });
    setPending(null);
  }

  return (
    <div className="flex gap-2">
      {available.map((a) => (
        <Button
          key={a}
          variant={a === "start" ? "primary" : "secondary"}
          // Starting is safe and reversible by closing; only destructive actions confirm.
          onClick={() => (a === "start" ? void run(a).catch(() => undefined) : setPending(a))}
          loading={a === "start" && act.isPending}
          loadingLabel="Starting…"
        >
          {a === "start" ? "Start now" : ACTION_COPY[a].label}
        </Button>
      ))}
      <ConfirmDialog
        open={!!pending}
        title={pending ? ACTION_COPY[pending].title : ""}
        body={pending ? ACTION_COPY[pending].body : ""}
        confirmLabel={pending ? ACTION_COPY[pending].label : ""}
        tone={pending ? ACTION_COPY[pending].tone : "primary"}
        pending={act.isPending}
        onConfirm={() => pending && void run(pending).catch(() => undefined)}
        onClose={() => setPending(null)}
      />
    </div>
  );
}

type RosterQuery = ReturnType<typeof useRoster>;

function ManagerView({ session: s, roster }: { session: CdsSession; roster: RosterQuery }) {
  if (s.status === "scheduled") {
    return (
      <Card>
        <EmptyState
          icon={<QrCode className="size-6" />}
          title={`Starts automatically at ${formatTime(s.scheduledStart)}`}
          body={`That's ${formatRelative(s.scheduledStart)}. Keep this page open — the rotating QR code appears here the moment it starts. Use “Start now” to begin early.`}
        />
      </Card>
    );
  }
  if (s.status === "cancelled") {
    return (
      <Card>
        <EmptyState icon={<QrCode className="size-6" />} title="This session was cancelled" body="No attendance was taken." />
      </Card>
    );
  }
  const summary = roster.data?.summary;
  const checkedIn = summary ? summary.present + summary.late : 0;
  return (
    <div className={cn("grid gap-6", s.status === "active" && "lg:grid-cols-[22rem_minmax(0,1fr)]")}>
      {s.status === "active" && (
        <div className="lg:sticky lg:top-8 lg:self-start">
          <QrPanel sessionId={s.id} title={s.title} checkedIn={checkedIn} eligible={summary?.eligible ?? 0} />
        </div>
      )}
      <RosterView session={s} roster={roster} />
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-hairline">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={cn("mt-1 text-3xl font-semibold tracking-tight tabular-nums", tone)}>
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}

function RosterView({ session: s, roster }: { session: CdsSession; roster: RosterQuery }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<RosterEntry | null>(null);
  const [history, setHistory] = useState<RosterEntry | null>(null);
  const editable = s.status === "active" || s.status === "closed";
  // The API refuses self-edits; hide the control rather than invite a 403.
  const myId = useMe().data?.id;

  const entries = useMemo(() => {
    const list = roster.data?.entries ?? [];
    const needle = q.trim().toLowerCase();
    const filtered = needle ? list.filter((e) => e.fullName.toLowerCase().includes(needle) || e.stateCode.toLowerCase().includes(needle)) : list;
    // Most recent check-ins first, then everyone not yet recorded.
    return [...filtered].sort((a, b) => (b.attendance?.checkedInAt ?? "").localeCompare(a.attendance?.checkedInAt ?? ""));
  }, [roster.data, q]);

  if (roster.isPending) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    );
  }
  if (roster.isError) {
    return (
      <Card>
        <ErrorState error={roster.error} onRetry={() => roster.refetch()} retrying={roster.isFetching} />
      </Card>
    );
  }

  const { summary } = roster.data as Roster;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Present" value={summary.present} tone="text-emerald-600" />
        <SummaryTile label="Late" value={summary.late} tone="text-amber-600" />
        <SummaryTile label="Excused" value={summary.excused} tone="text-info" />
        <SummaryTile
          label={s.status === "active" ? "Not yet in" : "Absent"}
          value={s.status === "active" ? summary.notRecorded : summary.absent}
          tone="text-ink"
        />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 border-b border-hairline p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">
            {summary.eligible} approved members {roster.isFetching && <Loader size="sm" label="Updating…" className="ml-2 text-brand" />}
          </p>
          <label className="relative block sm:w-64">
            <span className="sr-only">Search roster</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="h-10 w-full rounded-full bg-canvas pl-10 pr-4 text-sm ring-1 ring-hairline focus:outline-none focus:ring-2 focus:ring-brand/70"
            />
          </label>
        </div>
        {entries.length === 0 ? (
          <EmptyState icon={<Search className="size-6" />} title={q ? "No matches" : "No approved members"} body={q ? undefined : "Approve members from the Members page."} />
        ) : (
          <ul className="divide-y divide-hairline">
            {entries.map((e) => (
              <motion.li key={e.userId} layout="position" className="flex items-center gap-4 px-4 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold text-brand-deep">
                  {initials(e.fullName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.fullName}</p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                    {e.stateCode}
                    {e.attendance && (
                      <>
                        <span aria-hidden>·</span>
                        {e.attendance.method === "qr" ? (
                          <Smartphone className="size-3" aria-label="QR" />
                        ) : e.attendance.method === "location" ? (
                          <Navigation className="size-3" aria-label="Location" />
                        ) : (
                          <PencilLine className="size-3" aria-label="Manual" />
                        )}
                        {formatTime(e.attendance.checkedInAt)}
                      </>
                    )}
                  </p>
                </div>
                {e.attendance ? (
                  <AttendanceBadge status={e.attendance.status} />
                ) : (
                  <span className="text-xs text-muted">{s.status === "active" ? "Not yet" : "Absent"}</span>
                )}
                <div className="flex shrink-0 gap-1">
                  {e.attendance ? (
                    <button
                      type="button"
                      onClick={() => setHistory(e)}
                      aria-label={`History for ${e.fullName}`}
                      className="grid size-8 place-items-center rounded-full text-ink/50 hover:bg-ink/5 hover:text-ink"
                    >
                      <History className="size-4" aria-hidden />
                    </button>
                  ) : null}
                  {editable && e.userId !== myId ? (
                    <Button size="sm" variant="ghost" onClick={() => setEditing(e)}>
                      {e.attendance ? "Change" : "Record"}
                    </Button>
                  ) : null}
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </Card>

      <ManualAttendanceDialog sessionId={s.id} entry={editing} onClose={() => setEditing(null)} />
      <HistoryDialog attendanceId={history?.attendance?.id ?? null} name={history?.fullName ?? ""} onClose={() => setHistory(null)} />
    </div>
  );
}

function MemberView({ session: s }: { session: CdsSession }) {
  return (
    <Card className="mx-auto max-w-lg py-10 text-center">
      {s.myStatus ? (
        <>
          <p className="text-sm text-muted">Your attendance</p>
          <div className="mt-3 flex justify-center">
            <span className="scale-125">
              <AttendanceBadge status={s.myStatus} />
            </span>
          </div>
        </>
      ) : s.status === "active" ? (
        <>
          <h2 className="text-xl font-semibold tracking-tight">Check-in is open</h2>
          <p className="mt-2 text-sm text-muted">Scan the code on your executive&apos;s screen.</p>
          <Link href="/attendance" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-brand px-6 font-medium text-white shadow-lift hover:bg-brand-deep">
            <QrCode className="size-5" aria-hidden /> Scan to check in
          </Link>
        </>
      ) : (
        <p className="text-muted">
          {s.status === "scheduled"
            ? `Check-in opens automatically at ${formatTime(s.scheduledStart)} (${formatRelative(s.scheduledStart)}).`
            : "No attendance was recorded for you."}
        </p>
      )}
    </Card>
  );
}
