import { Badge } from "@/components/ui/card";
import type { AttendanceStatus, SessionStatus } from "@/types/api";

const SESSION: Record<SessionStatus, { label: string; tone: "success" | "info" | "neutral" | "warning" | "danger" }> = {
  scheduled: { label: "Scheduled", tone: "info" },
  active: { label: "Live", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
  archived: { label: "Archived", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export function SessionBadge({ status }: { status: SessionStatus }) {
  const s = SESSION[status];
  return (
    <Badge tone={s.tone}>
      {status === "active" && (
        <span className="relative mr-0.5 flex size-1.5" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75 motion-reduce:hidden" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
        </span>
      )}
      {s.label}
    </Badge>
  );
}

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  excused: "Excused",
  absent: "Absent",
};

const ATTENDANCE_TONE: Record<AttendanceStatus, "success" | "warning" | "info" | "danger"> = {
  present: "success",
  late: "warning",
  excused: "info",
  absent: "danger",
};

export function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  return <Badge tone={ATTENDANCE_TONE[status]}>{ATTENDANCE_LABEL[status]}</Badge>;
}
