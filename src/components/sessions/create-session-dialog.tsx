"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LocateFixed, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField, TextField } from "@/components/ui/field";
import { useCreateSession } from "@/features/sessions/hooks";
import { applyServerErrors } from "@/hooks/use-form-errors";
import { toApiError } from "@/lib/api-errors";
import { localToIso, localZoneLabel, toLocalInputs } from "@/lib/formatters";
import { sessionSchema, type SessionFormInput, type SessionFormValues } from "@/lib/validators";

interface Props {
  open: boolean;
  onClose: () => void;
  groups: { id: string; name: string }[];
}

/** Start at the next 5-minute mark on this device's clock; end two hours later (same day). */
function defaultTimes() {
  const start = new Date(Math.ceil(Date.now() / 300_000) * 300_000);
  const endOfDay = new Date(start);
  endOfDay.setHours(23, 55, 0, 0);
  const end = new Date(Math.min(start.getTime() + 2 * 3_600_000, endOfDay.getTime()));
  const s = toLocalInputs(start);
  return { date: s.date, startTime: s.time, endTime: toLocalInputs(end).time };
}

export function CreateSessionDialog({ open, onClose, groups }: Props) {
  const router = useRouter();
  const create = useCreateSession();
  const [locating, setLocating] = useState(false);

  const form = useForm<SessionFormInput, unknown, SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      groupId: groups[0]?.id ?? "",
      title: "Weekly CDS meeting",
      venue: "",
      description: "",
      ...defaultTimes(),
      lateAfterMinutes: 30,
      useGeofence: false,
      latitude: null,
      longitude: null,
      radiusM: 150,
    },
  });
  const { errors } = form.formState;
  const useGeofence = form.watch("useGeofence");
  const latitude = form.watch("latitude");
  const radius = form.watch("radiusM");

  // Fresh, sensible times every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    const t = defaultTimes();
    form.setValue("date", t.date);
    form.setValue("startTime", t.startTime);
    form.setValue("endTime", t.endTime);
    if (!form.getValues("groupId") && groups[0]) form.setValue("groupId", groups[0].id);
  }, [open, groups, form]);

  function close() {
    form.reset();
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
      const session = await create.mutateAsync({
        groupId: v.groupId,
        title: v.title,
        venue: v.venue || null,
        description: v.description || null,
        scheduledStart,
        scheduledEnd,
        lateAfterMinutes: v.lateAfterMinutes,
        ...(v.useGeofence ? { latitude: v.latitude, longitude: v.longitude, radiusM: v.radiusM } : {}),
      });
      toast.success("Session scheduled");
      close();
      router.push(`/sessions/${session.id}`);
    } catch (error) {
      const serverEnd = toApiError(error).fields.scheduledEnd;
      if (serverEnd) {
        form.setError("endTime", { message: serverEnd });
        return;
      }
      const message = applyServerErrors(error, form.setError, ["title", "venue", "description", "groupId"]);
      if (message) form.setError("root", { message });
    }
  });

  return (
    <Dialog open={open} onClose={close} locked={create.isPending} title="Schedule a session" description={`Times are in your device's time zone (${localZoneLabel()}). The session starts automatically at its start time.`}>
      <form onSubmit={onSubmit} noValidate className="max-h-[70dvh] space-y-5 overflow-y-auto px-0.5 pb-1">
        {groups.length > 1 && (
          <SelectField label="Group" error={errors.groupId?.message} {...form.register("groupId")}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </SelectField>
        )}
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
              <Button variant="secondary" size="sm" onClick={captureLocation} loading={locating} loadingLabel="Locating…">
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

        {errors.root?.message && (
          <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
            {errors.root.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending} loadingLabel="Scheduling…">
            Schedule session
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
