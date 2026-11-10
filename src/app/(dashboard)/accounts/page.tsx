"use client";

import { ArchiveRestore, ChevronLeft, ChevronRight, Pencil, Search, Trash2, UserCog } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { EditUserDialog } from "@/components/members/edit-user-dialog";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Loader } from "@/components/ui/loader";
import { Segmented } from "@/components/ui/segmented";
import { useMe } from "@/features/auth/hooks";
import { useAdminUsers, useDeleteUser, useRestoreUser } from "@/features/users/hooks";
import { useDebounced } from "@/hooks/use-debounced";
import { formatRelative, initials } from "@/lib/formatters";
import { isSuperAdmin } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { AccountState, AdminUser } from "@/types/api";

const TABS: { value: AccountState; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "deleted", label: "Deleted" },
  { value: "all", label: "All" },
];

type Pending = { kind: "delete" | "restore"; user: AdminUser };

/** Super admin: every account, with profile corrections, soft delete and reactivation. */
export default function AccountsPage() {
  const { data: me } = useMe();
  const allowed = isSuperAdmin(me);
  const [state, setState] = useState<AccountState>("active");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const q = useDebounced(search.trim());
  const list = useAdminUsers({ q, state, page }, allowed);
  const del = useDeleteUser();
  const restore = useRestoreUser();

  useEffect(() => setPage(1), [state, q]);

  if (!allowed) {
    return (
      <PageContainer>
        <EmptyState icon={<UserCog className="size-6" />} title="Not available" body="Only super admins manage accounts." />
      </PageContainer>
    );
  }

  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;
  const busy = del.isPending || restore.isPending;

  function confirm() {
    if (!pending) return;
    const { kind, user } = pending;
    const run = kind === "delete" ? del.mutateAsync(user.id) : restore.mutateAsync(user.id);
    void run
      .then(() => {
        toast.success(kind === "delete" ? `${user.fullName} deleted` : `${user.fullName} reactivated`);
        setPending(null);
      })
      .catch(() => undefined);
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Administration"
        title="Accounts"
        description="Every account on the platform. Correct details, delete accounts, or bring deleted ones back."
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented label="Account state" value={state} onChange={setState} options={TABS} />
        <label className="relative block sm:w-80">
          <span className="sr-only">Search by name, email or state code</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or state code"
            className="h-12 w-full rounded-2xl bg-white pl-11 pr-4 text-[15px] ring-1 ring-hairline placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-brand/70"
          />
        </label>
      </div>

      <Card className="overflow-hidden p-0">
        {list.isPending ? (
          <ul aria-busy className="divide-y divide-hairline">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                <Skeleton className="size-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </li>
            ))}
          </ul>
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} retrying={list.isFetching} />
        ) : list.data.items.length === 0 ? (
          <EmptyState
            icon={<UserCog className="size-6" />}
            title={q ? "No matches" : state === "deleted" ? "No deleted accounts" : "No accounts"}
            body={q ? `Nobody matches “${q}”.` : undefined}
          />
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3 text-sm text-muted sm:px-5">
              <span>
                {list.data.total} {list.data.total === 1 ? "account" : "accounts"}
              </span>
              {list.isFetching && <Loader size="sm" label="Updating…" />}
            </div>
            <ul className="divide-y divide-hairline">
              {list.data.items.map((u) => (
                <AccountRow
                  key={u.id}
                  user={u}
                  isSelf={u.id === me?.id}
                  onEdit={() => setEditing(u)}
                  onDelete={() => setPending({ kind: "delete", user: u })}
                  onRestore={() => setPending({ kind: "restore", user: u })}
                />
              ))}
            </ul>
            {totalPages > 1 && (
              <nav aria-label="Pagination" className="flex items-center justify-between border-t border-hairline px-4 py-3 sm:px-5">
                <Button size="sm" variant="ghost" onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || list.isFetching}>
                  <ChevronLeft className="size-4" aria-hidden /> Previous
                </Button>
                <span className="text-sm text-muted">
                  Page {page} of {totalPages}
                </span>
                <Button size="sm" variant="ghost" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages || list.isFetching}>
                  Next <ChevronRight className="size-4" aria-hidden />
                </Button>
              </nav>
            )}
          </>
        )}
      </Card>

      <EditUserDialog user={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={!!pending}
        title={pending ? `${pending.kind === "delete" ? "Delete" : "Reactivate"} ${pending.user.fullName}?` : ""}
        body={
          pending?.kind === "delete"
            ? "They'll be signed out and hidden from every list and roster. Their records stay, and you can reactivate the account later."
            : "They'll be able to sign in again, and return to their CDS group as before."
        }
        confirmLabel={pending?.kind === "delete" ? "Delete account" : "Reactivate"}
        tone={pending?.kind === "delete" ? "danger" : "primary"}
        pending={busy}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      />
    </PageContainer>
  );
}

function AccountRow({
  user: u,
  isSelf,
  onEdit,
  onDelete,
  onRestore,
}: {
  user: AdminUser;
  isSelf: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  const deleted = !!u.deletedAt;
  const isAdmin = u.adminRoles.length > 0;
  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
      <Link href={`/members/${u.id}`} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold",
            deleted ? "bg-ink/5 text-ink/40" : "bg-surface text-brand-deep",
          )}
        >
          {initials(u.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cn("truncate font-medium", deleted && "text-ink/60")}>{u.fullName}</span>
            {u.adminRoles.includes("super_admin") && <Badge tone="info">Super admin</Badge>}
            {u.adminRoles.includes("lgi") && <Badge tone="info">LGI</Badge>}
            {u.membershipRole === "executive" && u.membershipStatus === "approved" && <Badge tone="info">Executive</Badge>}
            {deleted && <Badge tone="danger">Deleted</Badge>}
            {!deleted && u.accountStatus !== "approved" && <Badge tone="warning">{u.accountStatus}</Badge>}
          </p>
          <p className="truncate text-sm text-muted">
            {u.stateCode} · {u.email}
          </p>
          <p className="truncate text-xs text-muted">
            {u.groupName ?? "No CDS group"}
            {deleted && u.deletedAt ? ` · deleted ${formatRelative(u.deletedAt)}` : ""}
          </p>
        </div>
      </Link>
      <div className="flex shrink-0 gap-2 pl-14 sm:pl-0">
        <Button size="sm" variant="secondary" onClick={onEdit} aria-label={`Edit ${u.fullName}`}>
          <Pencil className="size-4" aria-hidden /> Edit
        </Button>
        {deleted ? (
          <Button size="sm" onClick={onRestore}>
            <ArchiveRestore className="size-4" aria-hidden /> Reactivate
          </Button>
        ) : (
          !isSelf &&
          !isAdmin && (
            <Button size="sm" variant="secondary" className="text-rose-700" onClick={onDelete} aria-label={`Delete ${u.fullName}`}>
              <Trash2 className="size-4" aria-hidden /> Delete
            </Button>
          )
        )}
      </div>
    </li>
  );
}
