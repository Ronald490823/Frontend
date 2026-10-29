"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}

/** iOS-style segmented control with a sliding thumb (shared layout animation). */
export function Segmented<T extends string>({ value, onChange, options, label }: SegmentedProps<T>) {
  const layoutId = useId();
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-full bg-ink/[0.05] p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              active ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-white shadow-soft ring-1 ring-hairline"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">
              {opt.label}
              {opt.count !== undefined && <span className="ml-1.5 text-xs text-muted">{opt.count}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
