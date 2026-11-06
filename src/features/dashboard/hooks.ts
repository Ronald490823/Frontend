"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CdsSession, Group, GroupMonthlyAttendance, Membership, Page } from "@/types/api";

export interface GroupStats {
  group: Group;
  loading: boolean;
  error: boolean;
  approved: number | null;
  pending: number | null;
  /** Meetings this month that have been held or are live (scheduled ones excluded). */
  sessionsThisMonth: number | null;
  /** Marked boxes this month: attended / (attended + absent + excused). Null until anything is marked. */
  rate: number | null;
  attended: number;
  absent: number;
  excused: number;
  /** Members who have already missed two or more of this month's meetings. */
  atRisk: number;
}

const countMemberships = async (groupId: string, status: "approved" | "pending") =>
  (await api.get<Page<Membership>>(`/groups/${groupId}/memberships`, { params: { status, pageSize: 1 } })).data.total;

/**
 * Per-group health for everything the caller manages. There's no aggregate reports endpoint yet,
 * so this fans out three small reads per group; React Query dedupes and caches them.
 */
export function useGroupStats(groups: Group[] | undefined): GroupStats[] {
  const list = groups ?? [];
  const results = useQueries({
    queries: list.flatMap((g) => [
      { queryKey: ["memberships", g.id, "approved-count"], queryFn: () => countMemberships(g.id, "approved"), staleTime: 60_000 },
      { queryKey: ["memberships", g.id, "pending-count"], queryFn: () => countMemberships(g.id, "pending"), staleTime: 30_000 },
      {
        queryKey: ["attendance", "monthly", g.id],
        queryFn: async () => (await api.get<GroupMonthlyAttendance>(`/groups/${g.id}/attendance/monthly`)).data,
        staleTime: 60_000,
      },
    ]),
  });

  return list.map((group, i) => {
    const [approvedQ, pendingQ, monthlyQ] = results.slice(i * 3, i * 3 + 3);
    const monthly = monthlyQ?.data as GroupMonthlyAttendance | undefined;
    let attended = 0;
    let absent = 0;
    let excused = 0;
    let atRisk = 0;
    for (const m of monthly?.members ?? []) {
      let missed = 0;
      for (const mark of m.marks) {
        if (mark === "attended") attended++;
        else if (mark === "absent") {
          absent++;
          missed++;
        }
        else if (mark === "excused") excused++;
      }
      if (missed >= 2) atRisk++;
    }
    const marked = attended + absent + excused;
    return {
      group,
      loading: !!(approvedQ?.isPending || pendingQ?.isPending || monthlyQ?.isPending),
      error: !!(approvedQ?.isError || pendingQ?.isError || monthlyQ?.isError),
      approved: (approvedQ?.data as number | undefined) ?? null,
      pending: (pendingQ?.data as number | undefined) ?? null,
      sessionsThisMonth: monthly ? monthly.sessions.filter((s) => new Date(s.scheduledStart).getTime() <= Date.now()).length : null,
      rate: marked ? Math.round((attended / marked) * 100) : null,
      attended,
      absent,
      excused,
      atRisk,
    };
  });
}

/** Recent sessions across every managed group (newest first), for the overview's session lists. */
export function useRecentSessions() {
  return useQuery({
    queryKey: ["sessions", "overview"],
    refetchInterval: 30_000,
    queryFn: async () => (await api.get<Page<CdsSession>>("/sessions", { params: { pageSize: 100 } })).data,
  });
}
