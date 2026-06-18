// =============================================================================
// Pleet Strategic Timeline — Demand-Viz Selectors (PRD §5/§6)
// -----------------------------------------------------------------------------
// Pure-function selectors built ONLY on src/lib/demand.ts (frozen). They expose
// the three data series the renderer needs for the demand visualization layer:
//   1. Background curve samples for the visible time window (§5.1/§6.1)
//   2. Per-project THEORETICAL demand scores (§5.2/§6.2)
//   3. N(t) equipment step function for the manufacturing-imperative overlay (§6.3/§5.3)
//
// All output is THEORETICAL / ILLUSTRATIVE. Never fabricate numbers; derive from
// the demand model parameters only (§12). Labels must reflect this in the UI.
// =============================================================================

import type { DemandModel, DemandPoint, TimelineNode } from "../data/types";
import { sampleDemandCurve, equipmentSteps } from "./demand";

// --- §5.1 / §6.1 Background curve -------------------------------------------

/** Sample D(t) on [tMin, tMax] at `step`-month resolution (§5.1/§6.1).
 *  Delegates to demand.ts sampleDemandCurve then filters to the window. */
export function backgroundCurveSamples(
  model: Pick<DemandModel, "L" | "k" | "t0">,
  tMin: number,
  tMax: number,
  step = 0.25,
): DemandPoint[] {
  return sampleDemandCurve(model, tMax, step).filter((p) => p.tMonths >= tMin);
}

// --- §5.2 / §6.2 Per-project demand scores ----------------------------------

export interface ProjectScore {
  nodeId: string;
  title: string;
  /** THEORETICAL / ILLUSTRATIVE 0–100 score (§5.2/§6.2). */
  demandScore: number;
}

/** Return all nodes that carry a non-null THEORETICAL demandScore (§5.2/§6.2).
 *  Only nodes whose demandScore was explicitly set (projects and key milestones)
 *  are included; person/concept nodes with null are excluded. */
export function projectScores(nodes: readonly TimelineNode[]): ProjectScore[] {
  return nodes
    .filter((n): n is TimelineNode & { demandScore: number } => n.demandScore !== null)
    .map((n) => ({ nodeId: n.id, title: n.title, demandScore: n.demandScore }));
}

// --- §6.3 / §5.3 Equipment demand N(t) step series --------------------------

/** N(t) = ceil(D(t) / C_machine) at integer months, filtered to unique steps.
 *  Each entry is a manufacturing-imperative trigger: demand just outpaced the
 *  previous fleet size. Delegates to demand.ts equipmentSteps without modification. */
export function equipmentStepSeries(
  model: DemandModel,
  tMax: number,
): { tMonths: number; machines: number }[] {
  return equipmentSteps(model, tMax);
}
