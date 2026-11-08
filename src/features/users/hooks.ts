"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { UserProfile } from "@/types/api";

/** A member's profile, approval and attendance (for whoever manages their group). */
export function useUserProfile(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: async () => (await api.get<UserProfile>(`/users/${id}`)).data,
  });
}

/** Soft delete (area LGI / super admin): kept in the database, hidden everywhere. */
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: ["user", id] });
      void qc.invalidateQueries({ queryKey: ["memberships"] });
      void qc.invalidateQueries({ queryKey: ["attendance"] });
      void qc.invalidateQueries({ queryKey: ["roster"] });
    },
  });
}
