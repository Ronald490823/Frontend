"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/components/layout/brand";
import { cn } from "@/lib/utils";

/** Transparent at the top, frosted glass once the page scrolls — like apple.com. */
export function SiteNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 26 }}
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[background,box-shadow] duration-500",
        scrolled && "glass shadow-[0_1px_0_var(--color-hairline)]",
      )}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Brand />
        <div className="flex items-center gap-1">
          <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-ink/80 hover:bg-ink/5">
            Sign in
          </Link>
          <Link href="/register" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/85">
            Register
          </Link>
        </div>
      </nav>
    </motion.header>
  );
}
