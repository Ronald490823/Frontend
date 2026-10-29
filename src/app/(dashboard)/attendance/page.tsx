"use client";

import { CalendarCheck2, ChevronLeft, ChevronRight, PencilLine, Smartphone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { QrScanner } from "@/components/attendance/qr-scanner";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { AttendanceBadge } from "@/components/sessions/status";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { useMe } from "@/features/auth/hooks";
import { useMyAttendance } from "@/features/attendance/hooks";
import { formatDate, formatTime } from "@/lib/formatters";

export default function AttendancePage() {
  const { data: me } = useMe();
  const [page, setPage] = useState(1);
  const history = useMyAttendance(page);
  const hasGroup = me?.membership?.status === "approved";
  const totalPages = history.data ? Math.max(1, Math.ceil(history.data.total / history.data.pageSize)) : 1;

  return (
    <PageContainer>
      <PageHeader eyebrow="Attendance" title="Check in" description={hasGroup ? `${me?.membership?.groupName} CDS` : undefined} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div>
          {hasGroup ? (
            <QrScanner />
          ) : (
            <Card>
              <EmptyState
                icon={<CalendarCheck2 className="size-6" />}
                title="No CDS group"
                body="Check-in is for approved members of a CDS group."
              />
            </Card>
          )}
          <p className="mt-4 px-2 text-center text-xs text-muted">
            Trouble scanning? Your executive can record your attendance manually.
          </p>
        </div>

        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="mb-4 text-lg font-semibold tracking-tight">
            Your history
          </h2>
          {history.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-3xl" />
              ))}
            </div>
          ) : history.isError ? (
            <Card>
              <ErrorState error={history.error} onRetry={() => history.refetch()} retrying={history.isFetching} />
            </Card>
          ) : history.data.items.length === 0 ? (
            <Card>
              <EmptyState icon={<CalendarCheck2 className="size-6" />} title="No attendance yet" body="Sessions you check in to will appear here." />
            </Card>
          ) : (
            <>
              <Stagger key={page} className="space-y-3">
                {history.data.items.map((item) => (
                  <StaggerItem key={item.id}>
                    <Link
                      href={`/sessions/${item.sessionId}`}
                      className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-hairline transition-shadow hover:shadow-lift"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface text-brand">
                        {item.method === "qr" ? <Smartphone className="size-5" aria-label="Scanned QR" /> : <PencilLine className="size-5" aria-label="Recorded by executive" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{item.sessionTitle}</p>
                        <p className="truncate text-sm text-muted">
                          {formatDate(item.scheduledStart, { weekday: "short", day: "numeric", month: "short" })} · in at {formatTime(item.checkedInAt)}
                        </p>
                      </div>
                      <AttendanceBadge status={item.status} />
                    </Link>
                  </StaggerItem>
                ))}
              </Stagger>
              {totalPages > 1 && (
                <nav aria-label="Pagination" className="mt-5 flex items-center justify-between">
                  <Button size="sm" variant="ghost" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                    <ChevronLeft className="size-4" aria-hidden /> Newer
                  </Button>
                  <span className="text-sm text-muted">
                    {page} / {totalPages}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
                    Older <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
