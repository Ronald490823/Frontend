import { z } from "zod";

// Client-side checks mirror the backend for fast feedback; the backend remains authoritative.
export const STATE_CODE_RE = /^[A-Z]{2}\/\d{2}[A-C]\/\d{4,5}$/;

export const normalizeStateCode = (v: string) => v.replace(/\s+/g, "").toUpperCase();

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use at most 128 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.");

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your email or state code."),
  password: z.string().min(1, "Enter your password."),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(120),
    email: z.string().trim().email("Enter a valid email address."),
    stateCode: z
      .string()
      .transform(normalizeStateCode)
      .refine((v) => STATE_CODE_RE.test(v), "Use the format LA/24A/1234."),
    groupId: z.string().uuid("Choose your CDS group."),
    phone: z.string().trim().max(32).optional().or(z.literal("")),
    password: passwordSchema,
    confirmPassword: z.string(),
    consent: z.literal(true, { errorMap: () => ({ message: "Please accept to continue." }) }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  });
export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterValues = z.output<typeof registerSchema>;

export const rejectSchema = z.object({
  reason: z.string().trim().min(3, "Give a short reason (at least 3 characters).").max(500),
});
export type RejectValues = z.infer<typeof rejectSchema>;

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const groupSchema = z.object({
  areaId: z.string().uuid("Choose an area."),
  name: z.string().trim().min(2, "Enter a group name.").max(120),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9_-]{1,31}$/, "2–32 letters, numbers, dashes or underscores."),
  description: z.string().trim().max(500).optional(),
});
export type GroupValues = z.infer<typeof groupSchema>;

export const sessionSchema = z
  .object({
    groupId: z.string().uuid("Choose a group."),
    title: z.string().trim().min(2, "Give the session a title.").max(160),
    venue: z.string().trim().max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose a start time."),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose an end time."),
    lateAfterMinutes: z.coerce.number().int().min(0).max(240),
    useGeofence: z.boolean(),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    radiusM: z.coerce.number().int().min(20).max(2000),
  })
  .refine((v) => v.endTime > v.startTime, { path: ["endTime"], message: "End must be after start." })
  .refine((v) => !v.useGeofence || (v.latitude !== null && v.longitude !== null), {
    path: ["useGeofence"],
    message: "Capture the venue location, or turn location checking off.",
  });
export type SessionFormInput = z.input<typeof sessionSchema>;
export type SessionFormValues = z.output<typeof sessionSchema>;

export const manualAttendanceSchema = z.object({
  status: z.enum(["present", "late", "excused", "absent"]),
  reason: z.string().trim().min(3, "Give a short reason (at least 3 characters).").max(500),
});
export type ManualAttendanceValues = z.infer<typeof manualAttendanceSchema>;
