"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AccountState, AdminUpdateUser, AdminUser, Page, UserProfile } from "@/types/api";

/** A member's profile, approval and attendance (for whoever manages their group). */
export function useUserProfile(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: async () => (await api.get<UserProfile>(`/users/${id}`)).data,
  });
}

/** Super admin: every account, including soft-deleted ones. */
export function useAdminUsers(params: { q: string; state: AccountState; page: number }, enabled = true) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: async () =>
      (
        await api.get<Page<AdminUser>>("/users", {
          params: { q: params.q || undefined, state: params.state, page: params.page, pageSize: 20 },
        })
      ).data,
    placeholderData: keepPreviousData,
    enabled,
  });
}

function useRefreshPeople() {
  const qc = useQueryClient();
  return (profile?: UserProfile) => {
    if (profile) qc.setQueryData(["user", profile.id], profile);
    void qc.invalidateQueries({ queryKey: ["users"] });
    void qc.invalidateQueries({ queryKey: ["memberships"] });
    void qc.invalidateQueries({ queryKey: ["attendance"] });
    void qc.invalidateQueries({ queryKey: ["roster"] });
  };
}

/** Soft delete (area LGI / super admin): kept in the database, hidden everywhere. */
export function useDeleteUser() {
  const qc = useQueryClient();
  const refresh = useRefreshPeople();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: ["user", id] });
      refresh();
    },
  });
}

/** Super admin: correct anyone's name, email, state code or phone. */
export function useUpdateUser(id: string) {
  const refresh = useRefreshPeople();
  return useMutation({
    mutationFn: async (body: AdminUpdateUser) => (await api.patch<UserProfile>(`/users/${id}`, body)).data,
    // The edit dialog shows its own errors.
    meta: { silentError: true },
    onSuccess: (profile) => refresh(profile),
  });
}

/** Super admin: reactivate a soft-deleted account (and the membership the deletion revoked). */
export function useRestoreUser() {
  const refresh = useRefreshPeople();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<UserProfile>(`/users/${id}/restore`)).data,
    onSuccess: (profile) => refresh(profile),
  });
}
