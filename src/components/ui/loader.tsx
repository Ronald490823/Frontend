import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-4 border-2",
  md: "size-6 border-[2.5px]",
  lg: "size-10 border-[3px]",
} as const;

interface LoaderProps {
  size?: keyof typeof SIZES;
  label?: string;
  /** Show the label visually (otherwise screen-reader only). */
  showLabel?: boolean;
  className?: string;
}

/** The one loading indicator used throughout the app. */
export function Loader({ size = "md", label = "Loading…", showLabel = false, className }: LoaderProps) {
  return (
    <span role="status" aria-live="polite" className={cn("inline-flex items-center gap-3", className)}>
      <span
        aria-hidden
        className={cn(
          "inline-block shrink-0 rounded-full border-current border-r-transparent opacity-80",
          "animate-spin motion-reduce:animate-[pulse_1.5s_ease-in-out_infinite]",
          SIZES[size],
        )}
      />
      <span className={showLabel ? "text-sm text-muted" : "sr-only"}>{label}</span>
    </span>
  );
}

export function FullPageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center text-brand">
      <Loader size="lg" label={label} showLabel />
    </div>
  );
}
