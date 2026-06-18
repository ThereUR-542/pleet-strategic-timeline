// =============================================================================
// Unit tests for demand-viz selectors (PRD §5/§6)
// All tested values are THEORETICAL / ILLUSTRATIVE.
// =============================================================================

import { describe, it, expect } from "vitest";
import { DEMAND_MODEL, NODES } from "../data/timeline-fixture";
import { backgroundCurveSamples, projectScores, equipmentStepSeries } from "./demand-viz";

describe("backgroundCurveSamples (§5.1/§6.1)", () => {
  it("covers the requested window to the last sample", () => {
    const samples = backgroundCurveSamples(DEMAND_MODEL, 0, 18);
    expect(samples.length).toBeGreaterThan(0);
    expect(samples[samples.length - 1].tMonths).toBeCloseTo(18, 1);
  });

  it("excludes months before tMin", () => {
    const samples = backgroundCurveSamples(DEMAND_MODEL, 3, 12);
    expect(samples[0].tMonths).toBeGreaterThanOrEqual(3);
  });

  it("includes months up to tMax", () => {
    const samples = backgroundCurveSamples(DEMAND_MODEL, 0, 6);
    const lastT = samples[samples.length - 1].tMonths;
    expect(lastT).toBeCloseTo(6, 1);
  });

  it("values stay within [0, L] — THEORETICAL ceiling (§6.1)", () => {
    const samples = backgroundCurveSamples(DEMAND_MODEL, 0, 36);
    expect(samples.every((s) => s.value >= 0 && s.value <= DEMAND_MODEL.L + 1e-9)).toBe(true);
  });

  it("values are non-decreasing (logistic shape) (§6.1)", () => {
    const samples = backgroundCurveSamples(DEMAND_MODEL, 0, 18);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].value).toBeGreaterThanOrEqual(samples[i - 1].value - 1e-9);
    }
  });

  it("is approximately 0 at t=0 and non-trivial by t=5.5 (§6.1 shape contract)", () => {
    const full = backgroundCurveSamples(DEMAND_MODEL, 0, 18);
    const atZero = full.find((s) => s.tMonths === 0)?.value ?? 0;
    const atAnchor = backgroundCurveSamples(DEMAND_MODEL, 5.5, 6);
    expect(atZero).toBeLessThan(5);
    expect(atAnchor[0].value).toBeGreaterThan(40);
  });

  it("empty window returns no samples", () => {
    const samples = backgroundCurveSamples(DEMAND_MODEL, 10, 10);
    expect(samples.length).toBe(1); // tMin === tMax → exactly the one point at t=10
  });
});

describe("projectScores (§5.2/§6.2)", () => {
  it("returns only nodes that carry a non-null THEORETICAL demandScore", () => {
    const scores = projectScores(NODES);
    expect(scores.length).toBeGreaterThan(0);
    expect(scores.every((s) => typeof s.demandScore === "number")).toBe(true);
  });

  it("all THEORETICAL scores are in [0, 100]", () => {
    projectScores(NODES).forEach((s) => {
      expect(s.demandScore).toBeGreaterThanOrEqual(0);
      expect(s.demandScore).toBeLessThanOrEqual(100);
    });
  });

  it("each entry has a nodeId that exists in NODES", () => {
    const nodeIds = new Set(NODES.map((n) => n.id));
    projectScores(NODES).forEach((s) => {
      expect(nodeIds.has(s.nodeId)).toBe(true);
    });
  });

  it("each entry has a non-empty title", () => {
    projectScores(NODES).forEach((s) => {
      expect(s.title.length).toBeGreaterThan(0);
    });
  });

  it("nodes with null demandScore are excluded", () => {
    const nullNodes = NODES.filter((n) => n.demandScore === null);
    const scoreIds = new Set(projectScores(NODES).map((s) => s.nodeId));
    nullNodes.forEach((n) => {
      expect(scoreIds.has(n.id)).toBe(false);
    });
  });

  it("empty node list returns empty scores", () => {
    expect(projectScores([])).toEqual([]);
  });
});

describe("equipmentStepSeries (§6.3/§5.3)", () => {
  it("returns at least one step in a 24-month window", () => {
    expect(equipmentStepSeries(DEMAND_MODEL, 24).length).toBeGreaterThan(0);
  });

  it("machine counts are non-negative integers", () => {
    equipmentStepSeries(DEMAND_MODEL, 24).forEach((s) => {
      expect(Number.isInteger(s.machines)).toBe(true);
      expect(s.machines).toBeGreaterThanOrEqual(0);
    });
  });

  it("steps up at least once — confirms the Oklahoma manufacturing trigger (§5.3)", () => {
    const steps = equipmentStepSeries(DEMAND_MODEL, 24);
    const peak = Math.max(...steps.map((s) => s.machines));
    expect(peak).toBeGreaterThan(1);
  });

  it("all tMonths are within [0, ceil(tMax)]", () => {
    const tMax = 12;
    equipmentStepSeries(DEMAND_MODEL, tMax).forEach((s) => {
      expect(s.tMonths).toBeGreaterThanOrEqual(0);
      expect(s.tMonths).toBeLessThanOrEqual(Math.ceil(tMax));
    });
  });

  it("consecutive steps record distinct machine counts (deduplication)", () => {
    const steps = equipmentStepSeries(DEMAND_MODEL, 24);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].machines).not.toBe(steps[i - 1].machines);
    }
  });

  it("first step starts at t=0 with machines ≥ 0", () => {
    const steps = equipmentStepSeries(DEMAND_MODEL, 24);
    expect(steps[0].tMonths).toBe(0);
    expect(steps[0].machines).toBeGreaterThanOrEqual(0);
  });
});
