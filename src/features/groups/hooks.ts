"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { GroupValues } from "@/lib/validators";
import type { Area, Group } from "@/types/api";

export function useManagedGroups(enabled = true) {
  return useQuery({
    queryKey: ["groups", "managed"],
    enabled,
    queryFn: async () => (await api.get<Group[]>("/groups")).data,
  });
}

export function useAreas(enabled = true) {
  return useQuery({
    queryKey: ["areas"],
    enabled,
    queryFn: async () => (await api.get<Area[]>("/areas")).data,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: GroupValues) => (await api.post<Group>("/groups", values)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useToggleGroupActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) =>
      (await api.patch<Group>(`/groups/${id}`, { isActive })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}
