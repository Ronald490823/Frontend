"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Magnetic } from "@/components/motion/magnetic";
import { RevealText } from "@/components/motion/reveal-text";
import { FULL, gsap, useGSAP } from "@/components/motion/gsap";
import { QrArt } from "./qr-art";

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(FULL, () => {
        gsap.from("[data-hero-fade]", { opacity: 0, y: 24, stagger: 0.1, delay: 0.5, duration: 1.2 });

        // Device rises out of a tilt as the page scrolls — scrubbed to the scrollbar.
        gsap.fromTo(
          "[data-device]",
          { rotateX: 22, scale: 0.86, y: 40 },
          {
            rotateX: 0,
            scale: 1,
            y: 0,
            ease: "none",
            scrollTrigger: { trigger: "[data-device-stage]", start: "top 85%", end: "top 20%", scrub: 0.6 },
          },
        );
        gsap.to("[data-glow]", {
          opacity: 1,
          scale: 1.15,
          ease: "none",
          scrollTrigger: { trigger: "[data-device-stage]", start: "top 80%", end: "bottom 40%", scrub: true },
        });
        // The "checked in" toast slides in once the device has settled.
        gsap.from("[data-device-toast]", {
          y: -30,
          opacity: 0,
          duration: 0.9,
          ease: "back.out(1.6)",
          scrollTrigger: { trigger: "[data-device-stage]", start: "top 30%" },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden pt-36 sm:pt-44">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-[38rem] max-w-5xl rounded-full bg-[radial-gradient(closest-side,rgb(45_212_191/0.28),transparent)] blur-2xl"
      />
      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <p data-hero-fade className="mb-5 text-sm font-medium tracking-wide text-brand">
          NYSC · Community Development Service
        </p>
        <RevealText
          text="Attendance, made effortless."
          className="mx-auto max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-7xl lg:text-[5.5rem]"
          delay={0.1}
        />
        <p data-hero-fade className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
          Weekly CDS meetings, verified in seconds. A rotating QR code at the venue, instant approvals for executives,
          and clear oversight for every Local Government Inspector.
        </p>
        <div data-hero-fade className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Magnetic>
            <Link
              href="/register"
              className="group inline-flex h-13 items-center gap-2 rounded-full bg-brand px-7 font-medium text-white shadow-lift transition-colors hover:bg-brand-deep"
            >
              Get started
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </Magnetic>
          <Link href="/login" className="inline-flex h-13 items-center rounded-full px-6 font-medium text-brand hover:bg-brand/5">
            Sign in
          </Link>
        </div>
      </div>

      {/* Device */}
      <div data-device-stage className="relative mx-auto mt-20 max-w-5xl px-6 pb-24 [perspective:1400px]">
        <div
          data-glow
          aria-hidden
          className="absolute inset-x-10 top-24 bottom-10 rounded-[4rem] bg-gradient-to-b from-accent/40 via-brand/25 to-info/20 opacity-40 blur-3xl"
        />
        <div data-device className="relative mx-auto w-[18.5rem] origin-bottom will-change-transform sm:w-[21rem]">
          <div className="rounded-[3.2rem] bg-ink p-3 shadow-[0_50px_100px_-30px_rgb(23_32_51/0.55)] ring-1 ring-white/10">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-canvas">
              <div className="absolute left-1/2 top-3 z-10 h-7 w-28 -translate-x-1/2 rounded-full bg-ink" />
              <div className="px-6 pb-9 pt-16" aria-hidden>
                <p className="text-xs font-medium text-muted">Health & Sanitation CDS</p>
                <p className="mt-1 text-xl font-semibold tracking-tight">Thursday meeting</p>
                <div className="mt-6 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-hairline">
                  <QrArt className="w-full text-ink" />
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink/5">
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-accent to-brand" />
                  </div>
                  <p className="mt-2 text-center text-[11px] text-muted">New code every few seconds</p>
                </div>
              </div>
              <div
                data-device-toast
                aria-hidden
                className="glass absolute inset-x-4 top-12 flex items-center gap-3 rounded-2xl p-3 shadow-lift ring-1 ring-hairline"
              >
                <span className="grid size-9 place-items-center rounded-full bg-emerald-500 text-white">
                  <Check className="size-5" strokeWidth={3} />
                </span>
                <div className="text-left">
                  <p className="text-sm font-semibold">You&apos;re checked in</p>
                  <p className="text-xs text-muted">Recorded securely just now</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
