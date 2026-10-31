"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SessionFields } from "@/components/sessions/session-fields";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useUpdateSession } from "@/features/sessions/hooks";
import { applyServerErrors } from "@/hooks/use-form-errors";
import { toApiError } from "@/lib/api-errors";
import { localToIso, localZoneLabel, toLocalInputs } from "@/lib/formatters";
import { sessionSchema, type SessionFormInput, type SessionFormValues } from "@/lib/validators";
import type { CdsSession } from "@/types/api";

interface Props {
  open: boolean;
  onClose: () => void;
  session: CdsSession;
}

/** Form values describing a session as it currently stands, in this device's time zone. */
function valuesFrom(s: CdsSession): SessionFormInput {
  const start = toLocalInputs(new Date(s.scheduledStart));
  const end = toLocalInputs(new Date(s.scheduledEnd));
  return {
    groupId: s.groupId,
    title: s.title,
    venue: s.venue ?? "",
    description: s.description ?? "",
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    lateAfterMinutes: s.lateAfterMinutes,
    useGeofence: s.radiusM !== null,
    latitude: s.latitude,
    longitude: s.longitude,
    radiusM: s.radiusM ?? 150,
  };
}

export function EditSessionDialog({ open, onClose, session: s }: Props) {
  const update = useUpdateSession(s.id);
  const [locating, setLocating] = useState(false);
  const live = s.status === "active";

  const form = useForm<SessionFormInput, unknown, SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: valuesFrom(s),
  });
  const { errors } = form.formState;

  // Re-seed from the latest session whenever the dialog opens (it may have changed while closed).
  useEffect(() => {
    if (open) form.reset(valuesFrom(s));
  }, [open, s, form]);

  function close() {
    form.reset(valuesFrom(s));
    onClose();
  }

  function captureLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("This browser can't share its location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.setValue("latitude", pos.coords.latitude, { shouldValidate: true });
        form.setValue("longitude", pos.coords.longitude, { shouldValidate: true });
        setLocating(false);
        toast.success(`Venue location captured (±${Math.round(pos.coords.accuracy)} m)`);
      },
      () => {
        setLocating(false);
        toast.error("Couldn't get your location. Check location permission and try again.");
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  const onSubmit = form.handleSubmit(async (v) => {
    const scheduledStart = localToIso(v.date, v.startTime);
    const scheduledEnd = localToIso(v.date, v.endTime);
    if (new Date(scheduledEnd).getTime() <= Date.now()) {
      form.setError("endTime", { message: "That time has already passed." });
      return;
    }
    try {
      await update.mutateAsync({
        title: v.title,
        venue: v.venue || null,
        description: v.description || null,
        scheduledStart,
        scheduledEnd,
        lateAfterMinutes: v.lateAfterMinutes,
        latitude: v.useGeofence ? v.latitude : null,
        longitude: v.useGeofence ? v.longitude : null,
        radiusM: v.useGeofence ? v.radiusM : null,
      });
      toast.success("Session updated");
      onClose();
    } catch (error) {
      const serverEnd = toApiError(error).fields.scheduledEnd;
      if (serverEnd) {
        form.setError("endTime", { message: serverEnd });
        return;
      }
      const message = applyServerErrors(error, form.setError, ["title", "venue", "description"]);
      if (message) form.setError("root", { message });
    }
  });

  return (
    <Dialog
      open={open}
      onClose={close}
      locked={update.isPending}
      title="Edit session"
      description={
        live
          ? `This session is live. Times are in your device's time zone (${localZoneLabel()}); changing them won't change who's already marked present or late.`
          : `Times are in your device's time zone (${localZoneLabel()}).`
      }
    >
      <form onSubmit={onSubmit} noValidate className="max-h-[70dvh] space-y-5 overflow-y-auto px-0.5 pb-1">
        <SessionFields form={form} locating={locating} onCaptureLocation={captureLocation} />

        {errors.root?.message && (
          <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
            {errors.root.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close} disabled={update.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={update.isPending} loadingLabel="Saving…">
            Save changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
