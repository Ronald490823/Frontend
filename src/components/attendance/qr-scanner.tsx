"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, CameraOff, MapPin, RotateCw, ScanLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ATTENDANCE_LABEL } from "@/components/sessions/status";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { type CheckInInput, useCheckIn } from "@/features/attendance/hooks";
import { toApiError } from "@/lib/api-errors";
import { formatTime } from "@/lib/formatters";
import type { AttendanceStatus, CheckInResult } from "@/types/api";
import { SuccessMark } from "./success-mark";

const READER_ID = "cds-qr-reader";
const CODE_PREFIX = "CDSA1.";

type State =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "scanning"; hint?: string }
  | { kind: "submitting"; label: string }
  | { kind: "success"; result: CheckInResult }
  | { kind: "already"; status: AttendanceStatus; at?: string }
  | { kind: "camera-denied" }
  | { kind: "error"; title: string; body: string };

type Scanner = { stop: () => Promise<void>; clear: () => void; isScanning: boolean };

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) =>
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 })
      : reject(new Error("unsupported")),
  );
}

export function QrScanner() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const scannerRef = useRef<Scanner | null>(null);
  const handledRef = useRef(false);
  const checkIn = useCheckIn();

  const stopCamera = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s?.isScanning) await s.stop().catch(() => undefined);
    s?.clear();
  }, []);

  useEffect(() => () => void stopCamera(), [stopCamera]);

  const submit = useCallback(
    async (input: CheckInInput) => {
      try {
        const result = await checkIn.mutateAsync(input);
        navigator.vibrate?.(40);
        setState({ kind: "success", result });
      } catch (error) {
        const e = toApiError(error);
        switch (e.code) {
          case "LOCATION_REQUIRED": {
            setState({ kind: "submitting", label: "This session checks your location…" });
            let pos: GeolocationPosition;
            try {
              pos = await getPosition();
            } catch {
              setState({
                kind: "error",
                title: "Location needed",
                body: "This session needs your location. Allow location access for this site, then scan again — or ask an executive to record you.",
              });
              return;
            }
            // submit() handles its own errors, so this never throws.
            await submit({ ...input, latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracyM: pos.coords.accuracy });
            return;
          }
          case "DUPLICATE_CHECKIN":
            setState({ kind: "already", status: (e.details.status as AttendanceStatus) ?? "present", at: e.details.checkedInAt as string | undefined });
            return;
          case "CHALLENGE_EXPIRED":
            setState({ kind: "error", title: "Code expired", body: "Codes refresh every few seconds. Scan the one on screen now." });
            return;
          case "OUT_OF_BOUNDS":
            setState({
              kind: "error",
              title: "You seem to be away from the venue",
              body: `We placed you about ${e.details.distanceM ?? "?"} m away (limit ${e.details.radiusM ?? "?"} m). Move closer and try again, or ask an executive to record you.`,
            });
            return;
          default:
            setState({ kind: "error", title: "Check-in didn't go through", body: e.message });
        }
      }
    },
    [checkIn],
  );

  const start = useCallback(async () => {
    handledRef.current = false;
    // Browsers only expose the camera on HTTPS (or localhost). Say so plainly.
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setState({
        kind: "error",
        title: "Camera needs a secure connection",
        body: "This page was opened over plain HTTP, so your browser won't share the camera. Open the https:// address instead, or ask an executive to record your attendance.",
      });
      return;
    }
    setState({ kind: "starting" });
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(READER_ID, { verbose: false });
      scannerRef.current = scanner as unknown as Scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 12, qrbox: (w: number, h: number) => ({ width: Math.min(w, h) * 0.72, height: Math.min(w, h) * 0.72 }), aspectRatio: 1 },
        (text: string) => {
          if (handledRef.current) return;
          if (!text.startsWith(CODE_PREFIX)) {
            setState({ kind: "scanning", hint: "That isn't a CDS Attend code. Point at the code on your executive's screen." });
            return;
          }
          handledRef.current = true;
          void stopCamera();
          setState({ kind: "submitting", label: "Checking you in…" });
          void submit({ payload: text });
        },
        () => undefined, // per-frame "no code found" — expected, ignore
      );
      setState({ kind: "scanning" });
    } catch (error) {
      await stopCamera();
      const name = (error as { name?: string })?.name ?? String(error);
      if (/NotAllowed|Permission/i.test(name)) setState({ kind: "camera-denied" });
      else setState({ kind: "error", title: "Camera unavailable", body: "We couldn't open a camera on this device. Ask an executive to record your attendance." });
    }
  }, [stopCamera, submit]);

  const scanningVisible = state.kind === "starting" || state.kind === "scanning";

  return (
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-soft ring-1 ring-hairline">
      {/* Camera viewport is always mounted so html5-qrcode has a stable element. */}
      <div className={scanningVisible ? "relative aspect-square bg-ink" : "hidden"}>
        <div id={READER_ID} className="absolute inset-0 [&_video]:!h-full [&_video]:!w-full [&_video]:object-cover" />
        <ScanOverlay />
        {state.kind === "starting" && (
          <div className="absolute inset-0 grid place-items-center text-white">
            <Loader size="lg" label="Opening camera…" showLabel className="[&_span:last-child]:text-white/70" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-5 pt-12 text-center text-sm text-white" aria-live="polite">
          {state.kind === "scanning" && state.hint ? state.hint : "Point at the QR code on your executive's screen"}
        </div>
        <button
          type="button"
          onClick={() => void stopCamera().then(() => setState({ kind: "idle" }))}
          className="absolute right-4 top-4 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/60"
        >
          Cancel
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!scanningVisible && (
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
                  <ScanLine className="size-9" aria-hidden />
                </div>
                <h2 className="mt-6 text-2xl font-semibold tracking-tight">Check in to today&apos;s CDS</h2>
                <p className="mx-auto mt-2 max-w-sm text-muted">Open your camera and scan the code your executive is showing at the venue.</p>
                <Button size="lg" className="mt-8" onClick={() => void start()}>
                  <Camera className="size-5" aria-hidden /> Open camera
                </Button>
              </>
            )}

            {state.kind === "submitting" && (
              <div className="py-8 text-brand">
                <Loader size="lg" label={state.label} showLabel className="flex-col" />
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

            {state.kind === "camera-denied" && (
              <>
                <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                  <CameraOff className="size-7" aria-hidden />
                </div>
                <h2 className="mt-5 text-xl font-semibold">Camera access is blocked</h2>
                <ol className="mx-auto mt-3 max-w-sm list-decimal space-y-1 pl-5 text-left text-sm text-muted">
                  <li>Open your browser&apos;s site settings for this page.</li>
                  <li>Allow the camera, then tap “Try again”.</li>
                  <li>No camera? Ask an executive to record your attendance manually.</li>
                </ol>
                <Button variant="secondary" className="mt-6" onClick={() => void start()}>
                  <RotateCw className="size-4" aria-hidden /> Try again
                </Button>
              </>
            )}

            {state.kind === "error" && (
              <>
                <h2 className="text-xl font-semibold">{state.title}</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{state.body}</p>
                <Button className="mt-6" onClick={() => void start()}>
                  <ScanLine className="size-4" aria-hidden /> Scan again
                </Button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Corner brackets and a sweeping line, like the iOS camera's code reader. */
function ScanOverlay() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-[14%]">
      {["left-0 top-0 border-l-4 border-t-4 rounded-tl-3xl", "right-0 top-0 border-r-4 border-t-4 rounded-tr-3xl", "left-0 bottom-0 border-l-4 border-b-4 rounded-bl-3xl", "right-0 bottom-0 border-r-4 border-b-4 rounded-br-3xl"].map((c) => (
        <motion.span
          key={c}
          className={`absolute size-12 border-accent ${c}`}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      ))}
      <motion.span
        className="absolute inset-x-3 h-0.5 rounded-full bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_16px_rgb(45_212_191)]"
        animate={{ top: ["8%", "92%", "8%"] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
