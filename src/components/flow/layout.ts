// =============================================================================
// Even/uniform lattice layout (PLE-133, board directive — Lawrence). The board
// rejected the density-packed zoned spacing: he wants a REGULAR, even lattice.
//
//   "The dates along the x-axis must and shall be EVENLY SPACED, and the objects
//    associated with each of those dates shall be EQUAL DISTANCE from all other
//    objects proximal. There must be CONTINUITY in spacing … I'll have a big TV."
//
// So spacing is now a uniform grid, NOT content-density packing:
//   - X (dates): every distinct date is an EQUAL-WIDTH column (COL_STEP apart),
//     so the date axis is evenly spaced with continuity across the whole canvas.
//   - Y (nodes): objects sharing a date stack in that date's column on a uniform
//     row grid (ROW_STEP apart) — a clean, regular lattice; rows align across
//     every column.
//   - Size is EMBRACED, not compressed: the canvas grows as wide as it needs;
//     pan/zoom + Fit (FlowCanvas) read it at TV scale.
//   - Board-approved structure is preserved: node-graph nodes/edges, chapter
//     ZONES as grouping bands, the time axis + Today marker, sub-containers,
//     mobile. The engine still emits plain (x, y); Z-plane depth (PLE-115) rides
//     on top as a separable transform.
//
// SPACING MODE is a config flag (the open question CEO is confirming with the
// board): (B) "ordinal" = every distinct date is an equal-width column [DEFAULT];
// (A) "calendar" = a true linear time scale (equal px per unit time, empty time
// spans show even blank space). Flip SPACING_MODE — or pass `mode` — to switch.
// =============================================================================

import type { Edge, TimelineNode } from "../../data/types";
import { nodeAxisDate, monthsSinceEpoch } from "../../lib/temporal";

export const NODE_W = 202;
export const NODE_H = 60;

/** PLE-133 spacing mode. (B) ordinal = equal-width date columns [board default];
 *  (A) calendar = linear time scale. CEO is confirming the preference; ship B. */
export type SpacingMode = "ordinal" | "calendar";
export const SPACING_MODE: SpacingMode = "ordinal";

// ── Uniform lattice geometry (PLE-99 2px grid; the WHOLE point is regularity) ──
const COL_GAP = 60; // clear gutter between adjacent date columns
const COL_STEP = NODE_W + COL_GAP; // 262 — uniform horizontal date spacing
const ROW_GAP = 36; // clear gutter between stacked nodes in a column
const ROW_STEP = NODE_H + ROW_GAP; // 96 — uniform vertical node spacing
const EDGE_PAD = COL_STEP / 2; // left/right canvas breathing room (half a slot)
const HEADER_H = 76; // reserved top band for the zone header (kicker/title/range)
const CONTENT_TOP = HEADER_H + 28; // first row's top
const AXIS_RESERVE = 116; // bottom band reserved for the axis line + date labels
const MIN_CONTENT_H = 360; // floor so a short lattice still has presence
const SUBGROUP_PAD = 16; // padding around a thread cluster's bounding box
const PX_PER_MONTH = 120; // calendar mode (A): equal px per unit time

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** The 5 narrative chapters (order = story order). Threads map nodes → chapter. */
interface ChapterDef {
  key: string;
  kicker: string;
  title: string;
  threads: string[];
}
const CHAPTERS: ChapterDef[] = [
  { key: "foundations", kicker: "Chapter 1", title: "Foundations", threads: ["foundational"] },
  { key: "growth", kicker: "Chapter 2", title: "Growth & Relationships", threads: ["growth", "strategic_relationships", "media_brand"] },
  { key: "savanna", kicker: "Chapter 3", title: "Savanna Schools", threads: ["savanna"] },
  { key: "oswego", kicker: "Chapter 4", title: "Oswego & Tulsa", threads: ["oswego", "major_projects"] },
  { key: "manufacturing", kicker: "Chapter 5", title: "Manufacturing Imperative", threads: ["manufacturing", "financial_interest"] },
];

const THREAD_TO_CHAPTER = new Map<string, number>();
CHAPTERS.forEach((c, i) => c.threads.forEach((t) => THREAD_TO_CHAPTER.set(t, i)));

export interface PositionedNode {
  id: string;
  /** Top-left (React Flow coords). */
  x: number;
  y: number;
  /** Card center. */
  cx: number;
  cy: number;
  /** Index of the chapter zone this node belongs to. */
  chapter: number;
  effectiveDate: string | null;
}

