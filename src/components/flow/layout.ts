// =============================================================================
// Timeline-axis layout (PLE-92, v4). Board direction (Lawrence, 2026-06-18):
// "I want to SEE time — a line with demarcations and tics, each node above or
// below its tick on the x-axis timeline, to show the EVOLUTION of concepts and
// events." So: a real horizontal time axis with month ticks; each node anchored
// at its date's x, placed in stacked lanes ABOVE or BELOW the axis (never
// overlapping — the hard constraint still holds), with a stem to its tick.
// Relationship edges remain as light connectors so the evolution still reads.
// =============================================================================

import type { Edge, TimelineNode } from "../../data/types";
import { nodeAxisDate, monthsSinceEpoch } from "../../lib/temporal";

export const NODE_W = 202;
export const NODE_H = 60;

const LEFT = 140; // x of the timeline's first tick (Jan 2026)
const PX_PER_MONTH = 172;
const AXIS_GAP = 48; // gap between the axis line and the nearest card edge
const LANE_VGAP = 16; // vertical gap between stacked lanes on one side
const MIN_X_GAP = NODE_W + 16; // min horizontal gap between cards sharing a lane

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export interface PositionedNode {
  id: string;
  /** Top-left (React Flow coords). */
  x: number;
  y: number;
  /** Card center. */
  cx: number;
  cy: number;
  /** True when the node sits above the axis. */
  above: boolean;
  effectiveDate: string | null;
}

export interface AxisTick {
  x: number;
  label: string;
  /** Year shown under January ticks. */
  sub: string | null;
}

export interface TimelineAxis {
  y: number;
  xStart: number;
  xEnd: number;
  ticks: AxisTick[];
  todayX: number;
  today: string;
}

export interface FlowLayout {
  nodes: PositionedNode[];
  axis: TimelineAxis;
  width: number;
  height: number;
}

/**
 * Effective date used to place a node on the axis: its own axis date, else the
 * EARLIEST axis date among its edge neighbors (so an undated person sits where
 * they enter the story), else `today` (kept on the axis, never floating off).
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

function xForMonths(m: number): number {
  return LEFT + m * PX_PER_MONTH;
}

/** Lanes interleave near→far, above→below: a0, b0, a1, b1, … */
function laneCenterY(index: number): number {
  const k = Math.floor(index / 2);
  const above = index % 2 === 0;
  const mag = AXIS_GAP + NODE_H / 2 + k * (NODE_H + LANE_VGAP);
  return above ? -mag : mag;
}

export function computeTimelineLayout(
  nodes: TimelineNode[],
  edges: Edge[],
  today: string,
): FlowLayout {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Effective date + month coordinate for every node. Dated nodes (own date or
  // a dated neighbor) sit at that month. Undated-AND-isolated nodes carry no
  // time signal, so we SPREAD them evenly across the dated span — they fill the
  // timeline instead of piling onto "today" (and their card shows no date).
  const dated = nodes.map((n) => ({ n, eff: effectiveDate(n, edges, nodeMap) }));
  const datedMonths = dated
    .filter((d) => d.eff !== null)
    .map((d) => Math.max(0, monthsSinceEpoch(d.eff!)));
  const minM = datedMonths.length ? Math.min(...datedMonths) : 0;
  const maxM = datedMonths.length ? Math.max(...datedMonths) : 1;
  let floatI = 0;
  const floatCount = dated.filter((d) => d.eff === null).length;

  const placed = dated.map(({ n, eff }) => {
    let months: number;
    if (eff !== null) {
      months = Math.max(0, monthsSinceEpoch(eff));
    } else {
      // even spread across the populated span
      const frac = floatCount > 1 ? floatI / (floatCount - 1) : 0.5;
      months = minM + frac * (maxM - minM);
      floatI++;
    }
    return { node: n, eff, months };
  });
  placed.sort((a, b) => a.months - b.months);

  // Greedy lane packing: first free lane (interleaved near→far above/below).
  // Lanes are UNBOUNDED, so nothing can ever overlap — the column just grows
  // taller where activity clusters (pan/zoom handles it).
  const laneLastX = new Map<number, number>();
  const positioned: PositionedNode[] = [];
  let maxAbs = 0;

  for (const p of placed) {
    const cx = xForMonths(p.months);
    let lane = 0;
    while ((laneLastX.get(lane) ?? -Infinity) > cx - MIN_X_GAP) lane++;
    laneLastX.set(lane, cx);
    const cy = laneCenterY(lane);
    maxAbs = Math.max(maxAbs, Math.abs(cy) + NODE_H / 2);
    positioned.push({
      id: p.node.id,
      x: cx - NODE_W / 2,
      y: cy - NODE_H / 2,
      cx,
      cy,
      above: cy < 0,
      effectiveDate: p.eff,
    });
  }

  // Axis ticks across the full span (one per month, +1 trailing).
  const maxMonths = placed.length ? Math.ceil(placed[placed.length - 1].months) : 1;
  const ticks: AxisTick[] = [];
  for (let m = 0; m <= maxMonths + 1; m++) {
    const monthIdx = m % 12;
    const year = 2026 + Math.floor(m / 12);
    ticks.push({
      x: xForMonths(m),
      label: MONTHS[monthIdx],
      sub: monthIdx === 0 ? String(year) : null,
    });
  }

  const xStart = xForMonths(0) - 40;
  const xEnd = xForMonths(maxMonths + 1) + 40;
  const todayX = xForMonths(Math.max(0, monthsSinceEpoch(today)));

  return {
    nodes: positioned,
    axis: { y: 0, xStart, xEnd, ticks, todayX, today },
    width: xEnd,
    height: maxAbs * 2 + 80,
  };
}
