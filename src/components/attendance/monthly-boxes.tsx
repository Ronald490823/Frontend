import { Check, Minus, X } from "lucide-react";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { MonthlyMark, MonthlySession } from "@/types/api";

const MARKS: Record<MonthlyMark, { label: string; box: string; icon?: typeof Check }> = {
  attended: { label: "Showed up", box: "bg-emerald-600 text-white ring-emerald-600", icon: Check },
  absent: { label: "Didn't show up", box: "bg-rose-600 text-white ring-rose-600", icon: X },
  excused: { label: "Excused", box: "bg-yellow-400 text-ink ring-yellow-400", icon: Minus },
  pending: { label: "Not marked yet", box: "bg-white ring-hairline" },
  exempt: { label: "Before joining", box: "bg-ink/[0.06] ring-hairline" },
};

/** "2026-11" → "November 2026". Parsed as parts so no time zone can shift it into another month. */
export function formatMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric" }).format(new Date(year!, m! - 1, 1));
}

interface Props {
  required: number;
  sessions: MonthlySession[];
  /** Aligned with `sessions`. */
  marks: MonthlyMark[];
  size?: "sm" | "md";
  className?: string;
}

/**
 * One box per meeting day: at least `required` (the month's target), more when the group met more often.
 * Read-only: marks come from attendance records, which executives correct from the session page.
 */
export function MonthlyBoxes({ required, sessions, marks, size = "md", className }: Props) {
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {Array.from({ length: Math.max(required, sessions.length) }, (_, i) => {
        const session = sessions[i];
        const mark = MARKS[marks[i] ?? "pending"];
        const Icon = mark.icon;
        const label = session
          ? `Meeting ${i + 1}, ${session.title}, ${formatDate(session.scheduledStart, { day: "numeric", month: "short" })}: ${mark.label}`
          : `Meeting ${i + 1}: not scheduled yet`;
        return (
          <li
            key={i}
            role="img"
            aria-label={label}
            title={label}
            className={cn(
              "grid place-items-center rounded-lg ring-1 ring-inset",
              size === "sm" ? "size-6" : "size-9",
              mark.box,
            )}
          >
            {Icon && <Icon className={size === "sm" ? "size-3.5" : "size-5"} strokeWidth={3} aria-hidden />}
          </li>
        );
      })}
    </ul>
  );
}

export function MonthlyLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted", className)}>
      {(["attended", "absent", "excused"] as const).map((key) => (
        <li key={key} className="flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2.5 rounded-sm", MARKS[key].box)} />
          {MARKS[key].label}
        </li>
      ))}
    </ul>
  );
}
