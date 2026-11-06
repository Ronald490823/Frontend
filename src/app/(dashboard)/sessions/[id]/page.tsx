"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  Download,
  History,
  MapPin,
  Navigation,
  PencilLine,
  QrCode,
  Search,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
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
import { SelfCheckIn } from "@/components/sessions/self-check-in";
import { AttendanceBadge, SessionBadge } from "@/components/sessions/status";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { FullPageLoader, Loader } from "@/components/ui/loader";
import { Segmented } from "@/components/ui/segmented";
import { CheckInPanel } from "@/components/attendance/check-in-panel";
import { useMe } from "@/features/auth/hooks";
import {
  type SessionAction,
  useRoster,
  useSession,
  useSessionAction,
} from "@/features/sessions/hooks";
import {
  formatRelative,
  formatSessionWindow,
  formatTime,
  initials,
} from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { CdsSession, Roster, RosterEntry } from "@/types/api";

const ACTION_COPY: Record<
  SessionAction,
  {
    title: string;
    body: string;
    label: string;
    tone: "primary" | "danger";
    done: string;
  }
> = {
  start: {
    title: "Start this session?",
    body: "Members can check in as soon as you show the QR code.",
    label: "Start session",
    tone: "primary",
    done: "Session started — show the code",
  },
  close: {
    title: "Close this session?",
    body: "The QR code stops working immediately. You can still correct attendance afterwards.",
    label: "Close session",
    tone: "danger",
    done: "Session closed",
  },
  archive: {
    title: "Archive this session?",
    body: "Archived sessions are read-only. Attendance can no longer be corrected.",
    label: "Archive",
    tone: "danger",
    done: "Session archived",
  },
  cancel: {
    title: "Cancel this session?",
    body: "Members will see it as cancelled. This can't be undone.",
    label: "Cancel session",
    tone: "danger",
    done: "Session cancelled",
  },
};

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const session = useSession(id);

  if (session.isPending) return <FullPageLoader label="Loading session…" />;
  // Only without data: a failed poll keeps showing the session (and any open dialog).
  if (!session.data) {
    return (
      <PageContainer>
        <Card>
          <ErrorState
            error={session.error}
            onRetry={() => session.refetch()}
            retrying={session.isFetching}
          />
        </Card>
      </PageContainer>
    );
  }
  return <SessionDetail session={session.data} />;
}

