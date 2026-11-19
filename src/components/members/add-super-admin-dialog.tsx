"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PasswordField, TextField } from "@/components/ui/field";
import { useCreateSuperAdmin } from "@/features/users/hooks";
import { applyServerErrors } from "@/hooks/use-form-errors";
import { superAdminSchema, type SuperAdminInput, type SuperAdminValues } from "@/lib/validators";

const EMPTY: SuperAdminInput = { fullName: "", email: "", stateCode: "", phone: "", password: "", confirmPassword: "" };

/** Super admin: register another super admin. The account is approved immediately. */
export function AddSuperAdminDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateSuperAdmin();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<SuperAdminInput, unknown, SuperAdminValues>({
    resolver: zodResolver(superAdminSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    form.reset(EMPTY);
  }, [open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const admin = await create.mutateAsync({
        fullName: values.fullName,
        email: values.email,
        stateCode: values.stateCode,
        phone: values.phone || null,
        password: values.password,
      });
      toast.success(`${admin.fullName} can now sign in as a super admin`);
      onClose();
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ["fullName", "email", "stateCode", "phone", "password"]));
    }
  });

  const errors = form.formState.errors;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      locked={create.isPending}
      title="Add super admin"
      description="They get full access to every area, group and account. Share the password with them privately."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField label="Full name" autoComplete="off" error={errors.fullName?.message} {...form.register("fullName")} />
        <TextField label="Email" type="email" autoComplete="off" error={errors.email?.message} {...form.register("email")} />
        <TextField
          label="State code"
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="LA/24A/1234"
          error={errors.stateCode?.message}
          {...form.register("stateCode")}
        />
        <TextField label="Phone (optional)" type="tel" autoComplete="off" error={errors.phone?.message} {...form.register("phone")} />
        <PasswordField
          label="Temporary password"
          autoComplete="new-password"
          hint="At least 8 characters, with letters and numbers."
          error={errors.password?.message}
          {...form.register("password")}
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...form.register("confirmPassword")}
        />
        {formError && (
          <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formError}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending} loadingLabel="Creating…">
            Create super admin
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
