"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowRight, ArrowUpRight, BarChart3, Building2, IdCard, Radio, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useActiveSessions } from "@/features/sessions/hooks";
import { formatMonth, MonthlyBoxes, MonthlyLegend } from "@/components/attendance/monthly-boxes";
import { AdminOverview, RateMeter, rateBand } from "@/components/dashboard/admin-overview";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Badge, Card, Skeleton } from "@/components/ui/card";
import { useMyMonthlyAttendance } from "@/features/attendance/hooks";
import { useMe } from "@/features/auth/hooks";
import { useGroupStats } from "@/features/dashboard/hooks";
import { useManagedGroups } from "@/features/groups/hooks";
import { usePendingCount } from "@/features/memberships/hooks";
import { formatDate, greeting } from "@/lib/formatters";
import { isAreaAdmin, isExecutive, isSuperAdmin, primaryRoleLabel } from "@/lib/permissions";
import type { Me } from "@/types/api";

export default function DashboardPage() {
  const { data: me } = useMe();
  if (!me) return null; // layout guarantees data

  return (
    <PageContainer>
      <PageHeader eyebrow={greeting()} title={`Hello, ${me.fullName.split(" ")[0]}.`} description={primaryRoleLabel(me)} />
      <LiveSessionBanner />
      {isAreaAdmin(me) && <AdminOverview superAdmin={isSuperAdmin(me)} />}
      <Stagger className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <StaggerItem>
          <ProfileCard me={me} />
        </StaggerItem>
        {me.membership && (
          <StaggerItem>
            <Card className="h-full">
              <CardTitle icon={<Users className="size-5" />} label="CDS group" />
              <p className="mt-5 text-2xl font-semibold tracking-tight">{me.membership.groupName}</p>
              <p className="mt-1 text-sm text-muted">Code {me.membership.groupCode}</p>
              <div className="mt-5 flex gap-2">
                <Badge tone="success">Approved member</Badge>
                {me.membership.role === "executive" && <Badge tone="info">Executive</Badge>}
              </div>
            </Card>
          </StaggerItem>
        )}
        {isExecutive(me) && me.membership && (
          <StaggerItem>
            <PendingApprovalsCard groupId={me.membership.groupId} />
          </StaggerItem>
        )}
        {isExecutive(me) && !isAreaAdmin(me) && (
          <StaggerItem>
            <GroupHealthCard />
          </StaggerItem>
        )}
        {isAreaAdmin(me) && (
          <StaggerItem>
            <AreaCard me={me} />
          </StaggerItem>
        )}
      </Stagger>
    </PageContainer>
  );
}

function LiveSessionBanner() {
  const active = useActiveSessions();
  const session = active.data?.[0];
  return (
    <AnimatePresence>
      {session && (
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12 }}
          className="mb-6"
        >
          <Link
            href={session.canManage || session.myStatus ? `/sessions/${session.id}` : "/attendance"}
            className="group relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-brand-deep p-6 text-white shadow-lift sm:flex-row sm:items-center"
          >
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_120%_at_100%_0%,rgb(45_212_191/0.45),transparent)]" />
            <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <Radio className="size-6" aria-hidden />
            </span>
            <div className="relative min-w-0 flex-1">
              <p className="text-sm text-white/70">Happening now · {session.groupName}</p>
              <p className="truncate text-xl font-semibold tracking-tight">{session.title}</p>
            </div>
            <span className="relative inline-flex h-11 items-center gap-2 self-start rounded-full bg-white px-5 font-medium text-brand-deep transition-transform group-hover:-translate-y-0.5 sm:self-auto">
              {session.canManage ? "Open live session" : session.myStatus ? "You're checked in" : "Check in now"}
              <ArrowRight className="size-4" aria-hidden />
            </span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CardTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm font-medium text-muted">
      <span className="grid size-9 place-items-center rounded-xl bg-surface text-brand">{icon}</span>
      {label}
    </div>
  );
}

function ProfileCard({ me }: { me: Me }) {
  return (
    <Card className="h-full">
      <CardTitle icon={<IdCard className="size-5" />} label="Your profile" />
      <p className="mt-5 text-2xl font-semibold tracking-tight">{me.stateCode}</p>
      <p className="mt-1 truncate text-sm text-muted">{me.email}</p>
      <p className="mt-5 text-xs text-muted">Member since {formatDate(me.createdAt)}</p>
      {me.membership?.status === "approved" && <MonthlyAttendance />}
    </Card>
  );
}

