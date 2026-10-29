"use client";

import { motion } from "framer-motion";
import { Hourglass, LogOut, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { SelectField } from "@/components/ui/field";
import { FullPageLoader } from "@/components/ui/loader";
import { useLogout, useMe, usePublicGroups, useReapply } from "@/features/auth/hooks";
import { toApiError } from "@/lib/api-errors";

export default function PendingApprovalPage() {
  const router = useRouter();
  // Gentle polling so the page advances by itself once an executive approves.
  const me = useMe();
  const logout = useLogout();

  useEffect(() => {
    if (me.data?.accountStatus === "approved") {
      toast.success("You've been approved. Welcome aboard!");
      router.replace("/dashboard");
    }
  }, [me.data?.accountStatus, router]);

  const status = me.data?.accountStatus;
  const { refetch } = me;
  useEffect(() => {
    if (status !== "pending") return;
    const id = setInterval(() => void refetch(), 30_000);
    return () => clearInterval(id);
  }, [status, refetch]);

  useEffect(() => {
    if (me.isError && toApiError(me.error).status === 401) router.replace("/login");
  }, [me.isError, me.error, router]);

  if (me.isPending || me.data?.accountStatus === "approved") return <FullPageLoader label="Checking your status…" />;
  if (me.isError) {
    return toApiError(me.error).status === 401 ? <FullPageLoader /> : <ErrorState error={me.error} onRetry={() => me.refetch()} retrying={me.isFetching} />;
  }

  const user = me.data;
  const rejected = user.accountStatus === "rejected" || user.membership?.status === "rejected";

  async function signOut() {
    await logout.mutateAsync().catch(() => undefined);
    router.replace("/login");
  }

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
        className="relative mx-auto mb-8 grid size-24 place-items-center"
      >
        {!rejected && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-accent/30"
            animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <span className={`relative grid size-24 place-items-center rounded-full ${rejected ? "bg-rose-50 text-rose-600" : "bg-surface text-brand"}`}>
          {rejected ? <XCircle className="size-10" aria-hidden /> : <Hourglass className="size-10" aria-hidden />}
        </span>
      </motion.div>

      {rejected ? (
        <RejectedView reason={user.membership?.decisionReason ?? null} />
      ) : (
        <>
          <h1 className="text-3xl font-semibold tracking-[-0.03em]">You&apos;re on the list.</h1>
          <p className="mt-3 text-muted">
            {user.membership
              ? <>Your request to join <strong className="font-medium text-ink">{user.membership.groupName}</strong> is waiting for your CDS executive.</>
              : "Your account is waiting for approval."}{" "}
            This page updates by itself.
          </p>
          <div className="mt-8 rounded-3xl bg-white p-5 text-left shadow-soft ring-1 ring-hairline">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
              <dt className="text-muted">Name</dt>
              <dd className="font-medium">{user.fullName}</dd>
              <dt className="text-muted">State code</dt>
              <dd className="font-medium">{user.stateCode}</dd>
              <dt className="text-muted">Status</dt>
              <dd><Badge tone="warning">Pending approval</Badge></dd>
            </dl>
          </div>
        </>
      )}

      <Button variant="ghost" className="mt-8" onClick={signOut} loading={logout.isPending} loadingLabel="Signing out…">
        {!logout.isPending && <LogOut className="size-4" aria-hidden />}
        Sign out
      </Button>
    </div>
  );
}

function RejectedView({ reason }: { reason: string | null }) {
  const groups = usePublicGroups();
  const reapply = useReapply();
  const [groupId, setGroupId] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId) return;
    const id = toast.loading("Sending your request…");
    try {
      await reapply.mutateAsync(groupId);
      toast.success("Request sent. Your new executive will review it.", { id });
    } catch (error) {
      toast.error(toApiError(error).message, { id });
    }
  }

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">Request not approved</h1>
      {reason && (
        <p className="mt-3 rounded-2xl bg-white p-4 text-sm text-ink/80 ring-1 ring-hairline">
          <span className="text-muted">Reason: </span>
          {reason}
        </p>
      )}
      <form onSubmit={submit} className="mt-8 space-y-4 text-left">
        <SelectField label="Request a different CDS group" value={groupId} onChange={(e) => setGroupId(e.target.value)} disabled={groups.isPending}>
          <option value="">{groups.isPending ? "Loading groups…" : "Choose a group"}</option>
          {groups.data?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} — {g.areaName}
            </option>
          ))}
        </SelectField>
        <Button type="submit" className="w-full" disabled={!groupId} loading={reapply.isPending} loadingLabel="Sending…">
          Send new request
        </Button>
      </form>
    </>
  );
}
