"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextAreaField } from "@/components/ui/field";
import { useRejectMembership } from "@/features/memberships/hooks";
import { rejectSchema, type RejectValues } from "@/lib/validators";
import type { Membership } from "@/types/api";

export function RejectDialog({ membership, onClose }: { membership: Membership | null; onClose: () => void }) {
  const reject = useRejectMembership();
  const form = useForm<RejectValues>({ resolver: zodResolver(rejectSchema), defaultValues: { reason: "" } });

  useEffect(() => {
    if (membership) form.reset({ reason: "" });
  }, [membership, form]);

  const onSubmit = form.handleSubmit(async ({ reason }) => {
    if (!membership) return;
    await reject.mutateAsync({ id: membership.id, reason });
    toast.success(`Request from ${membership.fullName} declined`);
    onClose();
  });

  return (
    <Dialog
      open={!!membership}
      onClose={onClose}
      locked={reject.isPending}
      title="Decline membership request"
      description={membership ? `${membership.fullName} (${membership.stateCode}) will see this reason.` : undefined}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <TextAreaField
          label="Reason"
          placeholder="e.g. Not posted to this local government area"
          error={form.formState.errors.reason?.message}
          {...form.register("reason")}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={reject.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={reject.isPending} loadingLabel="Declining…">
            Decline request
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
