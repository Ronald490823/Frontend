"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/field";
import { useUpdateUser } from "@/features/users/hooks";
import { applyServerErrors } from "@/hooks/use-form-errors";
import { adminUserSchema, type AdminUserInput, type AdminUserValues } from "@/lib/validators";
import type { AdminUpdateUser } from "@/types/api";

interface EditableUser {
  id: string;
  fullName: string;
  email: string;
  stateCode: string;
  phone: string | null;
}

/** Super admin: correct someone's name, email, state code or phone. Only changed fields are sent. */
export function EditUserDialog({ user, onClose }: { user: EditableUser | null; onClose: () => void }) {
  const update = useUpdateUser(user?.id ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<AdminUserInput, unknown, AdminUserValues>({ resolver: zodResolver(adminUserSchema) });

  useEffect(() => {
    if (!user) return;
    setFormError(null);
    form.reset({ fullName: user.fullName, email: user.email, stateCode: user.stateCode, phone: user.phone ?? "" });
  }, [user, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!user) return;
    const changes: AdminUpdateUser = {};
    if (values.fullName !== user.fullName) changes.fullName = values.fullName;
    if (values.email.toLowerCase() !== user.email) changes.email = values.email;
    if (values.stateCode !== user.stateCode) changes.stateCode = values.stateCode;
    if ((values.phone ?? "") !== (user.phone ?? "")) changes.phone = values.phone ?? "";
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    setFormError(null);
    try {
      await update.mutateAsync(changes);
      toast.success("Profile updated");
      onClose();
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ["fullName", "email", "stateCode", "phone"]));
    }
  });

  const errors = form.formState.errors;
  return (
    <Dialog
      open={!!user}
      onClose={onClose}
      locked={update.isPending}
      title="Edit profile"
      description="Changes take effect immediately. The person signs in with the new email or state code."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <TextField label="Full name" autoComplete="off" error={errors.fullName?.message} {...form.register("fullName")} />
        <TextField label="Email" type="email" autoComplete="off" error={errors.email?.message} {...form.register("email")} />
        <TextField
          label="State code"
          autoComplete="off"
          placeholder="LA/24A/1234"
          error={errors.stateCode?.message}
          {...form.register("stateCode")}
        />
        <TextField label="Phone" type="tel" autoComplete="off" hint="Leave empty to remove." error={errors.phone?.message} {...form.register("phone")} />
        {formError && (
          <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formError}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={update.isPending}>
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
