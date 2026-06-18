// =============================================================================
// Proportional time-scale layout (PLE-133, board directive — Lawrence).
//
// The DELIVERED DEFAULT is a TRUE CALENDAR SCALE (Lawrence, verbatim, PLE-77):
//   "True calendar scale — the axis is proportional to real time, so longer gaps
//    between dates show as wider (even) empty space. It is the only way to show
//    scale."  → clustering reads as momentum, quiet stretches as proportional
//    empty space. (Equal-width / equidistant columns was an earlier misread of
//    "even spacing" and is REJECTED — it survives only as the `ordinal` mode for
//    completeness behind the flag; it is NOT the default.)
//
// So the engine, in the default `calendar` mode:
//   - X = real time on ONE continuous global axis: equal pixels per unit time
//     (a 60-day gap is 2× the width of a 30-day gap). Empty time = empty space.
//   - Y = greedy lane packing so NOTHING overlaps (Lawrence's standing bar);
//     cards that collide horizontally drop to the next lane. Same-instant /
//     dense clusters stack into lanes (momentum); quiet stretches stay open.
//   - Size is EMBRACED, not compressed: the canvas grows as wide as real time
//     needs; FlowCanvas's fit-to-screen + pan/zoom read it at TV scale.
//   - Board-approved structure preserved: node-graph nodes/edges + octopus
//     routing, chapter ZONES as grouping bands (now true temporal spans), the
//     Today marker, sub-containers, citations, mobile. Engine emits plain (x, y);
//     Z-plane depth (PLE-115) rides on top as a separable transform.
//
// SPACING_MODE is the config flag for the A/B question: `calendar` [DEFAULT,
// board's pick] vs `ordinal` (equal-width date columns). Flip it — or pass
// `mode` — to switch with no rework.
// =============================================================================

import type { Edge, TimelineNode } from "../../data/types";
import { nodeAxisDate, monthsSinceEpoch } from "../../lib/temporal";

export const NODE_W = 202;
export const NODE_H = 60;

/** PLE-133 spacing mode. `calendar` = true proportional time scale [board's
 *  delivered default]; `ordinal` = equal-width date columns (rejected reading,
 *  kept behind the flag only). */
export type SpacingMode = "calendar" | "ordinal";
export const SPACING_MODE: SpacingMode = "calendar";

