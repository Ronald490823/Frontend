"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Navigation, QrCode, RotateCw } from "lucide-react";
import { useCallback, useState } from "react";
import { QrScanner } from "@/components/attendance/qr-scanner";
import { SuccessMark } from "@/components/attendance/success-mark";
import { ATTENDANCE_LABEL } from "@/components/sessions/status";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { useLocationCheckIn } from "@/features/attendance/hooks";
import { toApiError } from "@/lib/api-errors";
import { formatTime } from "@/lib/formatters";
import type { AttendanceStatus, CheckInResult } from "@/types/api";

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 })
      : reject(new Error("unsupported")),
  );
}

type State =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "submitting" }
  | { kind: "success"; result: CheckInResult }
  | { kind: "already"; status: AttendanceStatus; at?: string }
  | { kind: "error"; title: string; body: string; offerQr?: boolean };

/** GPS self check-in: the primary way in. Location is the proof of presence. */
function GpsCheckIn({ onUseQr }: { onUseQr: () => void }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const checkIn = useLocationCheckIn();

  const run = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setState({ kind: "error", title: "Location isn't available", body: "This device can't share its location. Scan the QR code instead.", offerQr: true });
      return;
    }
    setState({ kind: "locating" });
    let pos: GeolocationPosition;
    try {
      pos = await getPosition();
    } catch {
      setState({
        kind: "error",
        title: "We couldn't get your location",
        body: "Allow location access for this site and try again — or scan the QR code your executive is showing.",
        offerQr: true,
      });
      return;
    }
    setState({ kind: "submitting" });
    try {
      const result = await checkIn.mutateAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracyM: pos.coords.accuracy });
      navigator.vibrate?.(40);
      setState({ kind: "success", result });
    } catch (error) {
      const e = toApiError(error);
      switch (e.code) {
        case "DUPLICATE_CHECKIN":
          setState({ kind: "already", status: (e.details.status as AttendanceStatus) ?? "present", at: e.details.checkedInAt as string | undefined });
          return;
        case "OUT_OF_BOUNDS":
          setState({
            kind: "error",
            title: "You seem to be away from the venue",
            body: `We placed you about ${e.details.distanceM ?? "?"} m away (limit ${e.details.radiusM ?? "?"} m). Move closer and try again, or ask an executive to record you.`,
          });
          return;
        case "LOCATION_REQUIRED":
          // The session has no geofence to check against — the QR code is the way in.
          setState({ kind: "error", title: "This session uses the QR code", body: "Scan the code your executive is showing to check in.", offerQr: true });
          return;
        case "SESSION_NOT_ACTIVE":
          setState({ kind: "error", title: "No session is open", body: "Attendance isn't being taken right now. You'll get a notification when it starts." });
          return;
        default:
          setState({ kind: "error", title: "Check-in didn't go through", body: e.message });
      }
    }
  }, [checkIn]);

  return (
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-soft ring-1 ring-hairline">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={state.kind}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="px-6 py-12 text-center sm:px-10"
          aria-live="polite"
        >
          {state.kind === "idle" && (
            <>
              <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-surface text-brand">
                <Navigation className="size-9" aria-hidden />
              </div>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight">Check in to today&apos;s CDS</h2>
              <p className="mx-auto mt-2 max-w-sm text-muted">Tap to check in. We&apos;ll use your location to confirm you&apos;re at the venue.</p>
              <Button size="lg" className="mt-8" onClick={() => void run()}>
                <Navigation className="size-5" aria-hidden /> Check in
              </Button>
            </>
          )}

          {(state.kind === "locating" || state.kind === "submitting") && (
            <div className="py-8 text-brand">
              <Loader size="lg" label={state.kind === "locating" ? "Finding your location…" : "Checking you in…"} showLabel className="flex-col" />
            </div>
          )}

          {state.kind === "success" && (
            <>
              <SuccessMark tone={state.result.status === "late" ? "warning" : "success"} />
              <h2 className="mt-6 text-3xl font-semibold tracking-tight">
                {state.result.status === "late" ? "Checked in — late" : "You're checked in"}
              </h2>
              <p className="mt-2 text-muted">
                {state.result.sessionTitle} · {formatTime(state.result.checkedInAt)}
              </p>
              {state.result.distanceM !== null && (
                <p className="mt-1 inline-flex items-center gap-1 text-sm text-muted">
                  <MapPin className="size-3.5" aria-hidden /> {state.result.distanceM} m from the venue
                </p>
              )}
            </>
          )}

          {state.kind === "already" && (
            <>
              <SuccessMark tone="info" />
              <h2 className="mt-6 text-2xl font-semibold tracking-tight">You&apos;re already checked in</h2>
              <p className="mt-2 text-muted">
                Recorded as {ATTENDANCE_LABEL[state.status].toLowerCase()}
                {state.at ? ` at ${formatTime(state.at)}` : ""}.
              </p>
            </>
          )}

          {state.kind === "error" && (
            <>
              <h2 className="text-xl font-semibold">{state.title}</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{state.body}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button onClick={() => void run()}>
                  <RotateCw className="size-4" aria-hidden /> Try again
                </Button>
                {state.offerQr && (
                  <Button variant="secondary" onClick={onUseQr}>
                    <QrCode className="size-4" aria-hidden /> Scan QR code
                  </Button>
                )}
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Check-in with GPS as the primary method and the QR scanner as a fallback. */
export function CheckInPanel() {
  const [method, setMethod] = useState<"gps" | "qr">("gps");

  return (
    <div>
      {method === "gps" ? <GpsCheckIn onUseQr={() => setMethod("qr")} /> : <QrScanner />}
      <button
        type="button"
        onClick={() => setMethod((m) => (m === "gps" ? "qr" : "gps"))}
        className="mx-auto mt-4 flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-deep"
      >
        {method === "gps" ? (
          <>
            <QrCode className="size-4" aria-hidden /> Camera trouble? Scan the QR code instead
          </>
        ) : (
          <>
            <Navigation className="size-4" aria-hidden /> Use my location instead
          </>
        )}
      </button>
    </div>
  );
}
