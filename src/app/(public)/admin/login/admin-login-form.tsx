"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { RevealText } from "@/components/motion/reveal-text";
import { Button } from "@/components/ui/button";
import { PasswordField, TextField } from "@/components/ui/field";
import { useLogin, useLogout } from "@/features/auth/hooks";
import { applyServerErrors } from "@/hooks/use-form-errors";
import { isSuperAdmin } from "@/lib/permissions";
import { loginSchema, type LoginValues } from "@/lib/validators";

/**
 * Sign-in for super admins. Uses the normal login endpoint, then refuses (and signs out)
 * any account that isn't a super admin. The backend still authorizes every admin action.
 */
export function AdminLoginForm() {
  const router = useRouter();
  const login = useLogin();
  const logout = useLogout();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: "", password: "" } });
  const { errors } = form.formState;
  const busy = login.isPending || logout.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const me = await login.mutateAsync(values);
      if (!isSuperAdmin(me)) {
        await logout.mutateAsync().catch(() => undefined);
        setFormError("This account isn't a super admin. Use the regular sign-in page instead.");
        return;
      }
      toast.success(`Welcome back, ${me.fullName.split(" ")[0]}`);
      router.replace("/accounts");
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ["identifier", "password"]));
    }
  });

  return (
    <div>
      <span className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">
        <ShieldCheck className="size-4" aria-hidden /> Super admin
      </span>
      <RevealText text="Admin sign in." className="mt-4 text-4xl font-semibold tracking-[-0.04em]" />
      <p className="mt-2 text-muted">For platform administrators only. New admins are added by an existing super admin.</p>

      <AnimatePresence>
        {formError && (
          <motion.div
            role="alert"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-600/10">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {formError}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <TextField
          label="Email or state code"
          autoComplete="username"
          autoCapitalize="none"
          placeholder="admin@example.gov.ng"
          error={errors.identifier?.message}
          {...form.register("identifier")}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...form.register("password")}
        />
        <Button type="submit" size="lg" className="w-full" loading={busy} loadingLabel="Signing in…">
          {busy ? "Signing in…" : "Sign in as admin"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Not an administrator?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Regular sign in
        </Link>
      </p>
    </div>
  );
}
