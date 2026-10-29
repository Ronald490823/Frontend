"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CalendarCheck2, Check, ShieldCheck } from "lucide-react";
import { QrArt } from "@/components/marketing/qr-art";

function Floating({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={reduce ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: [0, -10, 0], scale: 1 }}
      transition={{
        opacity: { delay, duration: 0.8 },
        scale: { delay, type: "spring", stiffness: 120, damping: 18 },
        y: reduce ? { delay } : { delay: delay + 0.8, duration: 6, repeat: Infinity, ease: "easeInOut" },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Decorative right-hand panel on auth screens (hidden from assistive tech). */
export function AuthShowcase() {
  return (
    <aside aria-hidden className="relative hidden overflow-hidden bg-brand-deep lg:block">
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_70%_20%,rgb(45_212_191/0.45),transparent),radial-gradient(60%_60%_at_10%_90%,rgb(37_99_235/0.35),transparent)]" />
      <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px]" />

      <div className="relative flex h-full flex-col justify-between p-14 text-white">
        <div className="relative mx-auto mt-10 h-[26rem] w-full max-w-md">
          <Floating delay={0.2} className="absolute left-1/2 top-6 w-60 -translate-x-1/2">
            <div className="rounded-[2rem] bg-white p-5 text-ink shadow-[0_40px_80px_-20px_rgb(0_0_0/0.45)]">
              <QrArt className="w-full" />
            </div>
          </Floating>
          <Floating delay={0.5} className="absolute -left-2 top-56">
            <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-3 pr-5 ring-1 ring-white/25 backdrop-blur-xl">
              <span className="grid size-9 place-items-center rounded-full bg-emerald-400 text-ink">
                <Check className="size-5" strokeWidth={3} />
              </span>
              <div>
                <p className="text-sm font-semibold">Checked in</p>
                <p className="text-xs text-white/70">Verified by server</p>
              </div>
            </div>
          </Floating>
          <Floating delay={0.8} className="absolute -right-2 top-72">
            <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-3 pr-5 ring-1 ring-white/25 backdrop-blur-xl">
              <span className="grid size-9 place-items-center rounded-full bg-white text-brand">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Membership approved</p>
                <p className="text-xs text-white/70">by your CDS executive</p>
              </div>
            </div>
          </Floating>
          <Floating delay={1.1} className="absolute left-10 top-[22rem]">
            <div className="flex items-center gap-2 rounded-full bg-ink/40 px-4 py-2 text-xs ring-1 ring-white/15 backdrop-blur-xl">
              <CalendarCheck2 className="size-4 text-accent" /> Every Thursday, sorted
            </div>
          </Floating>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}>
          <p className="max-w-sm text-3xl font-semibold leading-tight tracking-[-0.03em]">
            Your CDS attendance, verified and in one place.
          </p>
          <p className="mt-3 max-w-sm text-white/65">Secure sign-in, group approvals and a full history of every meeting.</p>
        </motion.div>
      </div>
    </aside>
  );
}
