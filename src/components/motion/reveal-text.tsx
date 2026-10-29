"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { FULL, gsap, useGSAP } from "./gsap";

type Tag = "h1" | "h2" | "h3" | "p";

interface RevealTextProps {
  text: string;
  as?: Tag;
  className?: string;
  delay?: number;
  /** Animate when scrolled into view instead of on mount. */
  onScroll?: boolean;
}

/**
 * Masked word-by-word rise — the signature Awwwards headline reveal.
 * Words are wrapped in overflow-hidden spans; the real text stays in the DOM for
 * screen readers via aria-label, and nothing animates under reduced motion.
 */
export function RevealText({ text, as: As = "h1", className, delay = 0, onScroll = false }: RevealTextProps) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(FULL, () => {
        gsap.from("[data-word]", {
          yPercent: 115,
          rotate: 4,
          opacity: 0,
          stagger: 0.06,
          duration: 1.2,
          delay,
          scrollTrigger: onScroll ? { trigger: ref.current, start: "top 85%" } : undefined,
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  const words = text.split(" ");
  return (
    <As ref={ref as never} aria-label={text} className={cn("text-balance", className)}>
      {words.map((word, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.12em] align-bottom -mb-[0.12em]">
          <span data-word className="inline-block will-change-transform">
            {word}
            {i < words.length - 1 ? " " : ""}
          </span>
        </span>
      ))}
    </As>
  );
}
