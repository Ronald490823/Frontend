"use client";

import { useRef } from "react";
import { FULL, gsap, useGSAP } from "@/components/motion/gsap";

const WORDS = ["Scan.", "Verified.", "Done."];

/** Pinned statement whose words light up one by one as you scroll through it. */
export function ScrollWords() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(FULL, () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: root.current, start: "top top", end: "+=130%", scrub: 0.5, pin: true },
        });
        tl.from("[data-sw]", { opacity: 0.12, stagger: 0.5, ease: "none", duration: 0.5 }).from(
          "[data-sw-caption]",
          { opacity: 0, y: 20, ease: "none", duration: 0.4 },
          ">-0.1",
        );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} className="grid min-h-dvh place-items-center bg-ink px-6 text-white">
      <div className="text-center">
        <p className="text-6xl font-semibold leading-[1.05] tracking-[-0.05em] sm:text-8xl lg:text-9xl">
          {WORDS.map((w) => (
            <span key={w} data-sw className="block bg-gradient-to-r from-white to-accent bg-clip-text text-transparent">
              {w}
            </span>
          ))}
        </p>
        <p data-sw-caption className="mx-auto mt-10 max-w-xl text-lg text-white/60">
          Each code lives for seconds and is checked by the server — so a screenshot shared to a group chat is
          already useless.
        </p>
      </div>
    </section>
  );
}
