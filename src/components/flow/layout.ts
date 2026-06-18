// =============================================================================
// Flow-graph layout (PLE-92, v3). Board feedback: NOT a rigid stacked-column
// timeline rail. Lawrence wants a Sankey / Big-Bang shape — a small origin that
// EXPANDS as the story evolves and converges, with EDGE-CROSSING MINIMIZATION,
// time reading left→right by causality (not a literal axis).
//
// So we use dagre (layered graph layout): its ordering pass minimizes crossings,
// and an invisible per-period "time backbone" pins ranks so the graph still
// flows Jan → now → future left→right. Real relationship edges are weighted
// ABOVE the backbone so the layout straightens the story, not the scaffolding.
// dagre also guarantees non-overlap (Lawrence's original hard constraint holds).
// =============================================================================

import dagre from "dagre";
import type { Edge, TimelineNode } from "../../data/types";
import { nodeAxisDate, monthsSinceEpoch } from "../../lib/temporal";

export const NODE_W = 236;
export const NODE_H = 78;

const ANCHOR = "__t__"; // invisible time-backbone node id prefix

export interface PositionedNode {
  id: string;
  /** Top-left (React Flow coords). */
  x: number;
  y: number;
  /** Period bucket index (months since Jan 2026) — for the time ribbon. */
  bucket: number;
  effectiveDate: string | null;
}

export interface FlowLayout {
  nodes: PositionedNode[];
  width: number;
  height: number;
  minBucket: number;
  maxBucket: number;
}

/**
 * Effective date used to place a node in time: its own axis date, else the
 * EARLIEST axis date among its edge neighbors (so an undated person flows in
 * where they enter the story), else null.
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

/** Month bucket (Jan 2026 = 0). Undated-and-isolated nodes flow into "now". */
function bucketFor(eff: string | null, todayBucket: number): number {
  if (!eff) return todayBucket;
  return Math.max(0, Math.floor(monthsSinceEpoch(eff)));
}

/**
 * Compute a crossing-minimized, left→right, expanding layout via dagre.
 * Synchronous (dagre is sync) so it stays cheap and unit-testable.
 */
export function computeFlowLayout(
  nodes: TimelineNode[],
  edges: Edge[],
  today: string,
): FlowLayout {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const todayBucket = Math.max(0, Math.floor(monthsSinceEpoch(today)));

  // 1. Time bucket per node. Nodes with a date (own or via a dated neighbor)
  //    land in that month. "Floating" nodes (undated AND unconnected) carry no
  //    time signal, so we spread them across the populated months — they fill
  //    the expanding cloud instead of piling into one tall column.
  const effById = new Map<string, string | null>();
  const bucketById = new Map<string, number>();
  const floating: TimelineNode[] = [];
  for (const n of nodes) {
    const eff = effectiveDate(n, edges, nodeMap);
    effById.set(n.id, eff);
    if (eff === null) floating.push(n);
    else bucketById.set(n.id, bucketFor(eff, todayBucket));
  }
  const datedBuckets = [...new Set(bucketById.values())].sort((a, b) => a - b);
  const spread = datedBuckets.length > 0 ? datedBuckets : [0];
  floating.forEach((n, i) => bucketById.set(n.id, spread[i % spread.length]));

  // 2. Group nodes into period layers (left → right).
  const sortedBuckets = [...new Set(bucketById.values())].sort((a, b) => a - b);
  const byBucket = new Map<number, string[]>();
  for (const b of sortedBuckets) byBucket.set(b, []);
  for (const n of nodes) byBucket.get(bucketById.get(n.id)!)!.push(n.id);

  const minBucket = sortedBuckets[0] ?? 0;
  const maxBucket = sortedBuckets[sortedBuckets.length - 1] ?? 0;

  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({
    rankdir: "LR",
    nodesep: 18,
    ranksep: 58,
    edgesep: 12,
    marginx: 44,
    marginy: 44,
    ranker: "network-simplex",
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });

  // 3. Invisible branching backbone — the Big-Bang scaffold. An origin fans out
  //    into the first period; each later period's nodes hang off the previous
  //    period's nodes (round-robin), so the graph EXPANDS from a point and ranks
  //    track time left→right. Backbone edges are NOT drawn — only real edges are.
  g.setNode(ANCHOR + "origin", { width: NODE_W, height: NODE_H });
  let prevLayer: string[] = [ANCHOR + "origin"];
  for (const b of sortedBuckets) {
    const layer = byBucket.get(b)!;
    layer.forEach((id, idx) => {
      g.setEdge(prevLayer[idx % prevLayer.length], id, { weight: 1, minlen: 1 }, "bb");
    });
    prevLayer = layer.length > 0 ? layer : prevLayer;
  }

  // 4. Real relationship edges, weighted ABOVE the backbone so dagre straightens
  //    the actual story and minimizes crossings around it.
  for (const e of edges) {
    if (nodeMap.has(e.from) && nodeMap.has(e.to)) {
      g.setEdge(e.from, e.to, { weight: 6, minlen: 1 }, "rel");
    }
  }

  dagre.layout(g);

  let maxX = 0;
  let maxY = 0;
  const positioned: PositionedNode[] = nodes.map((n) => {
    const d = g.node(n.id);
    const x = d.x - NODE_W / 2;
    const y = d.y - NODE_H / 2;
    maxX = Math.max(maxX, x + NODE_W);
    maxY = Math.max(maxY, y + NODE_H);
    return { id: n.id, x, y, bucket: bucketById.get(n.id)!, effectiveDate: effById.get(n.id) ?? null };
  });

  return { nodes: positioned, width: maxX, height: maxY, minBucket, maxBucket };
}
