import Link from "next/link";
import { cn } from "@/lib/utils";



export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={cn("size-7", className)}
    >
      <defs>
        <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>

      <rect width="32" height="32" rx="9" fill="url(#bm)" />

      {/* WhatsApp-style double read ticks */}
      <g
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7.5 16.5l4 4 8-9" />
        <path d="M13.5 16.5l4 4 8-9" opacity="0.7" />
      </g>
    </svg>
  );
}



export function Brand({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <BrandMark />
      <span>CDS Attend</span>
    </Link>
  );
}
