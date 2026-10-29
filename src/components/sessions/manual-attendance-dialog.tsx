"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextAreaField } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useRecordAttendance } from "@/features/attendance/hooks";
import { manualAttendanceSchema, type ManualAttendanceValues } from "@/lib/validators";
import type { RosterEntry } from "@/types/api";
import { ATTENDANCE_LABEL } from "./status";

const OPTIONS = (["present", "late", "excused", "absent"] as const).map((v) => ({ value: v, label: ATTENDANCE_LABEL[v] }));

export function ManualAttendanceDialog({ sessionId, entry, onClose }: { sessionId: string; entry: RosterEntry | null; onClose: () => void }) {
  const record = useRecordAttendance(sessionId);
  const form = useForm<ManualAttendanceValues>({
    resolver: zodResolver(manualAttendanceSchema),
    defaultValues: { status: "present", reason: "" },
  });

  useEffect(() => {
    if (entry) form.reset({ status: entry.attendance?.status === "present" ? "late" : "present", reason: "" });
  }, [entry, form]);

  const onSubmit = form.handleSubmit(async (v) => {
    if (!entry) return;
    await record.mutateAsync({ userId: entry.userId, ...v });
    toast.success(`${entry.fullName} marked ${ATTENDANCE_LABEL[v.status].toLowerCase()}`);
    onClose();
  });

  const current = entry?.attendance?.status;
  return (
    <Dialog
      open={!!entry}
      onClose={onClose}
      locked={record.isPending}
      title={current ? "Change attendance" : "Record attendance"}
      description={
        entry
          ? `${entry.fullName} · ${entry.stateCode}${current ? ` — currently ${ATTENDANCE_LABEL[current].toLowerCase()}` : ""}. The change and your reason are kept in the record's history.`
          : undefined
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => <Segmented label="Attendance status" value={field.value} onChange={field.onChange} options={OPTIONS} />}
        />
        <TextAreaField
          label="Reason"
          placeholder="e.g. Camera not working — signed the paper register"
          error={form.formState.errors.reason?.message}
          {...form.register("reason")}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={record.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={record.isPending} loadingLabel="Saving…">
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
