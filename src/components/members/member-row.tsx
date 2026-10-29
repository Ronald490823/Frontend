"use client";

import { motion } from "framer-motion";
import { Check, Crown, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { useApproveMembership, useChangeRole } from "@/features/memberships/hooks";
import { formatRelative, initials } from "@/lib/formatters";
import type { Membership } from "@/types/api";

interface Props {
  membership: Membership;
  canChangeRoles: boolean;
  isSelf: boolean;
  onReject: (m: Membership) => void;
}

export function MemberRow({ membership: m, canChangeRoles, isSelf, onReject }: Props) {
  const approve = useApproveMembership();
  const changeRole = useChangeRole();

  async function onApprove() {
    await approve.mutateAsync(m.id);
    toast.success(`${m.fullName} approved`);
  }

  async function onToggleRole() {
    const role = m.role === "executive" ? "member" : "executive";
    await changeRole.mutateAsync({ id: m.id, role });
    toast.success(role === "executive" ? `${m.fullName} is now an executive` : `${m.fullName} is no longer an executive`);
  }

  const busy = approve.isPending || changeRole.isPending;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
      className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-sm font-semibold text-brand-deep">
          {initials(m.fullName)}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-medium">
            {m.fullName}
            {m.role === "executive" && <Badge tone="info">Executive</Badge>}
          </p>
          <p className="truncate text-sm text-muted">
            {m.stateCode} · {m.email}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted sm:w-28 sm:text-right">{formatRelative(m.decidedAt ?? m.createdAt)}</p>

      {m.status === "pending" && (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => onReject(m)} disabled={busy}>
            <X className="size-4" aria-hidden /> Decline
          </Button>
          <Button size="sm" onClick={onApprove} loading={approve.isPending} loadingLabel="Approving…" disabled={busy}>
            {!approve.isPending && <Check className="size-4" aria-hidden />} Approve
          </Button>
        </div>
      )}
      {m.status === "approved" && canChangeRoles && !isSelf && (
        <Button size="sm" variant="secondary" onClick={onToggleRole} loading={changeRole.isPending} loadingLabel="Updating role…">
          {!changeRole.isPending && <Crown className="size-4" aria-hidden />}
          {m.role === "executive" ? "Remove executive" : "Make executive"}
        </Button>
      )}
      {m.status === "rejected" && m.decisionReason && (
        <p className="max-w-xs text-sm text-muted sm:text-right">“{m.decisionReason}”</p>
      )}
    </motion.li>
  );
}
