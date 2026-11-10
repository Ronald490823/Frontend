import type { CdsSession, Roster, RosterEntry } from "@/types/api";
import { formatDate, formatTime } from "./formatters";

type RGB = [number, number, number];
const INK: RGB = [23, 32, 51];
const MUTED: RGB = [107, 114, 128];
const BRAND: RGB = [15, 118, 110];
const HAIRLINE: RGB = [229, 231, 235];
const PANEL: RGB = [248, 250, 252];

const STATUS: Record<string, { label: string; color: RGB }> = {
  present: { label: "Present", color: [4, 120, 87] },
  late: { label: "Late", color: [180, 83, 9] },
  excused: { label: "Excused", color: [37, 99, 235] },
  absent: { label: "Absent", color: [190, 18, 60] },
  none: { label: "Not yet", color: MUTED },
};

const METHOD = { qr: "QR scan", location: "Location", manual: "Recorded by exco" } as const;

// ---- shared ordering ------------------------------------------------------------------------

const showedUp = (e: RosterEntry) => e.attendance?.status === "present" || e.attendance?.status === "late";

/** Register order: checked-in members numbered by arrival, then everyone else A–Z. */
function registerRows(s: CdsSession, roster: Roster) {
  const live = s.status === "active";
  const inOrder = roster.entries
    .filter(showedUp)
    .sort((a, b) => a.attendance!.checkedInAt.localeCompare(b.attendance!.checkedInAt));
  const rest = roster.entries.filter((e) => !showedUp(e)).sort((a, b) => a.fullName.localeCompare(b.fullName));
  const row = (e: RosterEntry, n: number | null) => {
    const state = e.attendance?.status ?? (live ? "none" : "absent");
    return {
      n,
      e,
      state,
      status: STATUS[state]!.label,
      role: e.role === "executive" ? "Exco" : "Member",
      // Only a check-in has a meaningful time; for absent/excused it's just when it was recorded.
      checkedIn: showedUp(e) ? e.attendance!.checkedInAt : null,
      method: e.attendance ? METHOD[e.attendance.method] : null,
    };
  };
  return { live, present: inOrder.map((e, i) => row(e, i + 1)), others: rest.map((e) => row(e, null)) };
}

function fileBase(s: CdsSession) {
  return `${s.title.replace(/[^\w-]+/g, "_")}_${s.scheduledStart.slice(0, 10)}`;
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- CSV ------------------------------------------------------------------------------------

/** Quote for CSV, and defuse spreadsheet formulas (a name starting with "=" etc.). */
function cell(value: string | number | null | undefined) {
  let v = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** The register as a spreadsheet-friendly CSV (opens cleanly in Excel and Google Sheets). */
export function downloadAttendanceCsv(s: CdsSession, roster: Roster) {
  const { present, others } = registerRows(s, roster);
  const date = formatDate(s.scheduledStart, { dateStyle: "medium" });
  const header = ["No.", "Full name", "State code", "Role", "Status", "Checked in", "Method", "Session", "Group", "Date"];
  const lines = [header, ...[...present, ...others].map((r) => [
    r.n ?? "",
    r.e.fullName,
    r.e.stateCode,
    r.role,
    r.status,
    r.checkedIn ? formatTime(r.checkedIn) : "",
    r.method ?? "",
    s.title,
    s.groupName,
    date,
  ])].map((row) => row.map(cell).join(","));
  // BOM so Excel reads UTF-8 names correctly.
  saveBlob(new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }), `${fileBase(s)}.csv`);
}

// ---- PDF ------------------------------------------------------------------------------------

/** jsPDF's built-in fonts are WinAnsi only: Intl output uses narrow/no-break spaces ("9:30 am"). */
const t = (v: string) => v.replace(/[   ]/g, " ");

/**
 * A printable attendance register for one session: a header with the session's details, a
 * summary row, the members who checked in (in arrival order), everyone else, and a sign-off
 * block. Loaded on demand so jsPDF never ships in the normal page bundle.
 */
