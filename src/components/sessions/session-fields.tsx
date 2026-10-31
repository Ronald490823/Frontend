"use client";

import { LocateFixed, MapPin } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import type { SessionFormInput, SessionFormValues } from "@/lib/validators";

interface Props {
  form: UseFormReturn<SessionFormInput, unknown, SessionFormValues>;
  locating: boolean;
  onCaptureLocation: () => void;
}

/** The shared editable fields of a session, used by both the create and edit dialogs. */
export function SessionFields({ form, locating, onCaptureLocation }: Props) {
  const { errors } = form.formState;
  const useGeofence = form.watch("useGeofence");
  const latitude = form.watch("latitude");
  const radius = form.watch("radiusM");

  return (
    <>
      <TextField label="Title" error={errors.title?.message} {...form.register("title")} />
      <TextField label="Venue (optional)" placeholder="LGA Secretariat Hall" error={errors.venue?.message} {...form.register("venue")} />
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3 sm:col-span-1">
          <TextField label="Date" type="date" error={errors.date?.message} {...form.register("date")} />
        </div>
        <TextField label="Starts" type="time" error={errors.startTime?.message} {...form.register("startTime")} />
        <TextField label="Ends" type="time" error={errors.endTime?.message} {...form.register("endTime")} />
      </div>
      <TextField
        label="Late after (minutes)"
        type="number"
        min={0}
        max={240}
        hint="Check-ins this long after you start the session are marked late."
        error={errors.lateAfterMinutes?.message}
        {...form.register("lateAfterMinutes")}
      />

      <div className="rounded-2xl bg-canvas p-4 ring-1 ring-hairline">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 size-4 accent-brand" {...form.register("useGeofence")} />
          <span>
            <span className="block text-sm font-medium">Check members are at the venue</span>
            <span className="block text-[13px] text-muted">
              Members share their location when they scan. GPS can be inaccurate or spoofed, so treat it as supporting evidence.
            </span>
          </span>
        </label>
        {useGeofence && (
          <div className="mt-4 space-y-4">
            <Button variant="secondary" size="sm" onClick={onCaptureLocation} loading={locating} loadingLabel="Locating…">
              {!locating && (latitude !== null ? <MapPin className="size-4" aria-hidden /> : <LocateFixed className="size-4" aria-hidden />)}
              {latitude !== null ? "Location captured — update" : "Use my current location as the venue"}
            </Button>
            <div>
              <label htmlFor="radius" className="flex justify-between text-[13px] font-medium text-ink/80">
                Allowed radius <span className="tabular-nums text-muted">{radius} m</span>
              </label>
              <input id="radius" type="range" min={20} max={1000} step={10} className="mt-2 w-full accent-brand" {...form.register("radiusM")} />
            </div>
          </div>
        )}
        {errors.useGeofence && (
          <p role="alert" className="mt-2 text-[13px] text-rose-600">
            {errors.useGeofence.message}
          </p>
        )}
      </div>
    </>
  );
}
