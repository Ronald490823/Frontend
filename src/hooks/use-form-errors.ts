"use client";

import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toApiError } from "@/lib/api-errors";

/**
 * Puts backend field errors beside their inputs. Returns the message to show at form
 * level when the error isn't field-specific (or null if every error was placed).
 */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, known: Path<T>[]) {
  const apiError = toApiError(error);
  let unplaced = false;
  for (const [field, message] of Object.entries(apiError.fields)) {
    if ((known as string[]).includes(field)) setError(field as Path<T>, { type: "server", message });
    else unplaced = true;
  }
  return apiError.hasFieldErrors && !unplaced ? null : apiError.message;
}
