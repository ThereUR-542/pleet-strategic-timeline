// =============================================================================
// Dual-verification tests (PRD §4.6 / §6.4) — the reproducible verification
// routine §4.6 requires. Asserts |Δ| ≤ 1e-4 agreement between the algebraic
// closed form and numeric integration, the demand-shape requirements (≈0 in Jan
// → significant by Jun), the per-project re-summation cross-check, the N(t)
// step function, and the shipped model's `verified` gate.
// =============================================================================

import { describe, it, expect } from "vitest";
import { DEMAND_MODEL } from "../data/timeline-fixture";
import {
  DUAL_VERIFY_TOLERANCE,
  demandAt,
  cumulativeDemandClosedForm,
  cumulativeDemandNumeric,
  verifyCumulativeDemand,
  projectDemandScore,
  verifyProjectScore,
  weightsAreNormalized,
  equipmentDemand,
  equipmentSteps,
} from "./demand";

const M = DEMAND_MODEL;

describe("logistic demand D(t) shape (§5.1/§6.1)", () => {
  it("is ≈ 0 in January 2026 (t = 0)", () => {
    expect(demandAt(0, M)).toBeLessThan(5);
  });

  it("is significant, non-zero by mid-June 2026 (t ≈ 5.5)", () => {
    expect(demandAt(5.5, M)).toBeGreaterThan(40);
  });

  it("is monotonically increasing across the modeled window", () => {
    let prev = -Infinity;
    for (let t = 0; t <= 18; t += 0.5) {
      const v = demandAt(t, M);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it("never exceeds the saturation ceiling L", () => {
    for (let t = 0; t <= 36; t += 0.5) {
      expect(demandAt(t, M)).toBeLessThanOrEqual(M.L + 1e-9);
    }
  });
});

describe("dual verification of cumulative demand (§6.4)", () => {
  const windows: [number, number][] = [
    [0, 5.5], // Jan → Jun 17 anchor
    [0, 12], // full first year
    [3, 9],
    [5.5, 18], // projected period
    [0, 36],
  ];

  for (const [a, b] of windows) {
    it(`closed form and Simpson agree to ≤ 1e-4 on [${a}, ${b}]`, () => {
      const r = verifyCumulativeDemand(a, b, M);
      expect(r.delta).toBeLessThanOrEqual(DUAL_VERIFY_TOLERANCE);
      expect(r.ok).toBe(true);
    });
  }

  it("agreement holds independent of the two raw method outputs", () => {
    const closed = cumulativeDemandClosedForm(0, 5.5, M);
    const numeric = cumulativeDemandNumeric(0, 5.5, M);
    expect(Math.abs(closed - numeric)).toBeLessThanOrEqual(DUAL_VERIFY_TOLERANCE);
  });

  it("flags a mismatch rather than passing silently when methods diverge", () => {
    const closed = cumulativeDemandClosedForm(0, 12, M);
    const coarse = cumulativeDemandNumeric(0, 12, M, 2); // too coarse on purpose
    expect(Math.abs(closed - coarse)).toBeGreaterThan(DUAL_VERIFY_TOLERANCE);
  });
});

describe("per-project demand score P_i (§6.2)", () => {
  it("ships with normalized weights (Σ w = 1)", () => {
    expect(weightsAreNormalized(M.weights)).toBe(true);
  });

  it("maps all-max factors to 100 and all-zero to 0", () => {
    const max = { R: 1, V: 1, C: 1, S: 1, M: 1 };
    const zero = { R: 0, V: 0, C: 0, S: 0, M: 0 };
    expect(projectDemandScore(max, M.weights)).toBeCloseTo(100, 6);
    expect(projectDemandScore(zero, M.weights)).toBeCloseTo(0, 6);
  });

  it("cross-checks P_i by reverse-order re-summation to ≤ 1e-4 (§6.4)", () => {
    const x = { R: 0.8, V: 0.6, C: 0.9, S: 0.7, M: 0.4 };
    const r = verifyProjectScore(x, M.weights);
    expect(r.delta).toBeLessThanOrEqual(DUAL_VERIFY_TOLERANCE);
    expect(r.ok).toBe(true);
  });
});

describe("equipment demand N(t) step function (§6.3/§5.3)", () => {
  it("is a non-decreasing integer count of machines", () => {
    expect(equipmentDemand(0, M.cMachine)).toBe(0);
    expect(Number.isInteger(equipmentDemand(73, M.cMachine))).toBe(true);
  });

  it("steps up at least once as demand accumulates (forces the OK scale-up)", () => {
    const steps = equipmentSteps(M, 24);
    const machinePeak = Math.max(...steps.map((s) => s.machines));
    expect(machinePeak).toBeGreaterThan(1);
  });
});

describe("model.verified gate (§4.6)", () => {
  it("is only trustworthy when the live harness passes on the anchor window", () => {
    const r = verifyCumulativeDemand(0, 5.5, M);
    expect(M.verified).toBe(true); // shipped model must actually pass its gate
    expect(r.ok).toBe(true);
  });
});