export async function downloadAttendancePdf(s: CdsSession, roster: Roster) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const { live, present, others } = registerRows(s, roster);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const CW = W - M * 2;
  const TOP = 64; // where content starts on continuation pages, under the running header
  const BOTTOM = 56; // space kept for the footer
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const ensureSpace = (y: number, needed: number) => {
    if (y + needed <= H - BOTTOM) return y;
    doc.addPage();
    return TOP;
  };

  // ---- Header ------------------------------------------------------------------------------
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, W, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND);
  doc.setCharSpace(1.2);
  doc.text("CDS ATTENDANCE REGISTER", M, 40);
  doc.setCharSpace(0);

  // Status pill, top right.
  const pill = live ? "LIVE" : s.status === "cancelled" ? "CANCELLED" : "CLOSED";
  doc.setFontSize(7.5);
  const pw = doc.getTextWidth(pill) + 16;
  doc.setFillColor(...(live ? ([220, 252, 231] as RGB) : ([241, 245, 249] as RGB)));
  doc.roundedRect(W - M - pw, 29, pw, 16, 8, 8, "F");
  doc.setTextColor(...(live ? STATUS.present!.color : MUTED));
  doc.text(pill, W - M - pw / 2, 40, { align: "center" });

  doc.setFontSize(20);
  doc.setTextColor(...INK);
  const titleLines = doc.splitTextToSize(t(s.title), CW) as string[];
  doc.text(titleLines, M, 66);
  let y = 66 + (titleLines.length - 1) * 24 + 22;

  // ---- Details: a two-column key/value grid -------------------------------------------------
  const details: [string, string][] = [
    ["Group", s.groupName],
    ["Date", formatDate(s.scheduledStart, { weekday: "long", day: "numeric", month: "long", year: "numeric" })],
    ["Scheduled", `${formatTime(s.scheduledStart)} – ${formatTime(s.scheduledEnd)}`],
    ["Venue", s.venue || "—"],
  ];
  if (s.actualStart) {
    details.push(["Started", `${formatTime(s.actualStart)} ${s.startedByName ? `by ${s.startedByName}` : "(automatic)"}`]);
  }
  if (s.actualEnd) details.push(["Ended", `${formatTime(s.actualEnd)}${s.closedByName ? ` by ${s.closedByName}` : ""}`]);
  if (s.requiresLocation) details.push(["Location check", `Within ${s.radiusM} m of the venue`]);

  const colW = CW / 2;
  const rowH = 30;
  const gridRows = Math.ceil(details.length / 2);
  doc.setDrawColor(...HAIRLINE);
  doc.setFillColor(...PANEL);
  doc.roundedRect(M, y, CW, gridRows * rowH + 12, 8, 8, "FD");
  details.forEach(([label, value], i) => {
    const x = M + 14 + (i % 2) * colW;
    const ry = y + 18 + Math.floor(i / 2) * rowH;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, ry);
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const v = doc.splitTextToSize(t(value), colW - 28) as string[];
    doc.text(v[0] + (v.length > 1 ? "…" : ""), x, ry + 13);
  });
  y += gridRows * rowH + 12 + 16;

  // ---- Summary tiles -----------------------------------------------------------------------
  const { summary } = roster;
  const attended = summary.present + summary.late;
  const rate = summary.eligible ? Math.round((attended / summary.eligible) * 100) : 0;
  const tiles: [string, string, RGB][] = [
    ["Members", String(summary.eligible), INK],
    ["Present", String(summary.present), STATUS.present!.color],
    ["Late", String(summary.late), STATUS.late!.color],
    ["Excused", String(summary.excused), STATUS.excused!.color],
    [live ? "Not yet in" : "Absent", String(live ? summary.notRecorded : summary.absent), live ? MUTED : STATUS.absent!.color],
    ["Turnout", `${rate}%`, BRAND],
  ];
  const gap = 8;
  const tw = (CW - gap * (tiles.length - 1)) / tiles.length;
  tiles.forEach(([label, value, color], i) => {
    const x = M + i * (tw + gap);
    doc.setDrawColor(...HAIRLINE);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, tw, 50, 6, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(...color);
    doc.text(value, x + tw / 2, y + 26, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x + tw / 2, y + 40, { align: "center" });
  });
  y += 50 + 26;

  // ---- Tables ------------------------------------------------------------------------------
  // Fixed widths so every page lines up; the name column takes what's left.
  const widths = { n: 26, code: 84, role: 48, status: 56, time: 58, method: 84 };
  const nameW = CW - Object.values(widths).reduce((a, b) => a + b, 0);
  const columnStyles = {
    0: { cellWidth: widths.n, halign: "center" as const, textColor: MUTED },
    1: { cellWidth: nameW, fontStyle: "bold" as const },
    2: { cellWidth: widths.code },
    3: { cellWidth: widths.role },
    4: { cellWidth: widths.status, fontStyle: "bold" as const },
    5: { cellWidth: widths.time },
    6: { cellWidth: widths.method, textColor: MUTED },
  };

  function section(title: string, rows: ReturnType<typeof registerRows>["present"], empty: string) {
    y = ensureSpace(y, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(title, M, y);
    const titleW = doc.getTextWidth(title);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(String(rows.length), M + titleW + 8, y);
    y += 8;

    if (rows.length === 0) {
      doc.setFontSize(9);
      doc.text(empty, M, y + 16);
      y += 40;
      return;
    }
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M, top: TOP, bottom: BOTTOM },
      head: [["#", "Name", "State code", "Role", "Status", "Time in", "Method"]],
      body: rows.map((r) => [
        r.n === null ? "" : String(r.n),
        t(r.e.fullName),
        r.e.stateCode,
        r.role,
        r.status,
        r.checkedIn ? t(formatTime(r.checkedIn)) : "—",
        r.method ?? "—",
      ]),
      theme: "plain",
      showHead: "everyPage",
      styles: {
        font: "helvetica",
        fontSize: 9,
        textColor: INK,
        overflow: "linebreak",
        valign: "middle",
        cellPadding: { top: 6, bottom: 6, left: 6, right: 6 },
        lineColor: HAIRLINE,
      },
      headStyles: { fontStyle: "bold", fontSize: 7.5, textColor: MUTED, fillColor: [241, 245, 249] },
      bodyStyles: { lineWidth: { bottom: 0.5 } },
      alternateRowStyles: { fillColor: [250, 250, 251] },
      columnStyles,
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          data.cell.styles.textColor = STATUS[rows[data.row.index]!.state]!.color;
        }
      },
    });
    y = lastY() + 26;
  }

  section("Checked in", present, live ? "Nobody has checked in yet." : "Nobody checked in.");
  section(live ? "Not checked in yet" : "Did not check in", others, "Everyone on the roster checked in.");

  // ---- Sign-off ----------------------------------------------------------------------------
  y = ensureSpace(y, 70) + 14;
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.6);
  const sw = (CW - 40) / 2;
  for (const [i, label] of ["Verified by (CDS executive)", "Date and signature"].entries()) {
    const x = M + i * (sw + 40);
    doc.line(x, y + 24, x + sw, y + 24);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label, x, y + 38);
  }

  // ---- Running header (continuation pages) and footer (every page) -------------------------
  const pages = doc.getNumberOfPages();
  const generated = t(formatDate(new Date().toISOString(), { dateStyle: "medium", timeStyle: "short" }));
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    if (p > 1) {
      doc.setFillColor(...BRAND);
      doc.rect(0, 0, W, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      const head = doc.splitTextToSize(t(s.title), CW * 0.6) as string[];
      doc.text(head[0]!, M, 34);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(t(`${s.groupName} · ${formatDate(s.scheduledStart, { dateStyle: "medium" })}`), W - M, 34, { align: "right" });
      doc.setDrawColor(...HAIRLINE);
      doc.setLineWidth(0.5);
      doc.line(M, 44, W - M, 44);
    }
    doc.setDrawColor(...HAIRLINE);
    doc.setLineWidth(0.5);
    doc.line(M, H - 36, W - M, H - 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`Generated ${generated}${live ? "  ·  session still live, figures may change" : ""}`, M, H - 22);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 22, { align: "right" });
  }

  doc.save(`${fileBase(s)}.pdf`);
}
