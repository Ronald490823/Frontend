"use client";

import { RotateCw, WifiOff } from "lucide-react";
import { errorMessage } from "@/lib/api-errors";
import { Button } from "./button";

/** Inline failure state with retry — never leave a spinner running after an error. */
export function ErrorState({ error, onRetry, retrying }: { error: unknown; onRetry: () => void; retrying?: boolean }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
        <WifiOff className="size-5" aria-hidden />
      </div>
      <p className="font-medium">We couldn&apos;t load this.</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{errorMessage(error)}</p>
      <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry} loading={retrying} loadingLabel="Retrying…">
        {!retrying && <RotateCw className="size-4" aria-hidden />}
        Try again
      </Button>
    </div>
  );
}
