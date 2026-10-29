"use client";

import { ArrowRight } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Loader } from "@/components/ui/loader";
import { useCorrections } from "@/features/attendance/hooks";
import { formatDate } from "@/lib/formatters";
import { AttendanceBadge } from "./status";

export function HistoryDialog({ attendanceId, name, onClose }: { attendanceId: string | null; name: string; onClose: () => void }) {
  const history = useCorrections(attendanceId);
  return (
    <Dialog open={!!attendanceId} onClose={onClose} title="Change history" description={name}>
      {history.isPending ? (
        <div className="grid h-24 place-items-center text-brand">
          <Loader label="Loading history…" showLabel />
        </div>
      ) : history.isError ? (
        <ErrorState error={history.error} onRetry={() => history.refetch()} retrying={history.isFetching} />
      ) : history.data.length === 0 ? (
        <p className="text-sm text-muted">Recorded by QR scan. No manual changes.</p>
      ) : (
        <ol className="relative space-y-5 border-l border-hairline pl-5">
          {history.data.map((h) => (
            <li key={h.id} className="relative">
              <span aria-hidden className="absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full bg-brand ring-4 ring-white" />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {h.previousStatus ? <AttendanceBadge status={h.previousStatus} /> : <span className="text-muted">No record</span>}
                <ArrowRight className="size-3.5 text-muted" aria-label="changed to" />
                <AttendanceBadge status={h.newStatus} />
              </div>
              <p className="mt-1.5 text-sm">“{h.reason}”</p>
              <p className="mt-0.5 text-xs text-muted">
                {h.changedByName} · {formatDate(h.createdAt, { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}
