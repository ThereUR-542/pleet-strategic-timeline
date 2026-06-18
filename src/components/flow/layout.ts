// =============================================================================
// Swim-lane band layout (PLE-133, board directive — Lawrence, 14:20).
//
// Lawrence's model: "immiscible liquids (oil & water) / thermal bands in the
// atmosphere." The zones/containers (the THREADS — Growth, Relationships,
// Oswego, Major Projects, Financial Interest, …) become HORIZONTAL BANDS that
// spread left→right across a centered horizontal TIME axis, distributed between
// the +Y and −Y planes about that axis. Hard rules he set:
//
//   RULE: NO ZONE NOR NODE SHALL OVERLAP.
//   RULE: connecting lines minimize crossings (orthogonal routing / bundling).
//   X = real, evenly-distributed time (true calendar scale, centered in view).
//
// So the default `calendar` mode now lays out:
//   - X = proportional real time (equal px per unit time), shared by every band.
//   - Each thread = one horizontal swim-lane band, full canvas width. Bands are
//     stacked with gaps so NO band overlaps another; the time axis runs through
//     the centre, with roughly half the bands above (+Y) and half below (−Y).
//   - Within a band, nodes sit at their true temporal x and greedy sub-lane pack
//     vertically so NO node overlaps. Quiet stretches stay empty (scale reads).
//   - Bands are ordered by chapter→thread (story order) so related threads sit
//     adjacent and the vertical reading is logical.
//   - Size embraced: the canvas grows as wide/tall as needed; FlowCanvas fits it
//     to screen and pans/zooms at TV scale. Z-plane depth (PLE-115) rides on top.
//
// SPACING_MODE flag: `calendar` [DEFAULT — bands on a proportional axis] vs
// `ordinal` (equal-width date columns; the rejected reading, kept behind flag).
// =============================================================================

import type { Edge, TimelineNode } from "../../data/types";
import { nodeAxisDate, monthsSinceEpoch } from "../../lib/temporal";

export const NODE_W = 202;
export const NODE_H = 60;

/** PLE-133 spacing mode. `calendar` = proportional time + swim-lane bands
 *  [board's delivered default]; `ordinal` = equal-width date columns (rejected
 *  reading, kept behind the flag only). */
export type SpacingMode = "calendar" | "ordinal";
export const SPACING_MODE: SpacingMode = "calendar";

// ── Geometry (PLE-99 2px grid) ──
const PX_PER_MONTH = 200; // equal px per unit time (the scale)
const LANE_HGAP = 28; // min horizontal gutter between cards in a sub-lane
const SUBLANE_STEP = NODE_H + 26; // 86 — vertical step between sub-lanes in a band
const BAND_PAD_TOP = 40; // band top padding (room for the band label)
const BAND_PAD_BOT = 22; // band bottom padding
const BAND_GAP = 46; // clear gutter between adjacent bands (no overlap)
const AXIS_GUTTER = 150; // open central channel for the time axis + tick labels
                         // (the +Y / −Y split reads clearly across it)
const Y_MARGIN = 56; // top/bottom canvas margin
const EDGE_PAD = 140; // left/right canvas breathing room
const AXIS_RESERVE = 116; // ordinal mode: bottom band for the axis
const MIN_CONTENT_H = 360; // floor
const COL_STEP = NODE_W + 60; // 262 — ordinal-mode equal-width column step
const ORD_CONTENT_TOP = 104; // ordinal-mode first lane top
const ORD_ROW_STEP = NODE_H + 28; // 88 — ordinal-mode lane step

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
/** Threads in chapter→thread (story) order — the vertical band order. */
const THREAD_ORDER: string[] = CHAPTERS.flatMap((c) => c.threads);
const CONTEXT_BAND = "__context"; // threadless nodes (concept hubs, etc.)

export interface PositionedNode {
  id: string;
  /** Top-left (React Flow coords). */
  x: number;
  y: number;
  /** Card center. */
  cx: number;
  cy: number;
  /** Index of the chapter this node belongs to (mobile grouping). */
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
  /** Y of the (centred) axis line (flow coords, top-origin). */
  y: number;
  xStart: number;
  xEnd: number;
  ticks: AxisTick[];
  todayX: number;
  today: string;
}

