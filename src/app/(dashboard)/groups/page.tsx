"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { useMe } from "@/features/auth/hooks";
import { useAreas, useCreateGroup, useManagedGroups, useToggleGroupActive } from "@/features/groups/hooks";
import { applyServerErrors } from "@/hooks/use-form-errors";
import { formatDate } from "@/lib/formatters";
import { isAreaAdmin } from "@/lib/permissions";
import { groupSchema, type GroupValues } from "@/lib/validators";
import type { Group } from "@/types/api";

export default function GroupsPage() {
  const { data: me } = useMe();
  const admin = isAreaAdmin(me);
  const groups = useManagedGroups(admin);
  const [creating, setCreating] = useState(false);

  if (!admin) {
    return (
      <PageContainer>
        <EmptyState icon={<Building2 className="size-6" />} title="Not available" body="Groups are managed by Local Government Inspectors." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Administration"
        title="CDS groups"
        description="Groups in your local government area. Corps members choose one when they register."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden /> New group
          </Button>
        }
      />

      {groups.isPending ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : groups.isError ? (
        <Card>
          <ErrorState error={groups.error} onRetry={() => groups.refetch()} retrying={groups.isFetching} />
        </Card>
      ) : groups.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 className="size-6" />}
            title="No groups yet"
            body="Create your first CDS group so corps members can register."
            action={<Button onClick={() => setCreating(true)}>Create a group</Button>}
          />
        </Card>
      ) : (
        <Stagger className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {groups.data.map((g) => (
            <StaggerItem key={g.id}>
              <GroupCard group={g} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <CreateGroupDialog open={creating} onClose={() => setCreating(false)} />
    </PageContainer>
  );
}

function GroupCard({ group }: { group: Group }) {
  const toggle = useToggleGroupActive();
  async function onToggle() {
    await toggle.mutateAsync({ id: group.id, isActive: !group.isActive });
    toast.success(group.isActive ? `${group.name} closed to new registrations` : `${group.name} reopened`);
  }
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-surface text-brand">
          <Building2 className="size-5" aria-hidden />
        </span>
        <Badge tone={group.isActive ? "success" : "neutral"}>{group.isActive ? "Active" : "Inactive"}</Badge>
      </div>
      <h2 className="mt-5 text-lg font-semibold tracking-tight">{group.name}</h2>
      <p className="text-sm text-muted">{group.code}</p>
      {group.description && <p className="mt-3 line-clamp-2 text-sm text-ink/70">{group.description}</p>}
      <div className="mt-auto flex items-center justify-between pt-6">
        <p className="text-xs text-muted">Created {formatDate(group.createdAt)}</p>
        <Button size="sm" variant="ghost" onClick={onToggle} loading={toggle.isPending} loadingLabel="Saving…">
          {group.isActive ? "Deactivate" : "Activate"}
        </Button>
      </div>
    </Card>
  );
}

function CreateGroupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const areas = useAreas(open);
  const create = useCreateGroup();
  const form = useForm<GroupValues>({ resolver: zodResolver(groupSchema), defaultValues: { areaId: "", name: "", code: "", description: "" } });
  const { errors } = form.formState;

  function close() {
    form.reset();
    onClose();
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const group = await create.mutateAsync(values);
      toast.success(`${group.name} created`);
      close();
    } catch (error) {
      const message = applyServerErrors(error, form.setError, ["areaId", "name", "code", "description"]);
      if (message) form.setError("root", { message });
    }
  });

  return (
    <Dialog open={open} onClose={close} locked={create.isPending} title="New CDS group" description="Corps members will be able to register into this group straight away.">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <SelectField label="Local government area" error={errors.areaId?.message} disabled={areas.isPending} {...form.register("areaId")}>
          <option value="">{areas.isPending ? "Loading areas…" : "Choose an area"}</option>
          {areas.data?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}, {a.state}
            </option>
          ))}
        </SelectField>
        <TextField label="Group name" placeholder="Health & Sanitation" error={errors.name?.message} {...form.register("name")} />
        <TextField label="Short code" placeholder="IKJ-HEALTH" autoCapitalize="characters" error={errors.code?.message} {...form.register("code")} />
        <TextAreaField label="Description (optional)" error={errors.description?.message} {...form.register("description")} />
        {errors.root?.message && (
          <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
            {errors.root.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending} loadingLabel="Creating…">
            Create group
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
