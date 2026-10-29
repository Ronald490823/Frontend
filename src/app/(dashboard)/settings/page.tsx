"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TextField } from "@/components/ui/field";
import { useMe, useUpdateProfile } from "@/features/auth/hooks";
import { applyServerErrors } from "@/hooks/use-form-errors";
import { profileSchema, type ProfileValues } from "@/lib/validators";

export default function SettingsPage() {
  const { data: me } = useMe();
  const update = useUpdateProfile();
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: { fullName: me?.fullName ?? "", phone: me?.phone ?? "" },
  });
  const { errors, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync(values);
      toast.success("Profile updated");
    } catch (error) {
      applyServerErrors(error, form.setError, ["fullName", "phone"]);
    }
  });

  if (!me) return null;

  return (
    <PageContainer>
      <PageHeader eyebrow="Account" title="Settings" description="Update how your name and phone number appear to your executives." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...form.register("fullName")} />
            <TextField label="Phone" type="tel" autoComplete="tel" error={errors.phone?.message} {...form.register("phone")} />
            <div className="flex justify-end">
              <Button type="submit" disabled={!isDirty} loading={update.isPending} loadingLabel="Saving…">
                Save changes
              </Button>
            </div>
          </form>
        </Card>
        <Card className="bg-surface/60">
          <h2 className="font-semibold">Locked details</h2>
          <p className="mt-1 text-sm text-muted">Contact your LGI to correct these.</p>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-muted">Email</dt>
              <dd className="font-medium">{me.email}</dd>
            </div>
            <div>
              <dt className="text-muted">State code</dt>
              <dd className="font-medium">{me.stateCode}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </PageContainer>
  );
}