/** A chapter grouping (used by the mobile stacked-band view). */
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

/** A horizontal swim-lane band (one per thread) — the desktop substrate. */
export interface SwimBand {
  key: string;
  /** kebab thread key for the CSS tint var (`--thread-…`). */
  thread: string;
  label: string;
  rangeLabel: string;
  /** Owning chapter index (for tint family). */
  chapter: number;
  x: number;
  y: number;
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
  /** Chapter groupings (mobile). */
  zones: ZoneBand[];
  /** Desktop swim-lane bands (calendar mode); empty in ordinal mode. */
  bands: SwimBand[];
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
  if (t === CONTEXT_BAND) return "Context & Concepts";
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

  // 3. Assign every node to a chapter (mobile grouping + tint family).
  for (const e of enriched) e.chapter = chapterFor(e.node.thread, e.months, seedRanges);

  // 4. Per-chapter date range (for chapter labels).
  const ranges = CHAPTERS.map((_, ci) => {
    const ms = enriched.filter((e) => e.chapter === ci && e.months !== null).map((e) => e.months!);
    if (ms.length === 0) return { start: 0, end: 1 };
    return { start: Math.min(...ms), end: Math.max(...ms) };
  });

  // 5. Global real-time span — the scale's domain.
  const datedMonths = enriched.filter((e) => e.months !== null).map((e) => e.months!);
  const minM = datedMonths.length ? Math.min(...datedMonths) : 0;
  const maxM = datedMonths.length ? Math.max(...datedMonths) : 1;
  const todayM = Math.max(0, monthsSinceEpoch(today));
  const xForMonth = (m: number) => EDGE_PAD + (m - minM) * PX_PER_MONTH;

  if (mode === "ordinal") {
    return ordinalLayout(enriched, today, todayM);
  }

  // ── CALENDAR (default): swim-lane bands on a centred proportional time axis ──
  const xForNode = (e: EnrichedNode) => xForMonth(e.months ?? minM);
  const bandKeyOf = (e: EnrichedNode) => e.node.thread ?? CONTEXT_BAND;

  // 6. Band order: threads in chapter→thread order, then a Context band if used.
  const bandKeys: string[] = THREAD_ORDER.filter((t) =>
    enriched.some((e) => e.node.thread === t),
  );
  if (enriched.some((e) => !e.node.thread)) bandKeys.push(CONTEXT_BAND);

  // 7. Per band: greedy sub-lane pack by true temporal x so nothing overlaps.
  interface PlacedInBand { e: EnrichedNode; cx: number; lane: number; }
  const bandData = bandKeys.map((bk) => {
    const ms = enriched
      .filter((e) => bandKeyOf(e) === bk)
      .sort((a, b) => (a.months ?? minM) - (b.months ?? minM));
    const laneRight: number[] = [];
    const placed: PlacedInBand[] = ms.map((e) => {
      const cx = xForNode(e);
      const left = cx - NODE_W / 2;
      let lane = 0;
      while (lane < laneRight.length && laneRight[lane] + LANE_HGAP > left) lane++;
      laneRight[lane] = cx + NODE_W / 2;
      return { e, cx, lane };
    });
    const subLanes = Math.max(1, laneRight.length);
    const height = BAND_PAD_TOP + subLanes * SUBLANE_STEP + BAND_PAD_BOT;
    return { bk, placed, height };
  });

  // 8. Stack bands ±Y about the centred axis (y=0). Upper = first ceil(n/2)
  //    bands (closest to the axis = band k-1, reading upward); lower = the rest.
  const n = bandData.length;
  const k = Math.ceil(n / 2);
  const top: number[] = new Array(n).fill(0);
  let cur = -AXIS_GUTTER / 2;
  for (let bi = k - 1; bi >= 0; bi--) {
    top[bi] = cur - bandData[bi].height;
    cur = top[bi] - BAND_GAP;
  }
  cur = AXIS_GUTTER / 2;
  for (let bi = k; bi < n; bi++) {
    top[bi] = cur;
    cur += bandData[bi].height + BAND_GAP;
  }
  const minTop = n ? Math.min(...top) : -AXIS_GUTTER / 2;
  const offsetY = -minTop + Y_MARGIN; // shift everything to positive coords
  const axisY = offsetY;

