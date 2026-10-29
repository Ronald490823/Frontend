"use client";

import { AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Search, UserRoundCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { MemberRow } from "@/components/members/member-row";
import { RejectDialog } from "@/components/members/reject-dialog";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { SelectField } from "@/components/ui/field";
import { Loader } from "@/components/ui/loader";
import { Segmented } from "@/components/ui/segmented";
import { useMe } from "@/features/auth/hooks";
import { useManagedGroups } from "@/features/groups/hooks";
import { useGroupMemberships } from "@/features/memberships/hooks";
import { useDebounced } from "@/hooks/use-debounced";
import { canManageMembers, isAreaAdmin } from "@/lib/permissions";
import type { Membership, MembershipStatus } from "@/types/api";

const TABS: { value: MembershipStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Members" },
  { value: "rejected", label: "Declined" },
];

const EMPTY_COPY: Record<string, { title: string; body: string }> = {
  pending: { title: "You're all caught up", body: "New membership requests for this group will appear here." },
  approved: { title: "No members yet", body: "Approved corps members will be listed here." },
  rejected: { title: "Nothing declined", body: "Requests you decline are kept here for the record." },
};

export default function MembersPage() {
  const { data: me } = useMe();
  const areaAdmin = isAreaAdmin(me);
  const groups = useManagedGroups(areaAdmin);

  const [groupId, setGroupId] = useState<string>("");
  const [status, setStatus] = useState<MembershipStatus>("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<Membership | null>(null);
  const q = useDebounced(search.trim());

  // Executives work on their own group; LGIs pick from groups in their area.
  useEffect(() => {
    if (groupId) return;
    if (!areaAdmin && me?.membership) setGroupId(me.membership.groupId);
    else if (areaAdmin && groups.data?.[0]) setGroupId(groups.data[0].id);
  }, [areaAdmin, me, groups.data, groupId]);

  useEffect(() => setPage(1), [groupId, status, q]);

  const list = useGroupMemberships(groupId ? { groupId, status, q, page } : null);

  if (!canManageMembers(me)) {
    return (
      <PageContainer>
        <EmptyState icon={<UserRoundCheck className="size-6" />} title="Not available" body="Only CDS executives and inspectors manage members." />
      </PageContainer>
    );
  }

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Membership"
        title="Members"
        description="Approve new corps members and keep your group's roster accurate."
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <Segmented label="Membership status" value={status} onChange={setStatus} options={TABS} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {areaAdmin && (
            <div className="sm:w-64">
              <SelectField label="Group" value={groupId} onChange={(e) => setGroupId(e.target.value)} disabled={groups.isPending}>
                {groups.isPending && <option>Loading…</option>}
                {groups.data?.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </SelectField>
            </div>
          )}
          <label className="relative block sm:w-72">
            <span className="sr-only">Search by name or state code</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or state code"
              className="h-12 w-full rounded-2xl bg-white pl-11 pr-4 text-[15px] ring-1 ring-hairline placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-brand/70"
            />
          </label>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {areaAdmin && groups.isError ? (
          <ErrorState error={groups.error} onRetry={() => groups.refetch()} retrying={groups.isFetching} />
        ) : areaAdmin && groups.data?.length === 0 ? (
          <EmptyState icon={<UserRoundCheck className="size-6" />} title="No groups yet" body="Create a CDS group first, then members can register into it." />
        ) : list.isPending ? (
          <ul aria-busy className="divide-y divide-hairline">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="size-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </li>
            ))}
          </ul>
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} retrying={list.isFetching} />
        ) : list.data.items.length === 0 ? (
          <EmptyState
            icon={<UserRoundCheck className="size-6" />}
            title={q ? "No matches" : EMPTY_COPY[status]!.title}
            body={q ? `Nobody matches “${q}”.` : EMPTY_COPY[status]!.body}
          />
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-hairline px-5 py-3 text-sm text-muted">
              <span>
                {list.data.total} {list.data.total === 1 ? "person" : "people"}
              </span>
              {list.isFetching && <Loader size="sm" label="Updating…" />}
            </div>
            <ul className="divide-y divide-hairline">
              <AnimatePresence initial={false} mode="popLayout">
                {list.data.items.map((m) => (
                  <MemberRow
                    key={m.id}
                    membership={m}
                    canChangeRoles={areaAdmin}
                    isSelf={m.userId === me?.id}
                    onReject={setRejecting}
                  />
                ))}
              </AnimatePresence>
            </ul>
            {totalPages > 1 && (
              <nav aria-label="Pagination" className="flex items-center justify-between border-t border-hairline px-5 py-3">
                <Button size="sm" variant="ghost" onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || list.isFetching}>
                  <ChevronLeft className="size-4" aria-hidden /> Previous
                </Button>
                <span className="text-sm text-muted">
                  Page {page} of {totalPages}
                </span>
                <Button size="sm" variant="ghost" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages || list.isFetching}>
                  Next <ChevronRight className="size-4" aria-hidden />
                </Button>
              </nav>
            )}
          </>
        )}
      </Card>

      <RejectDialog membership={rejecting} onClose={() => setRejecting(null)} />
    </PageContainer>
  );
}
