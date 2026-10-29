// All times are stored in UTC and shown — and entered — in the device's own time zone.
// For corps members in Nigeria that is WAT; a laptop set to another zone stays consistent
// with its own clock instead of silently shifting scheduled times.

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) {
  return new Intl.DateTimeFormat("en-NG", opts).format(new Date(iso));
}

export function formatRelative(iso: string) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  }
  return "just now";
}

export function formatTime(iso: string) {
  return formatDate(iso, { hour: "numeric", minute: "2-digit" });
}

export function formatSessionWindow(startIso: string, endIso: string) {
  return `${formatDate(startIso, { weekday: "short", day: "numeric", month: "short" })} · ${formatTime(startIso)} – ${formatTime(endIso)}`;
}

/** "2026-10-29" + "15:30" on this device's clock → UTC ISO string. */
export function localToIso(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Date/time strings for <input type="date|time"> in the device's local zone. */
export function toLocalInputs(d: Date) {
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

/** Short label for the device's zone, e.g. "WAT" or "PDT". */
export function localZoneLabel() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" }).formatToParts(new Date());
  return parts.find((p) => p.type === "timeZoneName")?.value ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
