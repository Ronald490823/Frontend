"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Challenge, CdsSession, Page, Roster, SessionStatus } from "@/types/api";

export interface SessionInput {
  groupId: string;
  title: string;
  description?: string | null;
  venue?: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  lateAfterMinutes: number;
  latitude?: number | null;
  longitude?: number | null;
  radiusM?: number | null;
}

export function useSessions(filters: { status?: SessionStatus; page?: number; groupId?: string } = {}) {
  return useQuery({
    queryKey: ["sessions", filters],
    placeholderData: keepPreviousData,
    // Sessions start automatically at their scheduled time; keep the list current.
    refetchInterval: 30_000,
    queryFn: async () =>
      (await api.get<Page<CdsSession>>("/sessions", { params: { pageSize: 20, ...filters } })).data,
  });
}

/** The live session for the caller's group(s), polled lightly so dashboards notice a start. */
export function useActiveSessions() {
  return useQuery({
    queryKey: ["sessions", { status: "active" }],
    queryFn: async () => (await api.get<Page<CdsSession>>("/sessions", { params: { status: "active", pageSize: 5 } })).data.items,
    refetchInterval: 30_000,
  });
}

export function useSession(id: string) {
  return useQuery({
    queryKey: ["session", id],
    queryFn: async () => (await api.get<CdsSession>(`/sessions/${id}`)).data,
    // A scheduled session flips to live by itself at its start time (the server starts it
    // when it is next read), so poll while waiting; live sessions may be closed elsewhere.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "scheduled" ? 15_000 : status === "active" ? 30_000 : false;
    },
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SessionInput) => (await api.post<CdsSession>("/sessions", input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
}

export type SessionAction = "start" | "close" | "archive" | "cancel";

export function useSessionAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (action: SessionAction) => (await api.post<CdsSession>(`/sessions/${id}/${action}`)).data,
    onSuccess: (session) => {
      qc.setQueryData(["session", id], session);
      void qc.invalidateQueries({ queryKey: ["sessions"] });
      void qc.invalidateQueries({ queryKey: ["roster", id] });
    },
  });
}

export function useIssueChallenge(id: string) {
  return useMutation({
    mutationFn: async () => (await api.post<Challenge>(`/sessions/${id}/challenges`)).data,
    // The QR panel shows its own error state; no toast every 15 seconds.
    meta: { silentError: true },
  });
}

export function useRoster(id: string, { enabled, live }: { enabled: boolean; live: boolean }) {
  return useQuery({
    queryKey: ["roster", id],
    enabled,
    queryFn: async () => (await api.get<Roster>(`/sessions/${id}/attendance`)).data,
    // Live sessions refresh the roster so executives see check-ins arrive.
    refetchInterval: live ? 5_000 : false,
    refetchIntervalInBackground: false,
  });
}
