// =============================================================================
// Flow-graph layout (PLE-92). Deterministic, non-overlapping placement for the
// React Flow node-graph. Lawrence's hard constraint is "NOTHING stacked on top
// of something else" — so layout is by construction: every node lands in one
// chronological STAGE column and gets its own vertical slot. No two nodes can
// share a cell, so nothing can overlap. Relationship edges weave between columns
// as labeled arrows — a flow chart, not a dense timeline rail.
// =============================================================================

import type { Edge, TimelineNode } from "../../data/types";
import { nodeAxisDate } from "../../lib/temporal";
import { STAGES, stageForDate } from "./flowTheme";

export const NODE_W = 236;
export const NODE_H = 78;
const ROW_PITCH = NODE_H + 28; // vertical distance between stacked nodes
const SUBCOL_PITCH = NODE_W + 48; // horizontal distance between sub-columns
const STAGE_GAP = 96; // extra horizontal gap between stages
const MAX_ROWS = 7; // a stage wider than this wraps into balanced sub-columns

export interface PositionedNode {
  id: string;
  x: number;
  y: number;
  /** Stage column index. */
  stage: number;
  effectiveDate: string | null;
}

export interface ColumnMeta {
  stage: number;
  label: string;
  blurb: string;
  /** Left x of the column's node band. */
  x: number;
  count: number;
  /** Top y of the header (above the first node). */
  headerY: number;
}

export interface FlowLayout {
  nodes: PositionedNode[];
  columns: ColumnMeta[];
  width: number;
  height: number;
}

/**
 * Effective date used to bucket a node into a stage column:
 *   its own axis date, else the EARLIEST axis date among its edge neighbors
 *   (so an undated person sits where they enter the story), else null.
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

const HEADER_GAP = 56; // space between the column header and its first node

/** Compute a non-overlapping, left→right, chronological flow layout. */
export function computeFlowLayout(
  nodes: TimelineNode[],
  edges: Edge[],
): FlowLayout {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // 1. Bucket every node into exactly one stage column.
  const buckets: TimelineNode[][] = STAGES.map(() => []);
  const effDates = new Map<string, string | null>();
  for (const n of nodes) {
    const eff = effectiveDate(n, edges, nodeMap);
    effDates.set(n.id, eff);
    buckets[stageForDate(eff).index].push(n);
  }

  // 2. Sort within a column by date then title for a stable, readable stack.
  for (const b of buckets) {
    b.sort((a, c) => {
      const da = effDates.get(a.id) ?? "";
      const dc = effDates.get(c.id) ?? "";
      if (da !== dc) return da < dc ? -1 : 1;
      return a.title.localeCompare(c.title);
    });
  }

  // 3. Place. A stage taller than MAX_ROWS wraps into balanced sub-columns so no
  //    column towers over the rest. Every node still owns one slot (a distinct
  //    sub-column + row), so overlap is impossible by construction.
  const rowsPerCol = buckets.map((b) =>
    Math.max(1, Math.ceil(b.length / Math.max(1, Math.ceil(b.length / MAX_ROWS)))),
  );
  const globalMaxRows = Math.max(1, ...rowsPerCol);
  const headerY = -((globalMaxRows - 1) * ROW_PITCH) / 2 - HEADER_GAP;

  const positioned: PositionedNode[] = [];
  const columns: ColumnMeta[] = [];
  let stageX = 0;

  buckets.forEach((bucket, stage) => {
    const perCol = rowsPerCol[stage];
    const subCols = Math.max(1, Math.ceil(bucket.length / perCol));

    bucket.forEach((n, idx) => {
      const sub = Math.floor(idx / perCol);
      const row = idx % perCol;
      // How many nodes actually land in THIS sub-column (last one may be short).
      const inThisSub = Math.min(perCol, bucket.length - sub * perCol);
      const startY = -((inThisSub - 1) * ROW_PITCH) / 2;
      positioned.push({
        id: n.id,
        x: stageX + sub * SUBCOL_PITCH,
        y: startY + row * ROW_PITCH,
        stage,
        effectiveDate: effDates.get(n.id) ?? null,
      });
    });

    const s = STAGES[stage];
    columns.push({
      stage,
      label: s.label,
      blurb: s.blurb,
      x: stageX,
      count: bucket.length,
      headerY,
    });

    stageX += subCols * SUBCOL_PITCH + STAGE_GAP;
  });

  const width = stageX;
  const height = (globalMaxRows - 1) * ROW_PITCH + NODE_H;

  return { nodes: positioned, columns, width, height };
}
