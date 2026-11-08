"use client";

import { History } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { useActivity } from "@/features/audit/hooks";
import { formatDate } from "@/lib/formatters";

const PAGE_SIZE = 15;

const when = (iso: string) => formatDate(iso, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * Past executive/admin actions from the audit log: who did what, and when.
 * Filter by `actorId` for one exco's history, or `groupId` for a whole group.
 */
export function ActivityTable({
  title = "Past actions",
  actorId,
  groupId,
  showActor = true,
}: {
  title?: string;
  actorId?: string;
  groupId?: string;
  showActor?: boolean;
}) {
  const [page, setPage] = useState(1);
  const activity = useActivity({ actorId, groupId, page });
  const items = activity.data?.items ?? [];
  const pages = activity.data ? Math.max(1, Math.ceil(activity.data.total / PAGE_SIZE)) : 1;

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3 text-sm font-medium">
        <History className="size-4 text-brand" aria-hidden /> {title}
        {activity.data && <span className="ml-auto text-xs text-muted">{activity.data.total}</span>}
      </div>
      {activity.isPending ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : activity.isError ? (
        <ErrorState error={activity.error} onRetry={() => activity.refetch()} retrying={activity.isFetching} />
      ) : items.length === 0 ? (
        <EmptyState icon={<History className="size-6" />} title="No actions yet" body="Starting, ending and editing sessions, recording attendance and approving members all show up here." />
      ) : (
        <>
          {/* Phones: stacked rows. */}
          <ul className="divide-y divide-hairline sm:hidden">
            {items.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <p className="text-sm">{a.description}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {showActor && a.actorName && <>{a.actorName} · </>}
                  {when(a.createdAt)}
                  {!groupId && a.groupName && <> · {a.groupName}</>}
                </p>
              </li>
            ))}
          </ul>
          <table className="hidden w-full text-sm sm:table">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th scope="col" className="w-44 px-4 py-2.5 font-medium">Date</th>
                {showActor && <th scope="col" className="px-3 py-2.5 font-medium">Executive</th>}
                <th scope="col" className="px-3 py-2.5 font-medium">Action</th>
                {!groupId && <th scope="col" className="px-4 py-2.5 font-medium">Group</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {items.map((a) => (
                <tr key={a.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-muted tabular-nums">{when(a.createdAt)}</td>
                  {showActor && (
                    <td className="px-3 py-3 font-medium">
                      {a.actorId ? (
                        <Link href={`/members/${a.actorId}`} className="hover:text-brand">
                          {a.actorName ?? "—"}
                        </Link>
                      ) : (
                        "System"
                      )}
                    </td>
                  )}
                  <td className="px-3 py-3">
                    {a.targetType === "session" && a.targetId && a.action !== "session.deleted" ? (
                      <Link href={`/sessions/${a.targetId}`} className="hover:text-brand">
                        {a.description}
                      </Link>
                    ) : (
                      a.description
                    )}
                  </td>
                  {!groupId && <td className="px-4 py-3 text-muted">{a.groupName ?? "—"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-hairline px-4 py-3 text-xs text-muted">
              <span>
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Newer
                </Button>
                <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  Older
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
