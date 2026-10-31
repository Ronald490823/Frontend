"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Path } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PasswordField, SelectField, TextField } from "@/components/ui/field";
import { Loader } from "@/components/ui/loader";
import { usePublicGroups, useRegister } from "@/features/auth/hooks";
import { applyServerErrors } from "@/hooks/use-form-errors";
import { registerSchema, type RegisterInput, type RegisterValues } from "@/lib/validators";

const STEPS: { title: string; subtitle: string; fields: Path<RegisterInput>[] }[] = [
  { title: "About you", subtitle: "As it appears on your NYSC documents.", fields: ["fullName", "email", "phone"] },
  { title: "Your CDS group", subtitle: "Your group executive will approve your request.", fields: ["stateCode", "groupId"] },
  { title: "Secure your account", subtitle: "At least 8 characters, with letters and numbers.", fields: ["password", "confirmPassword", "consent"] },
];

export function RegisterForm() {
  const router = useRouter();
  const register = useRegister();
  const groups = usePublicGroups();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<RegisterInput, unknown, RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: { fullName: "", email: "", phone: "", stateCode: "", groupId: "", password: "", confirmPassword: "" },
  });
  const { errors } = form.formState;

  function go(to: number) {
    setDirection(to > step ? 1 : -1);
    setStep(to);
  }

  async function next() {
    if (await form.trigger(STEPS[step]!.fields)) go(step + 1);
  }

  const onSubmit = form.handleSubmit(
    async (values) => {
      setFormError(null);
      try {
        await register.mutateAsync(values);
        toast.success("Account created. Your executive has been notified.");
        router.replace("/pending-approval");
      } catch (error) {
        const allFields = STEPS.flatMap((s) => s.fields);
        const message = applyServerErrors(error, form.setError, allFields);
        // Jump back to the first step that has a server-side field error.
        const errored = STEPS.findIndex((s) => s.fields.some((f) => form.getFieldState(f).error));
        if (errored >= 0 && errored !== step) go(errored);
        setFormError(message);
      }
    },
    () => {
      const errored = STEPS.findIndex((s) => s.fields.some((f) => form.getFieldState(f).error));
      if (errored >= 0) go(errored);
    },
  );

  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  return (
    <div>
      <div className="mb-8 flex items-center gap-2" aria-hidden>
        {STEPS.map((_, i) => (
          <motion.span
            key={i}
            className="h-1.5 rounded-full bg-ink/10"
            animate={{ width: i === step ? 32 : 12, backgroundColor: i <= step ? "#0f766e" : "rgba(23,32,51,0.1)" }}
          />
        ))}
      </div>
      <p className="text-sm font-medium text-brand" aria-live="polite">
        Step {step + 1} of {STEPS.length}
      </p>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 * direction }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 * direction }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
        >
          <h1 className="mt-1 text-4xl font-semibold tracking-[-0.04em]">{current.title}</h1>
          <p className="mt-2 text-muted">{current.subtitle}</p>
        </motion.div>
      </AnimatePresence>

      {formError && (
        <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-600/10">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {formError}
        </div>
      )}

      <form
        noValidate
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          if (isLast) void onSubmit();
          else void next();
        }}
      >
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            className="space-y-5"
            initial={{ opacity: 0, x: 40 * direction, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -40 * direction, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
          >
            {step === 0 && (
              <>
                <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...form.register("fullName")} />
                <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...form.register("email")} />
                <TextField label="Phone (optional)" type="tel" autoComplete="tel" error={errors.phone?.message} {...form.register("phone")} />
              </>
            )}
            {step === 1 && (
              <>
                <TextField
                  label="NYSC state code"
                  placeholder="LA/24A/1234"
                  autoCapitalize="characters"
                  hint="We check the format only; your executive confirms you."
                  error={errors.stateCode?.message}
                  {...form.register("stateCode")}
                />
                {groups.isPending ? (
                  <div className="flex h-20 items-center text-brand">
                    <Loader label="Loading CDS groups…" showLabel />
                  </div>
                ) : groups.isError ? (
                  <div role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
                    We couldn&apos;t load CDS groups.{" "}
                    <button type="button" className="font-medium underline" onClick={() => groups.refetch()}>
                      Try again
                    </button>
                  </div>
                ) : (
                  <SelectField label="CDS group" error={errors.groupId?.message} {...form.register("groupId")}>
                    <option value="">Choose your group</option>
                    {groups.data.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} — {g.areaName}
                      </option>
                    ))}
                  </SelectField>
                )}
              </>
            )}
            {step === 2 && (
              <>
                <PasswordField label="Password" autoComplete="new-password" error={errors.password?.message} {...form.register("password")} />
                <PasswordField
                  label="Confirm password"
                  autoComplete="new-password"
                  error={errors.confirmPassword?.message}
                  {...form.register("confirmPassword")}
                />
                <label className="flex items-start gap-3 rounded-2xl bg-white p-4 text-sm ring-1 ring-hairline">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-brand"
                    aria-invalid={!!errors.consent}
                    aria-describedby={errors.consent ? "consent-error" : undefined}
                    {...form.register("consent")}
                  />
                  <span className="text-ink/80">
                    I agree that my details and attendance records may be processed for CDS administration by my
                    group executives and Local Government Inspector.
                  </span>
                </label>
                {errors.consent && (
                  <p id="consent-error" role="alert" className="-mt-3 text-[13px] text-rose-600">
                    {errors.consent.message}
                  </p>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center gap-3">
          {step > 0 && (
            <Button variant="secondary" size="lg" onClick={() => go(step - 1)} disabled={register.isPending} aria-label="Previous step">
              <ArrowLeft className="size-4" aria-hidden />
            </Button>
          )}
          <Button type="submit" size="lg" className="flex-1" loading={register.isPending} loadingLabel="Creating account…">
            {isLast ? (register.isPending ? "Creating account…" : "Create account") : "Continue"}
          </Button>
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
