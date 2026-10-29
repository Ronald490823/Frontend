"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Building2, IdCard, Radio, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useActiveSessions } from "@/features/sessions/hooks";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Badge, Card, Skeleton } from "@/components/ui/card";
import { useMe } from "@/features/auth/hooks";
import { useManagedGroups } from "@/features/groups/hooks";
import { usePendingCount } from "@/features/memberships/hooks";
import { formatDate, greeting } from "@/lib/formatters";
import { isAreaAdmin, isExecutive, primaryRoleLabel } from "@/lib/permissions";
import type { Me } from "@/types/api";

export default function DashboardPage() {
  const { data: me } = useMe();
  if (!me) return null; // layout guarantees data

  return (
    <PageContainer>
      <PageHeader eyebrow={greeting()} title={`Hello, ${me.fullName.split(" ")[0]}.`} description={primaryRoleLabel(me)} />
      <LiveSessionBanner />
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
    </Card>
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
