"use client";

import { motion } from "framer-motion";

/** Apple-Pay-style confirmation: ring draws, check strokes in, ripples settle. */
export function SuccessMark({ tone = "success" }: { tone?: "success" | "warning" | "info" }) {
  const color = { success: "#10b981", warning: "#f59e0b", info: "#2563eb" }[tone];
  return (
    <div className="relative mx-auto grid size-36 place-items-center" aria-hidden>
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ scale: 0.6, opacity: 0.35 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 1.4, delay: 0.35 + i * 0.25, ease: "easeOut" }}
        />
      ))}
      <motion.svg viewBox="0 0 100 100" className="relative size-36" initial="hidden" animate="show">
        <motion.circle
          cx="50"
          cy="50"
          r="44"
          fill={color}
          variants={{ hidden: { scale: 0.4, opacity: 0 }, show: { scale: 1, opacity: 1 } }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          style={{ originX: "50%", originY: "50%" }}
        />
        <motion.path
          d="M30 51 L44 65 L71 37"
          fill="none"
          stroke="white"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1 } }}
          transition={{ delay: 0.25, duration: 0.45, ease: [0.65, 0, 0.35, 1] }}
        />
      </motion.svg>
    </div>
  );
}