export interface AxisTick {
  x: number;
  label: string;
  /** Year shown when the year changes (and on the first tick). */
  sub: string | null;
}

export interface TimelineAxis {
  /** Y of the axis line (flow coords, top-origin). */
  y: number;
  xStart: number;
  xEnd: number;
  ticks: AxisTick[];
  todayX: number;
  today: string;
}

/** A chapter swim-lane column rendered as a tinted zone with a header. */
export interface ZoneBand {
  key: string;
  index: number;
  kicker: string;
  title: string;
  rangeLabel: string;
  x: number;
  width: number;
  height: number;
}

/** A thread cluster nested inside a zone (the "colored sub-grouping"). */
export interface SubContainer {
  id: string;
  thread: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FlowLayout {
  nodes: PositionedNode[];
  zones: ZoneBand[];
  subgroups: SubContainer[];
  axis: TimelineAxis;
  width: number;
  height: number;
}

/**
 * Effective date used to place a node: its own axis date, else the EARLIEST
 * axis date among its edge neighbors (so an undated person sits where they
 * enter the story), else null.
 */
export function effectiveDate(
  node: TimelineNode,
  edges: Edge[],
  nodeMap: Map<string, TimelineNode>,
): string | null {
  const own = nodeAxisDate(node);
  if (own) return own;
  const neighborDates: string[] = [];
  for (const e of edges) {
    const otherId = e.from === node.id ? e.to : e.to === node.id ? e.from : null;
    if (!otherId) continue;
    const other = nodeMap.get(otherId);
    const d = other ? nodeAxisDate(other) : null;
    if (d) neighborDates.push(d);
  }
  if (neighborDates.length === 0) return null;
  return neighborDates.sort()[0];
}

const threadLabelKebab = (t: string) => t.replace(/_/g, "-");

function humanThread(t: string): string {
  return t.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

function monthToLabel(m: number): string {
  const idx = ((Math.round(m) % 12) + 12) % 12;
  const year = 2026 + Math.floor(Math.round(m) / 12);
  return `${MONTHS[idx]} ${year}`;
}

/** "2026-04-01" → { label: "Apr 1", year: 2026 } (parsed without TZ drift). */
function fmtDate(iso: string): { label: string; year: number } {
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  const mi = Number.isFinite(m) ? ((m - 1) % 12 + 12) % 12 : 0;
  const day = Number.isFinite(d) ? d : 1;
  return { label: `${MONTHS[mi]} ${day}`, year: Number.isFinite(y) ? y : 2026 };
}

/**
 * Assign a node to a chapter. Primary signal = story thread; fall back to the
 * chapter whose member date-range is nearest the node's effectiveDate so an
 * unmapped/threadless node never floats outside the zone system.
 */
function chapterFor(
  thread: string | null,
  months: number | null,
  ranges: { start: number; end: number }[],
): number {
  if (thread && THREAD_TO_CHAPTER.has(thread)) return THREAD_TO_CHAPTER.get(thread)!;
  if (months === null) return 0;
  let best = 0;
  let bestDist = Infinity;
  ranges.forEach((r, i) => {
    const d = months < r.start ? r.start - months : months > r.end ? months - r.end : 0;
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

interface EnrichedNode {
  node: TimelineNode;
  eff: string | null;
  months: number | null;
}

/** One date column in the lattice: every distinct date → an equal-width column. */
interface Column {
  chapter: number;
  date: string | null; // null = a truly undated node (own trailing column)
  months: number | null;
  members: EnrichedNode[];
  gi: number; // global column index (order = story chapters, then date asc)
  cx: number; // center x (resolved per spacing mode)
}

export function computeTimelineLayout(
  nodes: TimelineNode[],
  edges: Edge[],
  today: string,
  mode: SpacingMode = SPACING_MODE,
): FlowLayout {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // 1. effectiveDate + month for every node.
  const enriched: EnrichedNode[] = nodes.map((n) => {
    const eff = effectiveDate(n, edges, nodeMap);
    const months = eff !== null ? Math.max(0, monthsSinceEpoch(eff)) : null;
    return { node: n, eff, months };
  });

  // 2. First pass: thread-based chapter date ranges (for the date-fallback).
  const seedRanges = CHAPTERS.map(() => ({ start: Infinity, end: -Infinity }));
  for (const e of enriched) {
    if (e.months === null) continue;
    const ci = e.node.thread && THREAD_TO_CHAPTER.has(e.node.thread)
      ? THREAD_TO_CHAPTER.get(e.node.thread)!
      : null;
    if (ci === null) continue;
    seedRanges[ci].start = Math.min(seedRanges[ci].start, e.months);
    seedRanges[ci].end = Math.max(seedRanges[ci].end, e.months);
  }

  // 3. Assign every node to a chapter.
  const members: EnrichedNode[][] = CHAPTERS.map(() => []);
  for (const e of enriched) {
    const ci = chapterFor(e.node.thread, e.months, seedRanges);
    members[ci].push(e);
  }

  // 4. Final per-chapter date range from actual members (for headers + mode A).
  const ranges = members.map((ms) => {
    const monthsList = ms.map((m) => m.months).filter((m): m is number => m !== null);
    if (monthsList.length === 0) return { start: 0, end: 1 };
    return { start: Math.min(...monthsList), end: Math.max(...monthsList) };
  });

  // 5. BUILD COLUMNS. Per chapter (story order), one column per DISTINCT date
  //    (sorted asc); truly-undated nodes each get their own trailing column so
  //    the lattice stays regular and nothing piles up. Global index = order of
  //    creation → uniform COL_STEP spacing in ordinal mode.
  const columns: Column[] = [];
  members.forEach((ms, ci) => {
    const byDate = new Map<string, EnrichedNode[]>();
    const undated: EnrichedNode[] = [];
    for (const m of ms) {
      if (m.eff) {
        const bucket = byDate.get(m.eff) ?? byDate.set(m.eff, []).get(m.eff)!;
        bucket.push(m);
      } else {
        undated.push(m);
      }
    }
    for (const date of [...byDate.keys()].sort()) {
      columns.push({
        chapter: ci,
        date,
        months: Math.max(0, monthsSinceEpoch(date)),
        members: byDate.get(date)!,
        gi: 0,
        cx: 0,
      });
    }
    for (const m of undated) {
      columns.push({ chapter: ci, date: null, months: null, members: [m], gi: 0, cx: 0 });
    }
  });
  columns.forEach((c, i) => (c.gi = i));

  // 6. RESOLVE COLUMN X per spacing mode.
  const ordinalCx = (gi: number) => EDGE_PAD + gi * COL_STEP + COL_STEP / 2;
  if (mode === "calendar") {
    // (A) linear time scale: equal px per month; empty spans show even blank.
    const dated = columns.filter((c) => c.months !== null);
    const minM = dated.length ? Math.min(...dated.map((c) => c.months!)) : 0;
    let tail = dated.length ? Math.max(...dated.map((c) => c.months!)) : 0;
    for (const c of columns) {
      const m = c.months ?? (tail += 1); // undated trail off the right edge, evenly
      c.cx = EDGE_PAD + COL_STEP / 2 + (m - minM) * PX_PER_MONTH;
    }
  } else {
    // (B) ordinal: every distinct date is an equal-width column.
    for (const c of columns) c.cx = ordinalCx(c.gi);
  }

  // 7. PLACE NODES on the uniform row grid. Members of a column stack from the
  //    top; rows align across every column → a clean regular lattice. No two
  //    nodes overlap (COL_STEP > NODE_W horizontally, ROW_STEP > NODE_H within).
  const positioned: PositionedNode[] = [];
  let maxRows = 1;
  for (const col of columns) {
    col.members.forEach((m, row) => {
      const cx = col.cx;
      const cy = CONTENT_TOP + NODE_H / 2 + row * ROW_STEP;
      maxRows = Math.max(maxRows, row + 1);
      positioned.push({
        id: m.node.id,
        x: cx - NODE_W / 2,
        y: cy - NODE_H / 2,
        cx,
        cy,
        chapter: col.chapter,
        effectiveDate: m.eff,
      });
    });
  }

  // 8. Canvas size. Width grows to fit the lattice (size is embraced, not
  //    compressed); height is the tallest column + axis band, with a floor.
  const lastCx = columns.length ? Math.max(...columns.map((c) => c.cx)) : EDGE_PAD;
  const width = lastCx + NODE_W / 2 + EDGE_PAD;
  const contentH = Math.max(MIN_CONTENT_H, CONTENT_TOP + maxRows * ROW_STEP);
  const height = contentH + AXIS_RESERVE;
  const axisY = contentH + 40; // axis line sits in the reserved bottom band

  // 9. Zone bands: each chapter wraps its own contiguous run of date columns
  //    (grouping background, preserved per the board's structure). In ordinal
  //    mode chapters abut perfectly; in calendar mode they span member extents.
  const zones: ZoneBand[] = CHAPTERS.map((c, i) => {
    const cols = columns.filter((col) => col.chapter === i);
    const r = ranges[i];
    const startLbl = monthToLabel(r.start);
    const endLbl = monthToLabel(r.end);
    const rangeLabel =
      i === CHAPTERS.length - 1 && r.end > monthsSinceEpoch(today)
        ? `${startLbl} → projected`
        : startLbl === endLbl
          ? startLbl
          : `${startLbl} – ${endLbl}`;
    let left: number;
    let zw: number;
    if (cols.length === 0) {
      left = EDGE_PAD;
      zw = COL_STEP;
    } else {
      const minC = Math.min(...cols.map((col) => col.cx));
      const maxC = Math.max(...cols.map((col) => col.cx));
      left = minC - COL_STEP / 2;
      zw = maxC - minC + COL_STEP;
    }
    return {
      key: c.key,
      index: i,
      kicker: c.kicker,
      title: c.title,
      rangeLabel,
      x: left,
      width: zw,
      height,
    };
  });

  // 10. Sub-containers: a thread cluster (≥2 nodes) inside a zone. Skip the
  //     cluster that spans the WHOLE zone (the column already IS that region),
  //     so only genuine sub-groupings get the tinted box (spec §2).
  const subgroups: SubContainer[] = [];
  const posById = new Map(positioned.map((p) => [p.id, p]));
  members.forEach((ms, ci) => {
    const byThread = new Map<string, PositionedNode[]>();
    for (const m of ms) {
      const t = m.node.thread;
      if (!t) continue;
      const p = posById.get(m.node.id);
      if (!p) continue;
      (byThread.get(t) ?? byThread.set(t, []).get(t)!).push(p);
    }
    for (const [thread, ps] of byThread) {
      if (ps.length < 2) continue;
      if (ps.length === ms.length && byThread.size === 1) continue; // == whole zone
      const minX = Math.min(...ps.map((p) => p.x)) - SUBGROUP_PAD;
      const maxX = Math.max(...ps.map((p) => p.x + NODE_W)) + SUBGROUP_PAD;
      const minY = Math.min(...ps.map((p) => p.y)) - SUBGROUP_PAD;
      const maxY = Math.max(...ps.map((p) => p.y + NODE_H)) + SUBGROUP_PAD;
      subgroups.push({
        id: `${CHAPTERS[ci].key}-${thread}`,
        thread: threadLabelKebab(thread),
        label: humanThread(thread),
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      });
    }
  });

  // 11. Axis: one EVENLY SPACED tick per dated column (the board ask). Year is
  //     shown when it changes (and on the first tick). Iterate in column order.
  const ticks: AxisTick[] = [];
  let prevYear: number | null = null;
  for (const col of columns) {
    if (col.date === null) continue;
    const { label, year } = fmtDate(col.date);
    ticks.push({ x: col.cx, label, sub: prevYear === null || year !== prevYear ? String(year) : null });
    prevYear = year;
  }

  // 12. Today marker. Ordinal: interpolate between the dated columns straddling
  //     today so the marker reads in-time on the even lattice. Calendar: linear.
  const todayM = Math.max(0, monthsSinceEpoch(today));
  let todayX: number;
  if (mode === "calendar") {
    const dated = columns.filter((c) => c.months !== null);
    const minM = dated.length ? Math.min(...dated.map((c) => c.months!)) : 0;
    todayX = EDGE_PAD + COL_STEP / 2 + (todayM - minM) * PX_PER_MONTH;
  } else {
    const dated = columns
      .filter((c) => c.months !== null)
      .sort((a, b) => a.months! - b.months!);
    if (dated.length === 0) {
      todayX = width / 2;
    } else if (todayM <= dated[0].months!) {
      todayX = dated[0].cx;
    } else if (todayM >= dated[dated.length - 1].months!) {
      // just past the last dated column → into the projected tail, half a slot.
      todayX = dated[dated.length - 1].cx + COL_STEP / 2;
    } else {
      let hi = dated.findIndex((c) => c.months! >= todayM);
      if (hi < 1) hi = 1;
      const lo = dated[hi - 1];
      const up = dated[hi];
      const t = (todayM - lo.months!) / (up.months! - lo.months! || 1);
      todayX = lo.cx + t * (up.cx - lo.cx);
    }
  }

  return {
    nodes: positioned,
    zones,
    subgroups,
    axis: { y: axisY, xStart: 0, xEnd: width, ticks, todayX, today },
    width,
    height,
  };
}
