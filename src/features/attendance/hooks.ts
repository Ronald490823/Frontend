"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AttendanceRecord, AttendanceStatus, CheckInResult, Correction, MyAttendanceItem, Page } from "@/types/api";

export interface CheckInInput {
  payload: string;
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CheckInInput) => (await api.post<CheckInResult>("/attendance/checkin", input)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["attendance", "me"] });
      void qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    // The scanner owns all check-in feedback (including location prompts).
    meta: { silentError: true },
  });
}

export interface LocationCheckInInput {
  latitude: number;
  longitude: number;
  accuracyM?: number;
}

/** GPS self check-in (no QR). The server finds the member's active session and verifies location. */
export function useLocationCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LocationCheckInInput) => (await api.post<CheckInResult>("/attendance/checkin/location", input)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["attendance", "me"] });
      void qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    // The check-in panel owns all feedback (location prompts, out-of-bounds, etc.).
    meta: { silentError: true },
  });
}

export function useMyAttendance(page: number) {
  return useQuery({
    queryKey: ["attendance", "me", page],
    placeholderData: keepPreviousData,
    queryFn: async () => (await api.get<Page<MyAttendanceItem>>("/attendance/me", { params: { page, pageSize: 20 } })).data,
  });
}

export function useRecordAttendance(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; status: AttendanceStatus; reason: string }) =>
      (await api.post<AttendanceRecord>(`/sessions/${sessionId}/attendance/manual`, input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roster", sessionId] }),
  });
}

export function useCorrections(attendanceId: string | null) {
  return useQuery({
    queryKey: ["corrections", attendanceId],
    enabled: !!attendanceId,
    queryFn: async () => (await api.get<Correction[]>(`/attendance/${attendanceId}/corrections`)).data,
  });
}
