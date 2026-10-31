"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AppNotification, Page } from "@/types/api";

/** Badge count, polled lightly so members notice when attendance opens. */
export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: ["notifications", "unread"],
    enabled,
    queryFn: async () => (await api.get<{ count: number }>("/notifications/unread-count")).data.count,
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
  });
}

/** The inbox list, fetched only while the panel is open. */
export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ["notifications", "list"],
    enabled,
    queryFn: async () => (await api.get<Page<AppNotification>>("/notifications", { params: { pageSize: 20 } })).data,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<{ count: number }>("/notifications/mark-read")).data,
    onSuccess: () => {
      qc.setQueryData(["notifications", "unread"], 0);
      void qc.invalidateQueries({ queryKey: ["notifications", "list"] });
    },
  });
}
