"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  AttendanceRecord,
  AttendanceStatus,
  CheckInResult,
  Correction,
  GroupMonthlyAttendance,
  MyAttendanceItem,
  MyMonthlyAttendance,
  Page,
} from "@/types/api";

export interface CheckInInput {
  payload: string;
  latitude?: number;
  longitude?: number;
  accuracyM?: number;
}

// The API rejects accuracyM above 10 km with "Some fields are invalid". Desktops and
// Wi-Fi/IP-based fixes often report far more than that, and the server only credits the
// first 50 m anyway, so clamp instead of failing the whole check-in.
const MAX_ACCURACY_M = 10_000;
function clampAccuracy(accuracyM?: number) {
  return accuracyM == null || !Number.isFinite(accuracyM) ? undefined : Math.min(Math.max(accuracyM, 0), MAX_ACCURACY_M);
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CheckInInput) => (await api.post<CheckInResult>("/attendance/checkin", { ...input, accuracyM: clampAccuracy(input.accuracyM) })).data,
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
    mutationFn: async (input: LocationCheckInInput) => (await api.post<CheckInResult>("/attendance/checkin/location", { ...input, accuracyM: clampAccuracy(input.accuracyM) }))
        .data,
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

/** The caller's four boxes for the current month. Lives under ["attendance", "me"] so check-ins refresh it. */
export function useMyMonthlyAttendance(enabled = true) {
  return useQuery({
    queryKey: ["attendance", "me", "monthly"],
    enabled,
    queryFn: async () => (await api.get<MyMonthlyAttendance>("/attendance/me/monthly")).data,
  });
}

/** Every member's boxes for the current month. The API limits this to people who manage the group. */
export function useGroupMonthlyAttendance(groupId: string | null) {
  return useQuery({
    queryKey: ["attendance", "monthly", groupId],
    enabled: !!groupId,
    queryFn: async () => (await api.get<GroupMonthlyAttendance>(`/groups/${groupId}/attendance/monthly`)).data,
  });
}

export function useRecordAttendance(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; status: AttendanceStatus; reason: string }) =>
      (await api.post<AttendanceRecord>(`/sessions/${sessionId}/attendance/manual`, input)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["attendance"] });
      return qc.invalidateQueries({ queryKey: ["roster", sessionId] });
    },
  });
}

export function useCorrections(attendanceId: string | null) {
  return useQuery({
    queryKey: ["corrections", attendanceId],
    enabled: !!attendanceId,
    queryFn: async () => (await api.get<Correction[]>(`/attendance/${attendanceId}/corrections`)).data,
  });
}