// ── Geometry (PLE-99 2px grid) ──
const PX_PER_MONTH = 200; // calendar mode: equal px per unit time (the scale)
const LANE_HGAP = 28; // min horizontal gutter between cards sharing a lane
const ROW_GAP = 28; // vertical gutter between lanes
const ROW_STEP = NODE_H + ROW_GAP; // 88 — lane-to-lane vertical step
const EDGE_PAD = 120; // left/right canvas breathing room
const HEADER_H = 76; // reserved top band for the zone header (kicker/title/range)
const CONTENT_TOP = HEADER_H + 28; // first lane's top
const AXIS_RESERVE = 116; // bottom band reserved for the axis line + date labels
const MIN_CONTENT_H = 360; // floor so a short timeline still has presence
const SUBGROUP_PAD = 16; // padding around a thread cluster's bounding box
// Ordinal-mode (equal-width column) geometry — only used when mode === "ordinal".
const COL_STEP = NODE_W + 60; // 262 — uniform horizontal date column step

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
  /** Year shown under January ticks (and the first tick). */
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
  /** Vertical tier for the header label so overlapping temporal spans don't collide. */
  headerTier: number;
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
  chapter: number;
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
    return { node: n, eff, months, chapter: 0 };
  });

  // 2. Thread-based seed ranges (for the chapter date-fallback).
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
  for (const e of enriched) e.chapter = chapterFor(e.node.thread, e.months, seedRanges);

  // 4. Per-chapter date range from actual members (for headers).
  const ranges = CHAPTERS.map((_, ci) => {
    const ms = enriched.filter((e) => e.chapter === ci && e.months !== null).map((e) => e.months!);
    if (ms.length === 0) return { start: 0, end: 1 };
    return { start: Math.min(...ms), end: Math.max(...ms) };
  });

  // 5. Global time span (real calendar months) — the scale's domain.
  const datedMonths = enriched.filter((e) => e.months !== null).map((e) => e.months!);
  const minM = datedMonths.length ? Math.min(...datedMonths) : 0;
  const maxM = datedMonths.length ? Math.max(...datedMonths) : 1;
  const todayM = Math.max(0, monthsSinceEpoch(today));

  // 6. X RESOLVER per spacing mode. Calendar = true proportional time (default).
  //    Ordinal = equal-width columns, one per distinct date (rejected fallback).
  let xForNode: (e: EnrichedNode) => number;
  let xForMonth: (m: number) => number;
  if (mode === "ordinal") {
    // Order distinct dates by chapter (story order) then date asc → equal steps.
    const colIndex = new Map<string, number>();
    let gi = 0;
    for (let ci = 0; ci < CHAPTERS.length; ci++) {
      const dates = [
        ...new Set(enriched.filter((e) => e.chapter === ci && e.eff).map((e) => e.eff!)),
      ].sort();
      for (const d of dates) colIndex.set(`${ci}:${d}`, gi++);
      // undated members in this chapter each consume a slot
      for (const e of enriched.filter((e) => e.chapter === ci && !e.eff)) {
        colIndex.set(`u:${e.node.id}`, gi++);
      }
    }
    const ordX = (i: number) => EDGE_PAD + i * COL_STEP + COL_STEP / 2;
    xForNode = (e) =>
      ordX(e.eff ? colIndex.get(`${e.chapter}:${e.eff}`)! : colIndex.get(`u:${e.node.id}`)!);
    // Ordinal axis ticks are handled separately below; xForMonth unused there.
    xForMonth = (m) => EDGE_PAD + (m - minM) * PX_PER_MONTH;
  } else {
    xForMonth = (m) => EDGE_PAD + (m - minM) * PX_PER_MONTH;
    // Undated (no eff at all) park at the start of the axis.
    xForNode = (e) => xForMonth(e.months ?? minM);
  }

  // 7. PLACE NODES. Sort by time, greedy lane-pack so NOTHING overlaps. Cards
  //    that collide horizontally fall to the next lane (dense clusters stack →
  //    momentum; quiet stretches stay open → proportional empty space).
  const sorted = [...enriched].sort(
    (a, b) => (a.months ?? minM) - (b.months ?? minM) || xForNode(a) - xForNode(b),
  );
  const laneRight: number[] = []; // rightmost occupied x per lane
  const positioned: PositionedNode[] = [];
  let maxRows = 1;
  for (const e of sorted) {
    const cx = xForNode(e);
    const left = cx - NODE_W / 2;
    let lane = 0;
    while (lane < laneRight.length && laneRight[lane] + LANE_HGAP > left) lane++;
    laneRight[lane] = cx + NODE_W / 2;
    maxRows = Math.max(maxRows, lane + 1);
    const cy = CONTENT_TOP + NODE_H / 2 + lane * ROW_STEP;
    positioned.push({
      id: e.node.id,
      x: cx - NODE_W / 2,
      y: cy - NODE_H / 2,
      cx,
      cy,
      chapter: e.chapter,
      effectiveDate: e.eff,
    });
  }

  // 8. Canvas size. Width grows to fit real time (size embraced). Height = the
  //    tallest lane stack + axis band, floored.
  const lastCx = positioned.length ? Math.max(...positioned.map((p) => p.cx)) : EDGE_PAD;
  const todayX = mode === "ordinal"
    ? interpTodayX(positioned, enriched, todayM, lastCx)
    : xForMonth(todayM);
  const width = Math.max(lastCx, todayX) + NODE_W / 2 + EDGE_PAD;
  const contentH = Math.max(MIN_CONTENT_H, CONTENT_TOP + maxRows * ROW_STEP);
  const height = contentH + AXIS_RESERVE;
  const axisY = contentH + 40;

  // 9. Zone bands: each chapter spans the real-time extent of its members
  //    (grouping background, preserved). Temporal spans can overlap → stagger
  //    the header label into tiers so they never collide.
  const posByChapter = CHAPTERS.map((_, ci) => positioned.filter((p) => p.chapter === ci));
  const rawZones = CHAPTERS.map((c, i) => {
    const ps = posByChapter[i];
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
    if (ps.length === 0) {
      left = EDGE_PAD + i * COL_STEP;
      zw = COL_STEP;
    } else {
      left = Math.min(...ps.map((p) => p.x)) - SUBGROUP_PAD;
      zw = Math.max(...ps.map((p) => p.x + NODE_W)) + SUBGROUP_PAD - left;
    }
    return { c, i, left, zw, rangeLabel };
  });
  // Greedy tier assignment so overlapping header bands stack instead of colliding.
  const tierRight: number[] = [];
  const zones: ZoneBand[] = rawZones.map((z) => {
    let tier = 0;
    while (tier < tierRight.length && tierRight[tier] > z.left) tier++;
    tierRight[tier] = z.left + z.zw;
    return {
      key: z.c.key,
      index: z.i,
      kicker: z.c.kicker,
      title: z.c.title,
      rangeLabel: z.rangeLabel,
      x: z.left,
      width: z.zw,
      height,
      headerTier: tier,
    };
  });

  // 10. Sub-containers: a thread cluster (≥2 nodes) inside a zone. Skip the
  //     cluster that spans the WHOLE zone, so only genuine sub-groupings get the
  //     tinted box (spec §2).
  const subgroups: SubContainer[] = [];
  const posById = new Map(positioned.map((p) => [p.id, p]));
  CHAPTERS.forEach((_, ci) => {
    const ms = enriched.filter((e) => e.chapter === ci);
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

  // 11. Axis ticks. Calendar: one tick per whole month across the global span,
  //     EVENLY spaced by real time (PX_PER_MONTH) → the scale is legible and a
  //     2-month gap is visibly 2× a 1-month gap. Ordinal: one tick per column.
  const ticks: AxisTick[] = [];
  if (mode === "ordinal") {
    const seen = new Set<number>();
    for (const e of [...enriched].filter((e) => e.eff).sort((a, b) => (a.months! - b.months!))) {
      const x = Math.round(xForNode(e));
      if (seen.has(x)) continue;
      seen.add(x);
      const { label, year } = fmtDate(e.eff!);
      ticks.push({ x, label, sub: String(year) });
    }
  } else {
    const firstM = Math.floor(Math.min(minM, todayM));
    const lastM = Math.ceil(Math.max(maxM, todayM));
    let prevYear: number | null = null;
    for (let m = firstM; m <= lastM; m++) {
      const idx = ((m % 12) + 12) % 12;
      const year = 2026 + Math.floor(m / 12);
      ticks.push({
        x: xForMonth(m),
        label: MONTHS[idx],
        sub: idx === 0 || prevYear === null ? String(year) : null,
      });
      prevYear = year;
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

/** "2026-04-01" → { label: "Apr 1", year: 2026 } (parsed without TZ drift). */
function fmtDate(iso: string): { label: string; year: number } {
  const [y, m, d] = iso.split("-").map((s) => parseInt(s, 10));
  const mi = Number.isFinite(m) ? ((m - 1) % 12 + 12) % 12 : 0;
  const day = Number.isFinite(d) ? d : 1;
  return { label: `${MONTHS[mi]} ${day}`, year: Number.isFinite(y) ? y : 2026 };
}

/** Ordinal-mode Today: interpolate between the dated columns straddling today. */
function interpTodayX(
  positioned: PositionedNode[],
  enriched: EnrichedNode[],
  todayM: number,
  lastCx: number,
): number {
  const monthsById = new Map(enriched.map((e) => [e.node.id, e.months]));
  const dated = positioned
    .map((p) => ({ cx: p.cx, m: monthsById.get(p.id) ?? null }))
    .filter((d): d is { cx: number; m: number } => d.m !== null)
    .sort((a, b) => a.m - b.m);
  if (dated.length === 0) return lastCx / 2;
  if (todayM <= dated[0].m) return dated[0].cx;
  if (todayM >= dated[dated.length - 1].m) return dated[dated.length - 1].cx + COL_STEP / 2;
  let hi = dated.findIndex((d) => d.m >= todayM);
  if (hi < 1) hi = 1;
  const lo = dated[hi - 1];
  const up = dated[hi];
  const t = (todayM - lo.m) / (up.m - lo.m || 1);
  return lo.cx + t * (up.cx - lo.cx);
}
