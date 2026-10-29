"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader } from "./loader";

const VARIANTS = {
  primary:
    "bg-brand text-white shadow-[0_1px_0_rgb(255_255_255/0.2)_inset,0_8px_20px_-8px_rgb(15_118_110/0.6)] hover:bg-brand-deep",
  secondary: "bg-white text-ink ring-1 ring-hairline shadow-soft hover:bg-surface",
  ghost: "text-ink hover:bg-ink/5",
  danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-[0_8px_20px_-8px_rgb(225_29_72/0.55)]",
} as const;

const SIZES = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-[15px] gap-2",
  lg: "h-13 px-7 text-base gap-2.5",
} as const;

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
  loadingLabel?: string;
  children?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, loadingLabel, disabled, className, children, type = "button", ...props },
  ref,
) {
  const isDisabled = disabled || loading;
  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      whileHover={isDisabled ? undefined : { y: -1 }}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      className={cn(
        "relative inline-flex select-none items-center justify-center rounded-full font-medium tracking-[-0.01em]",
        "transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-55",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader size="sm" label={loadingLabel ?? "Working…"} />}
      {children}
    </motion.button>
  );
});