function MonthlyAttendance() {
  const monthly = useMyMonthlyAttendance();
  return (
    <section aria-label="Attendance this month" className="mt-5 border-t border-hairline pt-5">
      {monthly.isPending ? (
        <Skeleton className="h-20" />
      ) : monthly.isError ? (
        <p className="text-sm text-muted">Couldn&apos;t load this month&apos;s attendance.</p>
      ) : (
        <>
          <p className="text-sm font-medium">{formatMonth(monthly.data.month)}</p>
          <MonthlyBoxes
            required={monthly.data.required}
            sessions={monthly.data.sessions}
            marks={monthly.data.marks}
            className="mt-3"
          />
          <MonthlyLegend className="mt-3" />
        </>
      )}
    </section>
  );
}

function PendingApprovalsCard({ groupId }: { groupId: string }) {
  const pending = usePendingCount(groupId);
  return (
    <Link href="/members" className="group block h-full rounded-3xl focus-visible:outline-offset-4">
      <Card className="relative h-full overflow-hidden transition-shadow duration-500 group-hover:shadow-lift">
        <CardTitle icon={<ShieldCheck className="size-5" />} label="Awaiting your approval" />
        {pending.isPending ? (
          <Skeleton className="mt-5 h-10 w-16" />
        ) : pending.isError ? (
          <p className="mt-5 text-sm text-muted">Couldn&apos;t load — open Members to retry.</p>
        ) : (
          <p className="mt-4 text-5xl font-semibold tracking-tight tabular-nums">{pending.data}</p>
        )}
        <p className="mt-2 text-sm text-muted">membership requests</p>
        <ArrowUpRight className="absolute right-6 top-6 size-5 text-ink/30 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
      </Card>
    </Link>
  );
}

function AreaCard({ me }: { me: Me }) {
  const groups = useManagedGroups();
  const areas = me.adminScopes.map((s) => s.areaName ?? "All areas").join(", ");
  return (
    <Link href="/groups" className="group block h-full rounded-3xl">
      <Card className="relative h-full transition-shadow duration-500 group-hover:shadow-lift">
        <CardTitle icon={<Building2 className="size-5" />} label="Your jurisdiction" />
        <p className="mt-5 text-2xl font-semibold tracking-tight">{areas}</p>
        {groups.isPending ? (
          <Skeleton className="mt-3 h-4 w-28" />
        ) : (
          <p className="mt-1 text-sm text-muted">{groups.isError ? "Groups unavailable" : `${groups.data.length} CDS groups`}</p>
        )}
        <ArrowUpRight className="absolute right-6 top-6 size-5 text-ink/30 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
      </Card>
    </Link>
  );
}

/** For executives: how their group is turning out this month. */
function GroupHealthCard() {
  const groups = useManagedGroups();
  const [stats] = useGroupStats(groups.data?.slice(0, 1));
  const loading = groups.isPending || !stats || stats.loading;
  return (
    <Card className="h-full">
      <CardTitle icon={<BarChart3 className="size-5" />} label="Group this month" />
      {loading ? (
        <Skeleton className="mt-5 h-20" />
      ) : stats.error ? (
        <p className="mt-5 text-sm text-muted">Couldn&apos;t load your group&apos;s numbers.</p>
      ) : (
        <>
          <p className="mt-4 text-5xl font-semibold tracking-tight tabular-nums">
            {stats.rate === null ? "—" : `${stats.rate}%`}
          </p>
          <p className="mt-1 text-sm text-muted">
            {stats.rate === null ? "No meetings marked yet" : `attendance · ${rateBand(stats.rate).label.toLowerCase()}`}
          </p>
          <RateMeter rate={stats.rate} className="mt-4 [&>span]:hidden" />
          <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
            {[
              ["Members", stats.approved ?? 0],
              ["Meetings", stats.sessionsThisMonth ?? 0],
              ["Absences", stats.absent],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-canvas py-2">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="text-lg font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {stats.atRisk > 0 && (
            <p className="mt-4 flex items-center gap-1.5 text-sm text-amber-700">
              <AlertTriangle className="size-4" aria-hidden /> {stats.atRisk} member{stats.atRisk === 1 ? " has" : "s have"} missed 2+ meetings
            </p>
          )}
        </>
      )}
    </Card>
  );
}