  // 9. Place nodes within their bands.
  const positioned: PositionedNode[] = [];
  bandData.forEach((b, bi) => {
    const bandTopY = top[bi] + offsetY;
    for (const p of b.placed) {
      const cy = bandTopY + BAND_PAD_TOP + NODE_H / 2 + p.lane * SUBLANE_STEP;
      positioned.push({
        id: p.e.node.id,
        x: p.cx - NODE_W / 2,
        y: cy - NODE_H / 2,
        cx: p.cx,
        cy,
        chapter: p.e.chapter,
        effectiveDate: p.e.eff,
      });
    }
  });

  // 10. Canvas size.
  const lastCx = positioned.length ? Math.max(...positioned.map((p) => p.cx)) : EDGE_PAD;
  const todayX = xForMonth(todayM);
  const width = Math.max(lastCx, todayX) + NODE_W / 2 + EDGE_PAD;
  const maxBottom = n
    ? Math.max(...bandData.map((b, bi) => top[bi] + b.height)) + offsetY
    : axisY + MIN_CONTENT_H / 2;
  const height = maxBottom + Y_MARGIN;

  // 11. Swim bands (full-width horizontal strips, no overlap).
  const bands: SwimBand[] = bandData.map((b, bi) => {
    const ci = b.bk === CONTEXT_BAND ? 0 : THREAD_TO_CHAPTER.get(b.bk) ?? 0;
    const ms = b.placed.map((p) => p.e.months).filter((m): m is number => m != null);
    const rangeLabel = ms.length
      ? (() => {
          const s = monthToLabel(Math.min(...ms));
          const e2 = monthToLabel(Math.max(...ms));
          return s === e2 ? s : `${s} – ${e2}`;
        })()
      : "";
    return {
      key: b.bk,
      thread: threadLabelKebab(b.bk),
      label: humanThread(b.bk),
      rangeLabel,
      chapter: ci,
      x: 0,
      y: top[bi] + offsetY,
      width,
      height: b.height,
    };
  });

  // 12. Chapter groupings (mobile only — geometry is placeholder).
  const zones: ZoneBand[] = CHAPTERS.map((c, i) => {
    const r = ranges[i];
    const startLbl = monthToLabel(r.start);
    const endLbl = monthToLabel(r.end);
    const rangeLabel =
      i === CHAPTERS.length - 1 && r.end > monthsSinceEpoch(today)
        ? `${startLbl} → projected`
        : startLbl === endLbl
          ? startLbl
          : `${startLbl} – ${endLbl}`;
    return { key: c.key, index: i, kicker: c.kicker, title: c.title, rangeLabel, x: 0, width, height };
  });

  // 13. Axis ticks: monthly, EVENLY spaced by real time (the scale is legible).
  const ticks: AxisTick[] = [];
  const firstM = Math.floor(Math.min(minM, todayM));
  const lastM = Math.ceil(Math.max(maxM, todayM));
  let prevYear: number | null = null;
  for (let m = firstM; m <= lastM; m++) {
    const idx = ((m % 12) + 12) % 12;
    const year = 2026 + Math.floor(m / 12);
    ticks.push({ x: xForMonth(m), label: MONTHS[idx], sub: idx === 0 || prevYear === null ? String(year) : null });
    prevYear = year;
  }

  // 14. Sub-containers are subsumed by the swim bands now → none in band mode.
  return {
    nodes: positioned,
    zones,
    bands,
    subgroups: [],
    axis: { y: axisY, xStart: 0, xEnd: width, ticks, todayX, today },
    width,
    height,
  };
}

