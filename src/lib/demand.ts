// =============================================================================
// Pleet Strategic Timeline — Demand Model & Dual-Verification (PRD §6)
// -----------------------------------------------------------------------------
// THEORETICAL / ILLUSTRATIVE. Every function is a configurable placeholder so
// Lawrence's real methodology (§12 BLOCKER) is a *parameter swap*, not a rewrite.
// The dual-verification harness — algebraic closed form vs. calculus numeric
// integration, agreeing to |Δ| ≤ 1e-4 (§4.6/§6.4) — is the durable part and
// stays identical when the formula changes. This is the FROZEN math contract;
// changes go through the Engineering Lead.
// =============================================================================

import type { DemandModel, DemandPoint } from "../data/types";

/** Agreement tolerance for dual verification (PRD §4.6 / §6.4). */
export const DUAL_VERIFY_TOLERANCE = 1e-4;

// --- §6.1 Aggregate background demand D(t) = L / (1 + e^(−k(t − t0))) --------
// t = months since 2026-01-01 (Jan = 0).
export function demandAt(t: number, m: Pick<DemandModel, "L" | "k" | "t0">): number {
  return m.L / (1 + Math.exp(-m.k * (t - m.t0)));
}

/** Sample D(t) on `[0, tMax]` at `step`-month resolution for the background layer. */
export function sampleDemandCurve(
  m: Pick<DemandModel, "L" | "k" | "t0">,
  tMax: number,
  step = 0.25,
): DemandPoint[] {
  const points: DemandPoint[] = [];
  // Integer loop avoids floating-point drift accumulating on tMonths.
  const n = Math.round(tMax / step);
  for (let i = 0; i <= n; i++) {
    const tMonths = i * step;
    points.push({ tMonths, value: demandAt(tMonths, m) });
  }
  return points;
}

// --- §6.4 Method A — Algebraic closed form ----------------------------------
//   ∫ D(t) dt = (L/k) · ln(1 + e^(k(t − t0)))   (+ const)
//   `log1pExp` keeps ln(1 + e^x) numerically stable for large x.
function log1pExp(x: number): number {
  return x > 0 ? x + Math.log1p(Math.exp(-x)) : Math.log1p(Math.exp(x));
}

export function cumulativeDemandClosedForm(
  a: number,
  b: number,
  m: Pick<DemandModel, "L" | "k" | "t0">,
): number {
  const F = (t: number) => (m.L / m.k) * log1pExp(m.k * (t - m.t0));
  return F(b) - F(a);
}

// --- §6.4 Method B — Calculus numeric integration (composite Simpson's rule) -
export function cumulativeDemandNumeric(
  a: number,
  b: number,
  m: Pick<DemandModel, "L" | "k" | "t0">,
  intervals = 1000,
): number {
  const n = intervals % 2 === 0 ? intervals : intervals + 1; // Simpson needs even n
  const h = (b - a) / n;
  let sum = demandAt(a, m) + demandAt(b, m);
  for (let i = 1; i < n; i++) {
    const t = a + i * h;
    sum += (i % 2 === 0 ? 2 : 4) * demandAt(t, m);
  }
  return (h / 3) * sum;
}

export interface VerificationResult {
  closedForm: number;
  numeric: number;
  delta: number;
  /** True iff |Δ| ≤ tolerance — the value is safe to display (§4.6). */
  ok: boolean;
}

/** Run both methods and assert agreement to DUAL_VERIFY_TOLERANCE (§6.4). */
export function verifyCumulativeDemand(
  a: number,
  b: number,
  m: Pick<DemandModel, "L" | "k" | "t0">,
): VerificationResult {
  const closedForm = cumulativeDemandClosedForm(a, b, m);
  const numeric = cumulativeDemandNumeric(a, b, m);
  const delta = Math.abs(closedForm - numeric);
  return { closedForm, numeric, delta, ok: delta <= DUAL_VERIFY_TOLERANCE };
}

// --- §6.2 Per-project demand score P_i = 100 × Σ_j (w_j × x_ij), Σ w_j = 1 ---
export interface ProjectFactors {
  R: number; // reach
  V: number; // value
  C: number; // convergence
  S: number; // stage
  M: number; // media
}

export function projectDemandScore(x: ProjectFactors, w: DemandModel["weights"]): number {
  return 100 * (w.R * x.R + w.V * x.V + w.C * x.C + w.S * x.S + w.M * x.M);
}

/** Cross-check P_i by an independent re-summation in a different order (§6.4). */
export function verifyProjectScore(
  x: ProjectFactors,
  w: DemandModel["weights"],
): VerificationResult {
  const closedForm = projectDemandScore(x, w);
  const numeric = 100 * (w.M * x.M + w.S * x.S + w.C * x.C + w.V * x.V + w.R * x.R);
  const delta = Math.abs(closedForm - numeric);
  return { closedForm, numeric, delta, ok: delta <= DUAL_VERIFY_TOLERANCE };
}

/** Weights must sum to 1 (§6.2) for scores to stay on the 0–100 scale. */
export function weightsAreNormalized(w: DemandModel["weights"]): boolean {
  const sum = w.R + w.V + w.C + w.S + w.M;
  return Math.abs(sum - 1) <= DUAL_VERIFY_TOLERANCE;
}

// --- §6.3 Equipment demand N(t) = ceil( Q(t) / C_machine ) — cause→effect ----
export function equipmentDemand(Qt: number, cMachine: number): number {
  if (cMachine <= 0) return 0;
  return Math.ceil(Qt / cMachine);
}

/** Integer months where N(t) steps up — the §5.3 manufacturing triggers. */
export function equipmentSteps(
  m: DemandModel,
  tMax: number,
): { tMonths: number; machines: number }[] {
  const steps: { tMonths: number; machines: number }[] = [];
  let prev = -1;
  for (let t = 0; t <= Math.ceil(tMax); t++) {
    const machines = equipmentDemand(demandAt(t, m), m.cMachine);
    if (machines !== prev) {
      steps.push({ tMonths: t, machines });
      prev = machines;
    }
  }
  return steps;
}
