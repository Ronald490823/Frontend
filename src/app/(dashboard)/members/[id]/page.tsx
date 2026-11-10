"use client";

import { ArchiveRestore, ArrowLeft, BadgeCheck, CalendarDays, Mail, Pencil, Phone, ShieldCheck, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { toast } from "sonner";
import { ActivityTable } from "@/components/audit/activity-table";
import { PageContainer } from "@/components/layout/page-header";
import { EditUserDialog } from "@/components/members/edit-user-dialog";
import { AttendanceBadge } from "@/components/sessions/status";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { FullPageLoader } from "@/components/ui/loader";
import { useMe } from "@/features/auth/hooks";
import { useDeleteUser, useRestoreUser, useUserProfile } from "@/features/users/hooks";
import { formatDate, formatRelative, formatTime, initials } from "@/lib/formatters";
import { isAreaAdmin, isSuperAdmin } from "@/lib/permissions";
import type { UserProfile } from "@/types/api";

const METHOD = { qr: "QR scan", location: "Location", manual: "Recorded by exco" } as const;

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const profile = useUserProfile(id);
  if (profile.isPending) return <FullPageLoader label="Loading member…" />;
  if (!profile.data) {
    return (
      <PageContainer>
        <BackLink />
        <Card>
          <ErrorState error={profile.error} onRetry={() => profile.refetch()} retrying={profile.isFetching} />
        </Card>
      </PageContainer>
    );
  }
  return <MemberDetail p={profile.data} />;
}

function BackLink() {
  // Super admins reach profiles from the account directory.
  const superAdmin = isSuperAdmin(useMe().data);
  return (
    <Link
      href={superAdmin ? "/accounts" : "/members"}
      className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink"
    >
      <ArrowLeft className="size-4" aria-hidden /> {superAdmin ? "Accounts" : "Members"}
    </Link>
  );
}

