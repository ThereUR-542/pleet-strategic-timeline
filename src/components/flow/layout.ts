// =============================================================================
// Zoned chapter-column layout (PLE-121, stage-③ build of the board-accepted
// PLE-114 design). Reconciles the PLE-92 time axis with the board's "zones"
// ask: the canvas is partitioned into 5 chronological CHAPTER columns laid out
// along X; each chapter spreads its nodes across the FULL zone height (more Y),
// with the month axis + Today marker preserved UNDER the zones.
//
//   - Zones are DATA-DERIVED: each node is bucketed into a chapter by its story
//     `thread`; a chapter's date range is the min/max effectiveDate of its
//     members. Within a zone, X is the node's date-fraction across that zone's
//     range, so the axis ticks beneath stay aligned to the nodes (piecewise
//     time — chapters are equal-width readable columns, time re-flows per zone).
//   - No node overlaps (PLE-92 hard constraint): greedy lane packing per zone.
//   - The engine emits plain (x, y) only. Z-plane depth (PLE-115) rides on top
//     as a separable transform — depth is NEVER coupled into this lane math.
// =============================================================================

import type { Edge, TimelineNode } from "../../data/types";
import { nodeAxisDate, monthsSinceEpoch } from "../../lib/temporal";

export const NODE_W = 202;
export const NODE_H = 60;

// ── Zone geometry (all derived from the PLE-99 2px grid; no stray px) ──
const ZONE_W = 380; // each chapter column's width
const ZONE_PAD_X = 24; // --space-6 inner horizontal padding
const HEADER_H = 76; // reserved top band for the zone header (kicker/title/range)
const CONTENT_TOP = HEADER_H + 12; // first lane's top
const AXIS_RESERVE = 96; // bottom band reserved for the axis line + tick labels
const LANE_VGAP = 18; // vertical gap between stacked lanes
const MIN_CX_GAP = NODE_W + 16; // min horizontal center-to-center gap within a lane
const MIN_CONTENT_H = 520; // floor so short chapters still fill the column
const SUBGROUP_PAD = 16; // padding around a thread cluster's bounding box

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
  /** Year shown under January ticks. */
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

