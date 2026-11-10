"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { downloadAttendanceCsv, downloadAttendancePdf } from "@/lib/attendance-export";
import { cn } from "@/lib/utils";
import type { CdsSession, Roster } from "@/types/api";

type Format = "pdf" | "csv";

const FORMATS: { value: Format; label: string; body: string; icon: typeof FileText }[] = [
  { value: "pdf", label: "PDF register", body: "A printable register with a summary and sign-off lines.", icon: FileText },
  { value: "csv", label: "CSV spreadsheet", body: "Raw rows for Excel or Google Sheets.", icon: FileSpreadsheet },
];

/** Asks which format to export the attendance register in, then downloads it. */
export function ExportDialog({
  open,
  onClose,
  session,
  roster,
}: {
  open: boolean;
  onClose: () => void;
  session: CdsSession;
  roster: Roster | undefined;
}) {
  const [busy, setBusy] = useState<Format | null>(null);

  async function run(format: Format) {
    if (!roster) return;
    setBusy(format);
    try {
      if (format === "pdf") await downloadAttendancePdf(session, roster);
      else downloadAttendanceCsv(session, roster);
      toast.success(format === "pdf" ? "PDF downloaded" : "CSV downloaded");
      onClose();
    } catch {
      toast.error(`Couldn't create the ${format.toUpperCase()}. Try again.`);
    } finally {
      setBusy(null);
    }
  }

  const count = roster?.entries.length ?? 0;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      locked={busy !== null}
      title="Export attendance"
      description={`Everyone on the roster (${count} ${count === 1 ? "member" : "members"}), whatever filter is applied.`}
    >
      <div className="space-y-3">
        {FORMATS.map(({ value, label, body, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => void run(value)}
            disabled={busy !== null || !roster}
            className={cn(
              "flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left ring-1 ring-hairline transition",
              "hover:bg-surface hover:ring-brand/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/70",
              "disabled:cursor-not-allowed disabled:opacity-60",
              busy === value && "ring-2 ring-brand/70",
            )}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface text-brand">
              {busy === value ? <Loader size="sm" label={`Creating ${value.toUpperCase()}…`} /> : <Icon className="size-5" aria-hidden />}
            </span>
            <span className="min-w-0">
              <span className="block font-medium">{label}</span>
              <span className="block text-sm text-muted">{body}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Button variant="secondary" onClick={onClose} disabled={busy !== null}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}