function SessionDetail({ session: s }: { session: CdsSession }) {
  const live = s.status === "active";
  const [editing, setEditing] = useState(false);
  const canEdit =
    s.canManage && (s.status === "scheduled" || s.status === "active");
  // Announce a scheduled → live flip that happened by itself (shares an id with "Start now").
  const prevStatus = useRef(s.status);
  useEffect(() => {
    if (prevStatus.current === "scheduled" && s.status === "active") {
      toast.success(
        s.canManage ? "Session is live — show the code" : "Check-in is open",
        { id: "session-live" },
      );
    }
    prevStatus.current = s.status;
  }, [s.status, s.canManage]);
  const roster = useRoster(s.id, {
    enabled:
      s.canManage && s.status !== "scheduled" && s.status !== "cancelled",
    live,
  });

  return (
    <PageContainer>
      <Link
        href="/sessions"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Sessions
      </Link>

      <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <SessionBadge status={s.status} />
            <span className="text-sm text-muted">{s.groupName}</span>
          </div>
          <RevealText
            text={s.title}
            className="text-3xl font-semibold tracking-[-0.04em] sm:text-[2.6rem] sm:leading-[1.1]"
          />
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />{" "}
              {formatSessionWindow(s.scheduledStart, s.scheduledEnd)}
            </span>
            {s.venue && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden /> {s.venue}
              </span>
            )}
            {s.requiresLocation && (
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4" aria-hidden /> Location check
                within {s.radiusM} m
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

      {canEdit && (
        <EditSessionDialog
          open={editing}
          onClose={() => setEditing(false)}
          session={s}
        />
      )}

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
    s.status === "scheduled"
      ? ["cancel", "start"]
      : s.status === "active"
        ? ["close"]
        : s.status === "closed"
          ? ["archive"]
          : [];
  console.log(
    "SessionControls available",
    available,
    "pending",
    pending,
    "act.isPending",
    act.isPending,
  );
  if (!available.length) return null;

  async function run(action: SessionAction) {
    await act.mutateAsync(action);
    toast.success(ACTION_COPY[action].done, {
      id: action === "start" ? "session-live" : undefined,
    });
    setPending(null);
  }

  return (
    <div className="flex gap-2">
      {/* {console.log("SessionControls available", available, "pending", pending, "act.isPending", act.isPending)} */}
      {available.map((a) => (
        <Button
          key={a}
          variant={a === "start" ? "primary" : "secondary"}
          // Starting is safe and reversible by closing; only destructive actions confirm.
          onClick={() =>
            a === "start" ? void run(a).catch(() => undefined) : setPending(a)
          }
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

function ManagerView({
  session: s,
  roster,
}: {
  session: CdsSession;
  roster: RosterQuery;
}) {
  const me = useMe().data;
  const myId = me?.id;
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
        <EmptyState
          icon={<QrCode className="size-6" />}
          title="This session was cancelled"
          body="No attendance was taken."
        />
      </Card>
    );
  }
  const summary = roster.data?.summary;
  // Only members of this group can attend it (an LGI overseeing it can't check in).
  const isMember = me?.membership?.status === "approved" && me.membership.groupId === s.groupId;
  const checkedIn = summary ? summary.present + summary.late : 0;
  return (
    <div
      className={cn(
        "grid gap-6",
        s.status === "active" && "lg:grid-cols-[22rem_minmax(0,1fr)]",
      )}
    >
      {s.status === "active" && (
        <div className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          <QrPanel
            sessionId={s.id}
            title={s.title}
            checkedIn={checkedIn}
            eligible={summary?.eligible ?? 0}
          />
          {myId && isMember && (
            <SelfCheckIn
              sessionId={s.id}
              requiresLocation={s.requiresLocation}
              myRecord={
                roster.data
                  ? (roster.data.entries.find((e) => e.userId === myId)?.attendance ?? null)
                  : undefined
              }
            />
          )}
        </div>
      )}
      <RosterView session={s} roster={roster} />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-hairline">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-3xl font-semibold tracking-tight tabular-nums",
          tone,
        )}
      >
        <AnimatedNumber value={value} />
      </p>
    </div>
  );
}

type RosterFilter = "in" | "all" | "present" | "late" | "excused" | "absent" | "none";

/** Showed up: scanned, checked in by location, or recorded present/late by an executive. */
const checkedIn = (e: RosterEntry) => e.attendance?.status === "present" || e.attendance?.status === "late";

/** What a row counts as for filtering: a closed session turns "no record" into an absence. */
function rowState(e: RosterEntry, live: boolean): Exclude<RosterFilter, "all" | "in"> {
  if (e.attendance) return e.attendance.status;
  return live ? "none" : "absent";
}

const METHOD_LABEL = { qr: "QR scan", location: "Location", manual: "Recorded" } as const;

function csvCell(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadCsv(s: CdsSession, rows: { n: number | null; e: RosterEntry }[], live: boolean) {
  const header = ["#", "Name", "State code", "Role", "Status", "Checked in", "Method"];
  const lines = rows.map(({ n, e }) =>
    [
      n === null ? "" : String(n),
      e.fullName,
      e.stateCode,
      e.role,
      e.attendance ? e.attendance.status : live ? "not yet" : "absent",
      e.attendance ? formatTime(e.attendance.checkedInAt) : "",
      e.attendance ? METHOD_LABEL[e.attendance.method] : "",
    ]
      .map(csvCell)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${s.title.replace(/[^\w-]+/g, "_")}_${s.scheduledStart.slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function RosterView({
  session: s,
  roster,
}: {
  session: CdsSession;
  roster: RosterQuery;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<RosterFilter>("in");
  const [editing, setEditing] = useState<RosterEntry | null>(null);
  const [history, setHistory] = useState<RosterEntry | null>(null);
  const live = s.status === "active";
  const editable = s.status === "active" || s.status === "closed";
  // The API refuses self-edits; hide the control rather than invite a 403.
  const myId = useMe().data?.id;

  // Everyone who checked in gets a number in the order they came in (1 = first in). Numbers
  // stay fixed while searching or filtering. Excused, absent and not-yet members follow, unnumbered.
  const numbered = useMemo(() => {
    const list = roster.data?.entries ?? [];
    const inOrder = list
      .filter(checkedIn)
      .sort((a, b) => a.attendance!.checkedInAt.localeCompare(b.attendance!.checkedInAt));
    const rest = list
      .filter((e) => !checkedIn(e))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    return [
      ...inOrder.map((e, i) => ({ n: i + 1 as number | null, e })),
      ...rest.map((e) => ({ n: null as number | null, e })),
    ];
  }, [roster.data]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return numbered.filter(
      ({ e }) =>
        (filter === "all" || (filter === "in" ? checkedIn(e) : rowState(e, live) === filter)) &&
        (!needle ||
          e.fullName.toLowerCase().includes(needle) ||
          e.stateCode.toLowerCase().includes(needle)),
    );
  }, [numbered, q, filter, live]);

  const counts = useMemo(() => {
    const c: Record<RosterFilter, number> = { in: 0, all: numbered.length, present: 0, late: 0, excused: 0, absent: 0, none: 0 };
    for (const { e } of numbered) {
      c[rowState(e, live)] += 1;
      if (checkedIn(e)) c.in += 1;
    }
    return c;
  }, [numbered, live]);

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
  // Only without data: a failed background poll must not tear down the roster, or an open
  // dialog with it (and whatever was being typed). The next poll recovers on its own.
  if (roster.isError && !roster.data) {
    return (
      <Card>
        <ErrorState
          error={roster.error}
          onRetry={() => roster.refetch()}
          retrying={roster.isFetching}
        />
      </Card>
    );
  }

  const { summary } = roster.data as Roster;
  const attended = summary.present + summary.late;
  const rate = summary.eligible ? Math.round((attended / summary.eligible) * 100) : 0;
  const filterOptions: { value: RosterFilter; label: string; count: number }[] = [
    { value: "in", label: "Checked in", count: counts.in },
    { value: "all", label: "Everyone", count: counts.all },
    { value: "present", label: "Present", count: counts.present },
    { value: "late", label: "Late", count: counts.late },
    { value: "excused", label: "Excused", count: counts.excused },
    live
      ? { value: "none", label: "Not yet", count: counts.none }
      : { value: "absent", label: "Absent", count: counts.absent },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile
          label="Present"
          value={summary.present}
          tone="text-emerald-600"
        />
        <SummaryTile label="Late" value={summary.late} tone="text-amber-600" />
        <SummaryTile label="Excused" value={summary.excused} tone="text-info" />
        <SummaryTile
          label={live ? "Not yet in" : "Absent"}
          value={live ? summary.notRecorded : summary.absent}
          tone="text-ink"
        />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-hairline">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">Turnout</span>
          <span className="tabular-nums text-muted">
            {attended} of {summary.eligible} · <span className="font-semibold text-ink">{rate}%</span>
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/[0.06]" aria-hidden>
          <motion.div
            className="h-full rounded-full bg-brand"
            initial={{ width: 0 }}
            animate={{ width: `${rate}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 24 }}
          />
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="space-y-3 border-b border-hairline p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center text-sm text-muted">
              {live ? "Attendance list · live" : "Attendance list"}
              {roster.isFetching && (
                <Loader size="sm" label="Updating…" className="ml-2 text-brand" />
              )}
            </p>
            <div className="flex gap-2">
              <label className="relative block flex-1 sm:w-64 sm:flex-none">
                <span className="sr-only">Search roster</span>
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
                  aria-hidden
                />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name or state code"
                  className="h-10 w-full rounded-full bg-canvas pl-10 pr-4 text-sm ring-1 ring-hairline focus:outline-none focus:ring-2 focus:ring-brand/70"
                />
              </label>
              <Button
                size="sm"
                variant="secondary"
                className="h-10"
                onClick={() => downloadCsv(s, rows, live)}
                disabled={rows.length === 0}
                aria-label="Download attendance list as CSV"
              >
                <Download className="size-4" aria-hidden />
                <span className="hidden sm:inline">CSV</span>
              </Button>
            </div>
          </div>
          <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
            <Segmented label="Filter by status" value={filter} onChange={setFilter} options={filterOptions} />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            icon={<Search className="size-6" />}
            title={
              q
                ? "No matches"
                : filter === "in"
                  ? live
                    ? "No one has checked in yet"
                    : "No one checked in"
                  : filter !== "all"
                    ? "No matches"
                    : "No approved members"
            }
            body={
              q
                ? "Try a different search."
                : filter === "in"
                  ? live
                    ? "Each person who scans gets the next number on this list."
                    : undefined
                  : filter !== "all"
                    ? "Try a different filter."
                    : "Approve members from the Members page."
            }
          />
        ) : (
          <ol className="divide-y divide-hairline">
            {rows.map(({ n, e }) => {
              const isMe = e.userId === myId;
              return (
                <motion.li
                  key={e.userId}
                  layout="position"
                  className={cn("flex items-center gap-3 px-4 py-3 sm:gap-4", isMe && "bg-surface/60")}
                >
                  {n !== null ? (
                    <span
                      className="grid h-7 min-w-7 shrink-0 place-items-center rounded-full bg-brand px-1.5 text-xs font-semibold tabular-nums text-white"
                      aria-label={`Number ${n}`}
                    >
                      {n}
                    </span>
                  ) : (
                    <span className="grid h-7 min-w-7 shrink-0 place-items-center text-xs text-muted" aria-hidden>
                      –
                    </span>
                  )}
                  <span className="hidden size-10 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold text-brand-deep sm:grid">
                    {initials(e.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                      <span className="truncate">{e.fullName}</span>
                      {isMe && <Badge tone="info">You</Badge>}
                      {e.role === "executive" && !isMe && (
                        <span className="text-xs font-normal text-muted">Exco</span>
                      )}
                    </p>
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
                    <span className="text-xs text-muted">{live ? "Not yet" : "Absent"}</span>
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
                    {editable && !isMe ? (
                      <Button size="sm" variant="ghost" onClick={() => setEditing(e)}>
                        {e.attendance ? "Change" : "Record"}
                      </Button>
                    ) : null}
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}
        {rows.length > 0 && (
          <p className="border-t border-hairline px-4 py-3 text-xs text-muted">
            {counts.in} checked in · showing {rows.length} of {numbered.length}. Each person who checks in gets the next number.
            {!live && " Need your own record changed? Ask another executive or your LGI."}
          </p>
        )}
      </Card>

      <ManualAttendanceDialog
        sessionId={s.id}
        entry={editing}
        onClose={() => setEditing(null)}
      />
      <HistoryDialog
        attendanceId={history?.attendance?.id ?? null}
        name={history?.fullName ?? ""}
        onClose={() => setHistory(null)}
      />
    </div>
  );
}

function MemberView({ session: s }: { session: CdsSession }) {
  if (!s.myStatus && s.status === "active") {
    return (
      <div className="mx-auto max-w-lg">
        <CheckInPanel />
        <p className="mt-4 px-2 text-center text-xs text-muted">
          Trouble checking in? Your executive can record your attendance manually.
        </p>
      </div>
    );
  }
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
          <Link href="/attendance" className="mt-6 inline-block text-sm font-medium text-brand hover:text-brand-deep">
            See your attendance history
          </Link>
        </>
      ) : s.status === "scheduled" ? (
        <>
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-surface text-brand">
            <Clock className="size-6" aria-hidden />
          </div>
          <h2 className="text-lg font-semibold tracking-tight">Check-in opens at {formatTime(s.scheduledStart)}</h2>
          <p className="mt-1 text-sm text-muted">
            That&apos;s {formatRelative(s.scheduledStart)}. Keep this page open — the check-in button appears here when it starts.
          </p>
        </>
      ) : (
        <p className="text-muted">
          {s.status === "cancelled" ? "This session was cancelled." : "No attendance was recorded for you."}
        </p>
      )}
    </Card>
  );
}
