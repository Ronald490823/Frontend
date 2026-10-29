"use client";

import { BarChart3, FileLock2, QrCode, ShieldCheck, UserCheck, Users } from "lucide-react";
import { useRef } from "react";
import { RevealText } from "@/components/motion/reveal-text";
import { FULL, gsap, ScrollTrigger, useGSAP } from "@/components/motion/gsap";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: QrCode,
    title: "Dynamic QR check-in",
    body: "Short-lived, signed codes rotate on the executive's screen. Members scan, the server verifies.",
    className: "md:col-span-2 bg-gradient-to-br from-surface to-white",
  },
  {
    icon: UserCheck,
    title: "Approvals in a tap",
    body: "New corps members wait for their group executive — nobody approves themselves.",
    className: "",
  },
  {
    icon: ShieldCheck,
    title: "Scoped by design",
    body: "Executives see their group. Inspectors see their LGA. Every request is checked on the server.",
    className: "",
  },
  {
    icon: FileLock2,
    title: "Private excuse documents",
    body: "Medical notes and duty letters stay private, visible only to the people who review them.",
    className: "md:col-span-2 bg-gradient-to-br from-blue-50/80 to-white",
  },
  {
    icon: BarChart3,
    title: "Reports that add up",
    body: "Attendance rates, persistent absences and excuse outcomes, calculated from the record.",
    className: "md:col-span-2",
  },
  {
    icon: Users,
    title: "Full audit trail",
    body: "Every approval, override and decision is recorded with who, what and when.",
    className: "",
  },
];

export function Features() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(FULL, () => {
        gsap.set("[data-feature]", { opacity: 0, y: 60, scale: 0.97 });
        ScrollTrigger.batch("[data-feature]", {
          start: "top 88%",
          onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, scale: 1, stagger: 0.1, duration: 1.1 }),
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="mx-auto max-w-6xl px-6 py-32">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium text-brand">Built for the whole LGA</p>
        <RevealText
          as="h2"
          onScroll
          text="Everything CDS needs. Nothing it doesn't."
          className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl"
        />
      </div>
      <div className="mt-16 grid gap-5 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body, className }) => (
          <article
            key={title}
            data-feature
            className={cn(
              "group rounded-[2rem] bg-white p-8 shadow-soft ring-1 ring-hairline transition-shadow duration-500 hover:shadow-lift",
              className,
            )}
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-brand text-white shadow-[0_10px_24px_-10px_rgb(15_118_110/0.8)] transition-transform duration-500 ease-[var(--ease-apple)] group-hover:-translate-y-1 group-hover:rotate-[-4deg]">
              <Icon className="size-6" aria-hidden />
            </span>
            <h3 className="mt-6 text-xl font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 leading-relaxed text-muted">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
