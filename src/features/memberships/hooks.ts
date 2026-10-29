"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Membership, MembershipRole, MembershipStatus, Page } from "@/types/api";

export interface MembershipFilters {
  groupId: string;
  status: MembershipStatus;
  q?: string;
  page: number;
}

const key = (f: MembershipFilters) => ["memberships", f.groupId, f.status, f.q ?? "", f.page] as const;

export function useGroupMemberships(filters: MembershipFilters | null) {
  return useQuery({
    queryKey: filters ? key(filters) : ["memberships", "none"],
    enabled: !!filters,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const f = filters!;
      const { data } = await api.get<Page<Membership>>(`/groups/${f.groupId}/memberships`, {
        params: { status: f.status, q: f.q || undefined, page: f.page, pageSize: 20 },
      });
      return data;
    },
  });
}

export function usePendingCount(groupId: string | undefined) {
  return useQuery({
    queryKey: ["memberships", groupId, "pending-count"],
    enabled: !!groupId,
    queryFn: async () =>
      (await api.get<Page<Membership>>(`/groups/${groupId}/memberships`, { params: { status: "pending", pageSize: 1 } }))
        .data.total,
  });
}

function useInvalidateMemberships() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["memberships"] });
}

export function useApproveMembership() {
  const invalidate = useInvalidateMemberships();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<Membership>(`/memberships/${id}/approve`)).data,
    onSuccess: invalidate,
  });
}

export function useRejectMembership() {
  const invalidate = useInvalidateMemberships();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) =>
      (await api.post<Membership>(`/memberships/${id}/reject`, { reason })).data,
    onSuccess: invalidate,
  });
}

export function useChangeRole() {
  const invalidate = useInvalidateMemberships();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: MembershipRole }) =>
      (await api.post<Membership>(`/memberships/${id}/role`, { role })).data,
    onSuccess: invalidate,
  });
}
