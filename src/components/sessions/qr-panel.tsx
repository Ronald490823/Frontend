"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Expand, RotateCw, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import { useIssueChallenge } from "@/features/sessions/hooks";
import { errorMessage } from "@/lib/api-errors";
import type { Challenge } from "@/types/api";

const REFRESH_MS = Number(process.env.NEXT_PUBLIC_QR_REFRESH_INTERVAL) || 15_000;

interface LiveChallenge extends Challenge {
  /** Expiry on the *local* clock, so a skewed device clock can't distort the countdown. */
  localExpiry: number;
}

function useRotatingChallenge(sessionId: string) {
  const issue = useIssueChallenge(sessionId);
  const [challenge, setChallenge] = useState<LiveChallenge | null>(null);
  const [error, setError] = useState<unknown>(null);
  const mutateRef = useRef(issue.mutateAsync);
  mutateRef.current = issue.mutateAsync;

  const refresh = useCallback(async () => {
    try {
      const c = await mutateRef.current();
      const ttlMs = new Date(c.expiresAt).getTime() - new Date(c.issuedAt).getTime();
      setChallenge({ ...c, localExpiry: Date.now() + ttlMs });
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const startLoop = () => {
      void refresh();
      timer = setInterval(() => void refresh(), REFRESH_MS);
    };
    const stopLoop = () => timer && clearInterval(timer);
    // Don't mint codes nobody can see.
    const onVisibility = () => (document.visibilityState === "visible" ? startLoop() : stopLoop());
    if (document.visibilityState === "visible") startLoop();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopLoop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return { challenge, error, refresh, refreshing: issue.isPending };
}

function useSecondsLeft(challenge: LiveChallenge | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  if (!challenge) return { seconds: 0, fraction: 0 };
  const left = Math.max(0, challenge.localExpiry - now);
  return { seconds: Math.ceil(left / 1000), fraction: left / (challenge.ttlSeconds * 1000) };
}

function CountdownRing({ fraction, seconds, size = 44, light = false }: { fraction: number; seconds: number; size?: number; light?: boolean }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} aria-label={`Code refreshes in ${seconds} seconds`}>
      <svg viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="3" className={light ? "stroke-white/15" : "stroke-ink/10"} />
        <motion.circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className={fraction < 0.25 ? "stroke-amber-500" : "stroke-accent"}
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - fraction) }}
          transition={{ ease: "linear", duration: 0.25 }}
        />
      </svg>
      <span className={`text-xs font-semibold tabular-nums ${light ? "text-white" : ""}`}>{seconds}</span>
    </div>
  );
}

function QrImage({ challenge, size }: { challenge: LiveChallenge | null; size: number }) {
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <AnimatePresence initial={false}>
        {challenge && (
          <motion.div
            key={challenge.challengeId}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.02, filter: "blur(8px)" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <QRCodeSVG value={challenge.payload} size={size} level="M" marginSize={0} fgColor="#172033" title="CDS check-in code" className="h-full w-full" />
          </motion.div>
        )}
      </AnimatePresence>
      {!challenge && <Loader size="lg" label="Generating code…" className="text-brand" />}
    </div>
  );
}

export function QrPanel({ sessionId, title, checkedIn, eligible }: { sessionId: string; title: string; checkedIn: number; eligible: number }) {
  const { challenge, error, refresh, refreshing } = useRotatingChallenge(sessionId);
  const { seconds, fraction } = useSecondsLeft(challenge);
  const [presenting, setPresenting] = useState(false);
  const expired = !!challenge && seconds === 0;

  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPresenting(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [presenting]);

  return (
    <>
      <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-hairline">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-brand">Live check-in</p>
            <p className="text-xs text-muted">New code every {Math.round(REFRESH_MS / 1000)}s</p>
          </div>
          <CountdownRing fraction={fraction} seconds={seconds} />
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-[18rem]">
          <QrImage challenge={challenge} size={288} />
          {(error || expired) && (
            <div role="alert" className="glass absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl p-6 text-center">
              <p className="text-sm font-medium">{error ? errorMessage(error) : "Code expired"}</p>
              <Button size="sm" variant="secondary" onClick={() => void refresh()} loading={refreshing} loadingLabel="Refreshing…">
                {!refreshing && <RotateCw className="size-4" aria-hidden />} Refresh code
              </Button>
            </div>
          )}
        </div>
        <Button variant="secondary" className="mt-6 w-full" onClick={() => setPresenting(true)}>
          <Expand className="size-4" aria-hidden /> Present full screen
        </Button>
      </div>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {presenting && (
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Check-in code, full screen"
                className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-ink p-6 text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div aria-hidden className="absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_40%,rgb(45_212_191/0.25),transparent)]" />
                <button
                  type="button"
                  onClick={() => setPresenting(false)}
                  aria-label="Exit full screen"
                  className="absolute right-6 top-6 grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                >
                  <X className="size-5" aria-hidden />
                </button>
                <motion.div
                  className="relative flex flex-col items-center"
                  initial={{ scale: 0.92, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 160, damping: 22 }}
                >
                  <p className="mb-2 text-lg text-white/60">Scan to check in</p>
                  <h2 className="mb-8 text-center text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
                  <div className="rounded-[2.5rem] bg-white p-6 shadow-[0_40px_120px_-20px_rgb(45_212_191/0.5)] sm:p-8">
                    <QrImage challenge={challenge} size={Math.min(520, typeof window !== "undefined" ? window.innerHeight * 0.55 : 420)} />
                  </div>
                  <div className="mt-8 flex items-center gap-8">
                    <CountdownRing fraction={fraction} seconds={seconds} size={56} light />
                    <p className="text-2xl font-semibold tabular-nums">
                      <AnimatedNumber value={checkedIn} />
                      <span className="text-white/50"> / {eligible} checked in</span>
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
