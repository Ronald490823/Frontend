"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Activity, Page } from "@/types/api";

/** Executive and admin actions, newest first, scoped by the server to what the caller may see. */
export function useActivity(filters: { actorId?: string; groupId?: string; page?: number }, enabled = true) {
  return useQuery({
    queryKey: ["activity", filters],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (await api.get<Page<Activity>>("/audit", { params: { pageSize: 15, ...filters } })).data,
  });
}
