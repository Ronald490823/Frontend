"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, resetClientSecurityState } from "@/lib/api-client";
import type { LoginValues, ProfileValues, RegisterValues } from "@/lib/validators";
import type { Me, PublicGroup } from "@/types/api";

export const ME_KEY = ["me"] as const;

export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: async () => (await api.get<Me>("/users/me")).data,
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: LoginValues) => (await api.post<Me>("/auth/login", values)).data,
    onSuccess: (me) => qc.setQueryData(ME_KEY, me),
    // The form shows credential errors inline.
    meta: { silentError: true },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: RegisterValues) => {
      const payload = {
        fullName: values.fullName,
        email: values.email,
        stateCode: values.stateCode,
        groupId: values.groupId,
        phone: values.phone || null,
        password: values.password,
        consent: values.consent,
      };
      return (await api.post<Me>("/auth/register", payload)).data;
    },
    onSuccess: (me) => qc.setQueryData(ME_KEY, me),
    meta: { silentError: true },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout");
    },
    onSettled: () => {
      resetClientSecurityState();
      qc.clear();
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: ProfileValues) =>
      (await api.patch<Me>("/users/me", { fullName: values.fullName, phone: values.phone || null })).data,
    onSuccess: (me) => qc.setQueryData(ME_KEY, me),
  });
}

export function usePublicGroups() {
  return useQuery({
    queryKey: ["groups", "public"],
    queryFn: async () => (await api.get<PublicGroup[]>("/groups/public")).data,
    staleTime: 5 * 60_000,
  });
}

export function useReapply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => (await api.post("/memberships", { groupId })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ME_KEY }),
    // The page shows a loading toast and resolves it with the outcome.
    meta: { silentError: true },
  });
}
