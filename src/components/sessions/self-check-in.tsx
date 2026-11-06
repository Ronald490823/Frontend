"use client";

import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MapPin, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AttendanceBadge } from "@/components/sessions/status";
import { Button } from "@/components/ui/button";
import { useCheckIn } from "@/features/attendance/hooks";
import { useIssueChallenge } from "@/features/sessions/hooks";
import { toApiError } from "@/lib/api-errors";
import { formatTime } from "@/lib/formatters";
import type { AttendanceRecord, AttendanceStatus } from "@/types/api";

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 })
      : reject(new Error("unsupported")),
  );
}

/**
 * Lets the executive running a live session check *themselves* in. They can't scan the code on
 * their own screen, so this mints a fresh challenge and submits it directly — the same signed,
 * single-session code members scan, plus GPS when the session has a geofence. Every server check
 * (group, session state, location) still applies.
 */
export function SelfCheckIn({
  sessionId,
  requiresLocation,
  myRecord,
}: {
  sessionId: string;
  requiresLocation: boolean;
  /** The caller's own roster record, if any (undefined while the roster loads). */
  myRecord: AttendanceRecord | null | undefined;
}) {
  const qc = useQueryClient();
  const issue = useIssueChallenge(sessionId);
  const checkIn = useCheckIn();
  const [step, setStep] = useState<"idle" | "locating" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ status: AttendanceStatus; at: string } | null>(null);

  const record = done ?? (myRecord ? { status: myRecord.status, at: myRecord.checkedInAt } : null);

  async function run() {
    setError(null);
    let coords: { latitude: number; longitude: number; accuracyM: number } | undefined;
    if (requiresLocation) {
      setStep("locating");
      try {
        const pos = await getPosition();
        coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracyM: pos.coords.accuracy };
      } catch {
        setStep("idle");
        setError("This session checks location. Allow location access for this site and try again.");
        return;
      }
    }
    setStep("submitting");
    try {
      // Mint the code only after the GPS fix so it can't expire while we wait.
      const challenge = await issue.mutateAsync();
      const result = await checkIn.mutateAsync({ payload: challenge.payload, ...coords });
      setDone({ status: result.status, at: result.checkedInAt });
      toast.success(result.status === "late" ? "You're checked in — late" : "You're checked in");
    } catch (e) {
      const err = toApiError(e);
      if (err.code === "DUPLICATE_CHECKIN") {
        setDone({ status: (err.details.status as AttendanceStatus) ?? "present", at: (err.details.checkedInAt as string) ?? new Date().toISOString() });
      } else if (err.code === "OUT_OF_BOUNDS") {
        setError(`You seem to be about ${err.details.distanceM ?? "?"} m from the venue (limit ${err.details.radiusM ?? "?"} m). Move closer, or ask another executive to record you.`);
      } else {
        setError(err.message);
      }
    } finally {
      setStep("idle");
      void qc.invalidateQueries({ queryKey: ["roster", sessionId] });
    }
  }

  if (record) {
    return (
      <div className="flex items-center gap-3 rounded-3xl bg-emerald-50/70 p-4 ring-1 ring-emerald-600/15">
        <CheckCircle2 className="size-6 shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">You&apos;re on the list</p>
          <p className="text-xs text-muted">Checked in at {formatTime(record.at)}</p>
        </div>
        <AttendanceBadge status={record.status} />
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-hairline">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface text-brand">
          <UserCheck className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium">Attending too?</p>
          <p className="text-xs text-muted">
            Running the session doesn&apos;t mark you present. Check yourself in from here.
            {requiresLocation && (
              <span className="mt-1 flex items-center gap-1">
                <MapPin className="size-3" aria-hidden /> Uses your location
              </span>
            )}
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      )}
      <Button
        className="mt-4 w-full"
        onClick={() => void run()}
        loading={step !== "idle"}
        loadingLabel={step === "locating" ? "Finding your location…" : "Checking you in…"}
        disabled={myRecord === undefined}
      >
        <UserCheck className="size-4" aria-hidden /> Check myself in
      </Button>
    </div>
  );
}
