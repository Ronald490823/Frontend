"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorState } from "@/components/ui/error-state";
import { FullPageLoader } from "@/components/ui/loader";
import { useMe } from "@/features/auth/hooks";
import { toApiError } from "@/lib/api-errors";
import { isApproved } from "@/lib/permissions";

/** Client-side routing guard. It only decides what to render; the API enforces access. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const unauthenticated = me.isError && toApiError(me.error).status === 401;

  useEffect(() => {
    if (unauthenticated) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (me.data && !isApproved(me.data)) router.replace("/pending-approval");
  }, [unauthenticated, me.data, pathname, router]);

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