function MemberDetail({ p }: { p: UserProfile }) {
  const me = useMe().data;
  const m = p.membership;
  const isExco = m?.role === "executive";
  const [editing, setEditing] = useState(false);

  return (
    <PageContainer>
      <BackLink />

      {p.deletedAt && (
        <div role="status" className="mb-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-600/15">
          This account was deleted {formatRelative(p.deletedAt)}. They can&apos;t sign in and are hidden from every list until
          it&apos;s reactivated.
        </div>
      )}

      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-surface text-lg font-semibold text-brand-deep">
            {initials(p.fullName)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{p.fullName}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              {p.stateCode}
              {isExco && <Badge tone="info">Executive</Badge>}
              {m && m.status !== "approved" && <Badge tone={m.status === "pending" ? "warning" : "neutral"}>{m.status}</Badge>}
              {p.deletedAt && <Badge tone="danger">Deleted</Badge>}
            </p>
          </div>
        </div>
        {(p.canEdit || p.canDelete || p.canRestore) && (
          <div className="flex flex-wrap gap-2">
            {p.canEdit && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="size-4" aria-hidden /> Edit profile
              </Button>
            )}
            {p.canRestore && <RestoreMemberButton profile={p} />}
            {p.canDelete && <DeleteMemberButton profile={p} />}
          </div>
        )}
      </header>
      <EditUserDialog user={editing ? p : null} onClose={() => setEditing(false)} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <AttendanceSummary p={p} />
          <RecentAttendance p={p} />
          {isExco && isAreaAdmin(me) && (
            <ActivityTable title={`${p.fullName.split(" ")[0]}'s past actions`} actorId={p.id} showActor={false} />
          )}
        </div>

        <div className="space-y-6">
          <Card className="space-y-4">
            <h2 className="text-sm font-medium">Profile</h2>
            <Detail icon={<Mail className="size-4" />} label="Email" value={p.email} />
            <Detail icon={<Phone className="size-4" />} label="Phone" value={p.phone ?? "Not provided"} />
            <Detail icon={<CalendarDays className="size-4" />} label="Registered" value={formatDate(p.createdAt)} />
            <Detail
              icon={<UserRound className="size-4" />}
              label="Last signed in"
              value={p.lastLoginAt ? formatRelative(p.lastLoginAt) : "Never"}
            />
          </Card>

          {m && (
            <Card className="space-y-4">
              <h2 className="text-sm font-medium">CDS group</h2>
              <Detail icon={<ShieldCheck className="size-4" />} label="Group" value={`${m.groupName} · ${m.groupCode}`} />
              <Detail icon={<CalendarDays className="size-4" />} label="Requested to join" value={formatDate(m.requestedAt)} />
              {/* The approver stays attached to the account for the record. */}
              <div className="rounded-2xl bg-canvas p-4 ring-1 ring-hairline">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                  <BadgeCheck className="size-4 text-brand" aria-hidden />
                  {m.status === "rejected" ? "Declined by" : "Approved by"}
                </p>
                {m.decidedByName ? (
                  <>
                    <p className="mt-1 font-medium">
                      {m.decidedById ? (
                        <Link href={`/members/${m.decidedById}`} className="hover:text-brand">
                          {m.decidedByName}
                        </Link>
                      ) : (
                        m.decidedByName
                      )}
                    </p>
                    {m.decidedAt && <p className="text-xs text-muted">{formatDate(m.decidedAt, { dateStyle: "medium", timeStyle: "short" })}</p>}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted">{m.status === "pending" ? "Waiting for approval" : "Not recorded"}</p>
                )}
                {m.decisionReason && <p className="mt-2 text-sm text-ink/70">“{m.decisionReason}”</p>}
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="break-words text-sm">{value}</p>
      </div>
    </div>
  );
}

function AttendanceSummary({ p }: { p: UserProfile }) {
  const s = p.summary;
  const tiles = [
    { label: "Attendance", value: s.rate === null ? "—" : `${s.rate}%`, tone: "text-brand" },
    { label: "Present", value: s.present, tone: "text-emerald-600" },
    { label: "Late", value: s.late, tone: "text-amber-600" },
    { label: "Excused", value: s.excused, tone: "text-info" },
    { label: "Absent", value: s.absent, tone: "text-rose-600" },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((t, i) => (
          <div key={t.label} className={`rounded-2xl bg-white p-4 shadow-soft ring-1 ring-hairline ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`}>
            <p className="text-xs font-medium text-muted">{t.label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${t.tone}`}>{t.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">Across {s.sessions} ended session{s.sessions === 1 ? "" : "s"} since joining.</p>
    </div>
  );
}

function RecentAttendance({ p }: { p: UserProfile }) {
  return (
    <Card className="overflow-hidden p-0">
      <p className="border-b border-hairline px-4 py-3 text-sm font-medium">Attendance history</p>
      {p.recent.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-6" />} title="No sessions yet" body="Sessions held since this member joined will appear here." />
      ) : (
        <ul className="divide-y divide-hairline">
          {p.recent.map((r) => (
            <li key={r.sessionId}>
              <Link href={`/sessions/${r.sessionId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-canvas">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="truncate text-xs text-muted">
                    {formatDate(r.scheduledStart, { weekday: "short", day: "numeric", month: "short" })}
                    {r.checkedInAt && r.method && (
                      <>
                        {" "}
                        · {METHOD[r.method]} at {formatTime(r.checkedInAt)}
                      </>
                    )}
                  </p>
                </div>
                {r.status ? <AttendanceBadge status={r.status} /> : <span className="text-xs text-muted">Live now</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RestoreMemberButton({ profile: p }: { profile: UserProfile }) {
  const restore = useRestoreUser();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <ArchiveRestore className="size-4" aria-hidden /> Reactivate account
      </Button>
      <ConfirmDialog
        open={open}
        title={`Reactivate ${p.fullName}?`}
        body={
          p.membership
            ? `They'll be able to sign in again and return to ${p.membership.groupName} as before.`
            : "They'll be able to sign in again."
        }
        confirmLabel="Reactivate"
        pending={restore.isPending}
        onConfirm={() =>
          void restore
            .mutateAsync(p.id)
            .then(() => {
              toast.success(`${p.fullName} reactivated`);
              setOpen(false);
            })
            .catch(() => undefined)
        }
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function DeleteMemberButton({ profile: p }: { profile: UserProfile }) {
  const del = useDeleteUser();
  const router = useRouter();
  const superAdmin = isSuperAdmin(useMe().data);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" className="text-rose-700" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" aria-hidden /> Delete
      </Button>
      <ConfirmDialog
        open={open}
        title={`Delete ${p.fullName}?`}
        body={
          superAdmin
            ? "They'll be signed out and hidden from every list and roster. Their records stay, and you can reactivate the account later from Accounts."
            : "They'll be signed out and won't be able to sign in again. They disappear from every list and roster, but their records stay in the database."
        }
        confirmLabel="Delete member"
        tone="danger"
        pending={del.isPending}
        onConfirm={() =>
          void del
            .mutateAsync(p.id)
            .then(() => {
              toast.success(`${p.fullName} deleted`);
              router.replace(superAdmin ? "/accounts" : "/members");
            })
            .catch(() => undefined)
        }
        onClose={() => setOpen(false)}
      />
    </>
  );
}
