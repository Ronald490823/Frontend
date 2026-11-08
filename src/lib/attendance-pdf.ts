import type { CdsSession, Roster, RosterEntry } from "@/types/api";
import { formatDate, formatSessionWindow, formatTime } from "./formatters";

const INK: [number, number, number] = [23, 32, 51];
const MUTED: [number, number, number] = [107, 114, 128];
const BRAND: [number, number, number] = [15, 118, 110];
const HAIRLINE: [number, number, number] = [229, 231, 235];

const STATUS: Record<string, { label: string; color: [number, number, number] }> = {
  present: { label: "Present", color: [4, 120, 87] },
  late: { label: "Late", color: [180, 83, 9] },
  excused: { label: "Excused", color: [37, 99, 235] },
  absent: { label: "Absent", color: [190, 18, 60] },
  none: { label: "Not yet", color: MUTED },
};

const METHOD = { qr: "QR scan", location: "Location", manual: "Recorded by exco" } as const;

/**
 * A printable attendance register for one session: header, summary, and every corps member on
 * the roster (checked-in first, in arrival order, then everyone else A–Z). Loaded on demand so
 * jsPDF never ships in the normal page bundle.
 */
export async function downloadAttendancePdf(s: CdsSession, roster: Roster) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const live = s.status === "active";
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;

  const showedUp = (e: RosterEntry) => e.attendance?.status === "present" || e.attendance?.status === "late";
  const inOrder = roster.entries
    .filter(showedUp)
    .sort((a, b) => a.attendance!.checkedInAt.localeCompare(b.attendance!.checkedInAt));
  const rest = roster.entries.filter((e) => !showedUp(e)).sort((a, b) => a.fullName.localeCompare(b.fullName));

  // Header band
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 6, "F");
  doc.setTextColor(...BRAND);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CDS ATTENDANCE REGISTER", M, 36);
  doc.setTextColor(...INK);
  doc.setFontSize(20);
  const titleLines = doc.splitTextToSize(s.title, W - M * 2) as string[];
  doc.text(titleLines, M, 60);
  let y = 60 + (titleLines.length - 1) * 22 + 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  // Line 1: where and when. Line 2: who ran it.
  const where = [s.groupName, formatSessionWindow(s.scheduledStart, s.scheduledEnd), s.venue].filter(Boolean);
  const who = [
    s.actualStart
      ? `Started ${formatTime(s.actualStart)} ${s.startedByName ? `by ${s.startedByName}` : "automatically"}`
      : null,
    s.actualEnd ? `Ended ${formatTime(s.actualEnd)}${s.closedByName ? ` by ${s.closedByName}` : ""}` : null,
    s.requiresLocation ? `Location check within ${s.radiusM} m` : null,
  ].filter(Boolean);
  for (const line of [where, who]) {
    if (!line.length) continue;
    const wrapped = doc.splitTextToSize(line.join("   ·   "), W - M * 2) as string[];
    doc.text(wrapped, M, y);
    y += wrapped.length * 13;
  }
  y += 10;

  // Summary tiles
  const { summary } = roster;
  const attended = summary.present + summary.late;
  const rate = summary.eligible ? Math.round((attended / summary.eligible) * 100) : 0;
  const tiles: [string, string, [number, number, number]][] = [
    ["Members", String(summary.eligible), INK],
    ["Present", String(summary.present), STATUS.present.color],
    ["Late", String(summary.late), STATUS.late.color],
    ["Excused", String(summary.excused), STATUS.excused.color],
    [live ? "Not yet in" : "Absent", String(live ? summary.notRecorded : summary.absent), live ? MUTED : STATUS.absent.color],
    ["Turnout", `${rate}%`, BRAND],
  ];
  const gap = 8;
  const tw = (W - M * 2 - gap * (tiles.length - 1)) / tiles.length;
  tiles.forEach(([label, value, color], i) => {
    const x = M + i * (tw + gap);
    doc.setDrawColor(...HAIRLINE);
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(x, y, tw, 48, 6, 6, "FD");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x + 10, y + 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...color);
    doc.text(value, x + 10, y + 38);
    doc.setFont("helvetica", "normal");
  });
  y += 68;

  const rows = [...inOrder.map((e, i) => ({ n: String(i + 1), e })), ...rest.map((e) => ({ n: "–", e }))];
  const stateOf = (e: RosterEntry) => e.attendance?.status ?? (live ? "none" : "absent");

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, bottom: 50 },
    head: [["#", "Name", "State code", "Role", "Status", "Checked in", "Method"]],
    body: rows.map(({ n, e }) => [
      n,
      e.fullName,
      e.stateCode,
      e.role === "executive" ? "Exco" : "Member",
      STATUS[stateOf(e)].label,
      // Only a check-in has a meaningful time; for absent/excused it's just when it was recorded.
      showedUp(e) ? formatTime(e.attendance!.checkedInAt) : "—",
      e.attendance ? METHOD[e.attendance.method] : "—",
    ]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9, textColor: INK, cellPadding: { top: 7, bottom: 7, left: 6, right: 6 } },
    headStyles: { fontStyle: "bold", fontSize: 8, textColor: MUTED, fillColor: [243, 244, 246] },
    alternateRowStyles: { fillColor: [250, 250, 251] },
    columnStyles: {
      0: { cellWidth: 26, halign: "center", textColor: MUTED },
      1: { fontStyle: "bold" },
      4: { fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        data.cell.styles.textColor = STATUS[stateOf(rows[data.row.index].e)].color;
      }
    },
  });

  // Footer on every page
  const pages = doc.getNumberOfPages();
  const generated = formatDate(new Date().toISOString(), { dateStyle: "medium", timeStyle: "short" });
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const H = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...HAIRLINE);
    doc.line(M, H - 34, W - M, H - 34);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Generated ${generated}${live ? " · session still live, figures may change" : ""}`, M, H - 20);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 20, { align: "right" });
  }

  doc.save(`${s.title.replace(/[^\w-]+/g, "_")}_${s.scheduledStart.slice(0, 10)}.pdf`);
}