export function computeTimelineLayout(
  nodes: TimelineNode[],
  edges: Edge[],
  today: string,
): FlowLayout {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // 1. effectiveDate + month for every node.
  const enriched = nodes.map((n) => {
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
  const members: { node: TimelineNode; eff: string | null; months: number | null }[][] =
    CHAPTERS.map(() => []);
  for (const e of enriched) {
    const ci = chapterFor(e.node.thread, e.months, seedRanges);
    members[ci].push(e);
  }

  // 4. Final per-chapter date range from actual members (data-derived).
  const ranges = members.map((ms) => {
    const monthsList = ms.map((m) => m.months).filter((m): m is number => m !== null);
    if (monthsList.length === 0) return { start: 0, end: 1 };
    return { start: Math.min(...monthsList), end: Math.max(...monthsList) };
  });

  // 5. Lay nodes inside each zone column: X = date-fraction across the zone,
  //    Y = greedy lane packing (full height, never overlapping).
  const innerW = ZONE_W - 2 * ZONE_PAD_X - NODE_W;
  const positioned: PositionedNode[] = [];
  let maxRows = 1;

  members.forEach((ms, ci) => {
    const zoneX0 = ci * ZONE_W;
    const { start, end } = ranges[ci];
    const span = end - start;
    // Float undated members evenly across the zone so they fill, not pile up.
    const undated = ms.filter((m) => m.months === null);
    let floatI = 0;
    const sorted = [...ms].sort((a, b) => (a.months ?? start) - (b.months ?? start));
    const laneLastCx: number[] = [];

    for (const m of sorted) {
      let frac: number;
      if (m.months !== null) {
        frac = span > 0 ? (m.months - start) / span : 0.5;
      } else {
        frac = undated.length > 1 ? floatI / (undated.length - 1) : 0.5;
        floatI++;
      }
      frac = Math.min(1, Math.max(0, frac));
      const cx = zoneX0 + ZONE_PAD_X + NODE_W / 2 + frac * innerW;

      // first lane whose last card clears the min center gap
      let lane = 0;
      while (lane < laneLastCx.length && cx - laneLastCx[lane] < MIN_CX_GAP) lane++;
      laneLastCx[lane] = cx;
      maxRows = Math.max(maxRows, lane + 1);
      const cy = CONTENT_TOP + NODE_H / 2 + lane * (NODE_H + LANE_VGAP);

      positioned.push({
        id: m.node.id,
        x: cx - NODE_W / 2,
        y: cy - NODE_H / 2,
        cx,
        cy,
        chapter: ci,
        effectiveDate: m.eff,
      });
    }
  });

  // 6. Canvas height: tall enough for the busiest column, with a floor.
  const contentH = Math.max(MIN_CONTENT_H, maxRows * (NODE_H + LANE_VGAP) + CONTENT_TOP);
  const height = contentH + AXIS_RESERVE;
  const axisY = contentH + 36; // axis line sits in the reserved bottom band
  const width = CHAPTERS.length * ZONE_W;

  // 7. Zone bands (headers + tints).
  const zones: ZoneBand[] = CHAPTERS.map((c, i) => {
    const r = ranges[i];
    const startLbl = monthToLabel(r.start);
    const endLbl = monthToLabel(r.end);
    // Manufacturing chapter trails into projected dates → annotate.
    const rangeLabel =
      i === CHAPTERS.length - 1 && r.end > monthsSinceEpoch(today)
        ? `${startLbl} → projected`
        : startLbl === endLbl
          ? startLbl
          : `${startLbl} – ${endLbl}`;
    return {
      key: c.key,
      index: i,
      kicker: c.kicker,
      title: c.title,
      rangeLabel,
      x: i * ZONE_W,
      width: ZONE_W,
      height,
    };
  });

  // 8. Sub-containers: a thread cluster (≥2 nodes) inside a zone. Skip the
  //    cluster that spans the WHOLE zone (the column already IS that region),
  //    so only genuine sub-groupings get the tinted box (spec §2).
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

  // 9. Axis: piecewise per zone so ticks stay aligned with the date-fraction X.
  //    One tick per whole month inside each zone's range; Today placed in the
  //    zone whose range contains it.
  const ticks: AxisTick[] = [];
  zones.forEach((z, ci) => {
    const { start, end } = ranges[ci];
    const span = end - start;
    // floor(start)..ceil(end) so the month a chapter STARTS in always gets a
    // tick (e.g. Foundations begins Jan 20 → month 0.65 still labels "Jan");
    // out-of-range months clamp to the zone edge via the frac clamp below.
    const firstM = Math.floor(start);
    const lastM = Math.ceil(end);
    const xForMonth = (m: number) => {
      const frac = span > 0 ? (m - start) / span : 0.5;
      return z.x + ZONE_PAD_X + NODE_W / 2 + Math.min(1, Math.max(0, frac)) * innerW;
    };
    for (let m = firstM; m <= lastM; m++) {
      const idx = ((m % 12) + 12) % 12;
      ticks.push({
        x: xForMonth(m),
        label: MONTHS[idx],
        sub: idx === 0 ? String(2026 + Math.floor(m / 12)) : null,
      });
    }
    if (span === 0) {
      // single-date chapter: one centered tick
      ticks.push({ x: xForMonth(start), label: MONTHS[((Math.round(start) % 12) + 12) % 12], sub: null });
    }
  });

  const todayM = Math.max(0, monthsSinceEpoch(today));
  let todayX = width - ZONE_W / 2;
  const tci = ranges.findIndex((r) => todayM >= r.start && todayM <= r.end);
  if (tci >= 0) {
    const r = ranges[tci];
    const span = r.end - r.start;
    const frac = span > 0 ? (todayM - r.start) / span : 0.5;
    todayX = tci * ZONE_W + ZONE_PAD_X + NODE_W / 2 + Math.min(1, Math.max(0, frac)) * innerW;
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
