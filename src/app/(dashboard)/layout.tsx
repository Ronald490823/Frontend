"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/ui/error-state";
import { FullPageLoader } from "@/components/ui/loader";
import { useMe } from "@/features/auth/hooks";
import { toApiError } from "@/lib/api-errors";
import { isApproved } from "@/lib/permissions";

// A brief Wi-Fi hand-off fires "offline" for a moment; only act if it lasts.
const OFFLINE_GRACE_MS = 3_000;

/** Sends the user to the landing page when the connection drops (device offline, or the API unreachable). */
function useRedirectOnNetworkLoss() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Warm the landing page so the client-side navigation still works without a network.
    router.prefetch("/");

    let left = false;
    const leave = () => {
      if (left) return;
      left = true;
      toast.error("Connection lost. Reconnect, then sign back in to continue.", { id: "network-lost" });
      router.replace("/");
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onOffline = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!navigator.onLine) leave();
      }, OFFLINE_GRACE_MS);
    };
    const onOnline = () => clearTimeout(timer);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    // Final failures only: queries have already used their retries by the time they error.
    const isNetworkError = (error: unknown) => toApiError(error).code === "NETWORK_ERROR";
    const unsubQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error" && isNetworkError(event.action.error)) leave();
    });
    const unsubMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === "updated" && event.action.type === "error" && isNetworkError(event.action.error)) leave();
    });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      unsubQueries();
      unsubMutations();
    };
  }, [router, queryClient]);
}

/** Client-side routing guard. It only decides what to render; the API enforces access. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const unauthenticated = me.isError && toApiError(me.error).status === 401;
  useRedirectOnNetworkLoss();

  useEffect(() => {
    if (unauthenticated) router.replace("/");
    else if (me.data && !isApproved(me.data)) router.replace("/pending-approval");
  }, [unauthenticated, me.data, router]);

  if (me.isPending || unauthenticated || (me.data && !isApproved(me.data))) {
    return <FullPageLoader label="Loading your workspace…" />;
  }
  if (me.isError) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <ErrorState error={me.error} onRetry={() => me.refetch()} retrying={me.isFetching} />
      </div>
    );
  }
  return <AppShell me={me.data}>{children}</AppShell>;
}
