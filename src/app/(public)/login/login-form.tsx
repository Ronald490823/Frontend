"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { RevealText } from "@/components/motion/reveal-text";
import { Button } from "@/components/ui/button";
import { PasswordField, TextField } from "@/components/ui/field";
import { useLogin } from "@/features/auth/hooks";
import { applyServerErrors } from "@/hooks/use-form-errors";
import { homePathFor } from "@/lib/permissions";
import { loginSchema, type LoginValues } from "@/lib/validators";

function safeNext(next: string | null) {
  // Only allow same-site relative paths (prevents open redirects).
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { identifier: "", password: "" } });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const me = await login.mutateAsync(values);
      toast.success(`Welcome back, ${me.fullName.split(" ")[0]}`);
      const home = homePathFor(me);
      router.replace(home === "/dashboard" ? (safeNext(params.get("next")) ?? home) : home);
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ["identifier", "password"]));
    }
  });

  return (
    <div>
      <RevealText text="Sign in." className="text-4xl font-semibold tracking-[-0.04em]" />
      <p className="mt-2 text-muted">Use your email address or NYSC state code.</p>

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
          placeholder="you@example.com or LA/24A/1234"
          error={errors.identifier?.message}
          {...form.register("identifier")}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...form.register("password")}
        />
        <Button type="submit" size="lg" className="w-full" loading={login.isPending} loadingLabel="Signing in…">
          {login.isPending ? "Signing in…" : "Continue"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        New corps member?{" "}
        <Link href="/register" className="font-medium text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