// ── Ordinal mode (the rejected equal-width reading; behind the flag only) ─────
function ordinalLayout(
  enriched: EnrichedNode[],
  today: string,
  todayM: number,
): FlowLayout {
  const colIndex = new Map<string, number>();
  let gi = 0;
  for (let ci = 0; ci < CHAPTERS.length; ci++) {
    const dates = [
      ...new Set(enriched.filter((e) => e.chapter === ci && e.eff).map((e) => e.eff!)),
    ].sort();
    for (const d of dates) colIndex.set(`${ci}:${d}`, gi++);
    for (const e of enriched.filter((e) => e.chapter === ci && !e.eff)) {
      colIndex.set(`u:${e.node.id}`, gi++);
    }
  }
  const ordX = (i: number) => EDGE_PAD + i * COL_STEP + COL_STEP / 2;
  const xForNode = (e: EnrichedNode) =>
    ordX(e.eff ? colIndex.get(`${e.chapter}:${e.eff}`)! : colIndex.get(`u:${e.node.id}`)!);

  const sorted = [...enriched].sort(
    (a, b) => (a.months ?? 0) - (b.months ?? 0) || xForNode(a) - xForNode(b),
  );
  const laneRight: number[] = [];
  const positioned: PositionedNode[] = [];
  let maxRows = 1;
  for (const e of sorted) {
    const cx = xForNode(e);
    const left = cx - NODE_W / 2;
    let lane = 0;
    while (lane < laneRight.length && laneRight[lane] + LANE_HGAP > left) lane++;
    laneRight[lane] = cx + NODE_W / 2;
    maxRows = Math.max(maxRows, lane + 1);
    const cy = ORD_CONTENT_TOP + NODE_H / 2 + lane * ORD_ROW_STEP;
    positioned.push({ id: e.node.id, x: cx - NODE_W / 2, y: cy - NODE_H / 2, cx, cy, chapter: e.chapter, effectiveDate: e.eff });
  }
  const lastCx = positioned.length ? Math.max(...positioned.map((p) => p.cx)) : EDGE_PAD;
  const width = lastCx + NODE_W / 2 + EDGE_PAD;
  const contentH = Math.max(MIN_CONTENT_H, ORD_CONTENT_TOP + maxRows * ORD_ROW_STEP);
  const height = contentH + AXIS_RESERVE;
  const axisY = contentH + 40;

  const zones: ZoneBand[] = CHAPTERS.map((c, i) => ({
    key: c.key, index: i, kicker: c.kicker, title: c.title, rangeLabel: "", x: i * COL_STEP, width: COL_STEP, height,
  }));

  const ticks: AxisTick[] = [];
  const seen = new Set<number>();
  for (const e of [...enriched].filter((e) => e.eff).sort((a, b) => (a.months ?? 0) - (b.months ?? 0))) {
    const x = Math.round(xForNode(e));
    if (seen.has(x)) continue;
    seen.add(x);
    const { label, year } = fmtDate(e.eff!);
    ticks.push({ x, label, sub: String(year) });
  }
  // interpolate today on the equidistant columns
  const dated = positioned
    .map((p) => ({ cx: p.cx, m: enriched.find((e) => e.node.id === p.id)?.months ?? null }))
    .filter((d): d is { cx: number; m: number } => d.m !== null)
    .sort((a, b) => a.m - b.m);
  let todayX = width / 2;
  if (dated.length) {
    if (todayM <= dated[0].m) todayX = dated[0].cx;
    else if (todayM >= dated[dated.length - 1].m) todayX = dated[dated.length - 1].cx + COL_STEP / 2;
    else {
      let hi = dated.findIndex((d) => d.m >= todayM);
      if (hi < 1) hi = 1;
      const lo = dated[hi - 1];
      const up = dated[hi];
      todayX = lo.cx + ((todayM - lo.m) / (up.m - lo.m || 1)) * (up.cx - lo.cx);
    }
  }
  return {
    nodes: positioned,
    zones,
    bands: [],
    subgroups: [],
    axis: { y: axisY, xStart: 0, xEnd: width, ticks, todayX, today },
    width,
    height,
  };
}
