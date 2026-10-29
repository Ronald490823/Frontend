"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { setSessionExpiredHandler } from "@/lib/api-client";
import { toApiError } from "@/lib/api-errors";
import { ME_KEY } from "@/features/auth/hooks";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** Skip the global error toast (the component shows its own feedback). */
      silentError?: boolean;
    };
  }
}

function makeQueryClient() {
  return new QueryClient({
    // Queries render their own inline error states; no global toast for them.
    queryCache: new QueryCache(),
    // One predictable strategy for mutations: a single toast here, unless the form shows
    // field-level errors or the mutation opted out.
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        const apiError = toApiError(error);
        if (mutation.meta?.silentError || apiError.hasFieldErrors || apiError.code === "SESSION_EXPIRED") return;
        toast.error(apiError.message, { id: `mutation-error-${apiError.code}` });
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: (count, error) => {
          const e = toApiError(error);
          return count < 2 && (e.status === 0 || e.status >= 500);
        },
      },
      mutations: { retry: false },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const router = useRouter();

  useEffect(() => {
    setSessionExpiredHandler(() => {
      // Only announce expiry for someone who was signed in.
      const wasSignedIn = !!queryClient.getQueryData(ME_KEY);
      queryClient.clear();
      if (wasSignedIn) {
        toast.warning("Your session has expired. Please sign in again.", { id: "session-expired" });
        router.replace("/login");
      }
    });
    return () => setSessionExpiredHandler(null);
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 380, damping: 32 }}>
        {children}
      </MotionConfig>
      <Toaster
        position="top-right"
        richColors
        closeButton
        offset={16}
        toastOptions={{ className: "font-sans !rounded-2xl !shadow-[var(--shadow-soft)]" }}
      />
    </QueryClientProvider>
  );
}
