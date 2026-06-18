// PLE-92: Timeline-axis layout — proves every node is placed on the axis, NOTHING
// overlaps (Lawrence's hard constraint), nodes sit above/below the axis, and the
// axis carries month ticks + a today marker reading left→right in time.

import { describe, it, expect } from "vitest";
import { NODES, EDGES } from "../../data/content";
import { computeTimelineLayout, effectiveDate, NODE_W, NODE_H } from "./layout";

const TODAY = "2026-06-17";

describe("computeTimelineLayout", () => {
  const layout = computeTimelineLayout(NODES, EDGES, TODAY);

  it("places every node exactly once", () => {
    expect(layout.nodes).toHaveLength(NODES.length);
    expect(new Set(layout.nodes.map((n) => n.id)).size).toBe(NODES.length);
  });

  it("never overlaps two nodes (the hard constraint)", () => {
    for (let i = 0; i < layout.nodes.length; i++) {
      for (let j = i + 1; j < layout.nodes.length; j++) {
        const a = layout.nodes[i];
        const b = layout.nodes[j];
        const overlap =
          Math.abs(a.cx - b.cx) < NODE_W && Math.abs(a.cy - b.cy) < NODE_H;
        expect(overlap).toBe(false);
      }
    }
  });

  it("puts every node above OR below the axis (never on it)", () => {
    for (const n of layout.nodes) {
      expect(Math.abs(n.cy)).toBeGreaterThanOrEqual(NODE_H / 2);
    }
  });

  it("flows left → right in time (earlier date → smaller x)", () => {
    const formed = layout.nodes.find((n) => n.id === "n-pleet-formed")!;
    const printing = layout.nodes.find((n) => n.id === "n-oswego-printing")!;
    expect(formed.cx).toBeLessThan(printing.cx);
  });

  it("builds a ticked axis with a today marker inside the span", () => {
    expect(layout.axis.ticks.length).toBeGreaterThan(6);
    // PLE-133: per-date ticks carry the year when it changes (first tick always).
    expect(layout.axis.ticks[0].sub).not.toBeNull();
    expect(layout.axis.ticks.some((t) => /\d{4}/.test(t.sub ?? ""))).toBe(true);
    expect(layout.axis.todayX).toBeGreaterThan(layout.axis.xStart);
    expect(layout.axis.todayX).toBeLessThan(layout.axis.xEnd);
  });

  it("spaces date columns EVENLY (PLE-133 board directive)", () => {
    // Every distinct date tick is the same uniform step from the next — a
    // regular lattice, no compressed or variable gaps (continuity in spacing).
    const xs = [...new Set(layout.axis.ticks.map((t) => Math.round(t.x)))].sort(
      (a, b) => a - b,
    );
    const gaps = xs.slice(1).map((x, i) => x - xs[i]);
    // Uniform lattice: every gap is the base column step (or an exact multiple,
    // if a truly-undated node ever consumes an unticked slot between dates).
    const base = Math.min(...gaps);
    for (const g of gaps) expect(g % base).toBe(0);
  });

  it("stacks same-date nodes on a uniform, aligned row grid (PLE-133)", () => {
    // All node rows fall on the same vertical grid across every column.
    const cys = [...new Set(layout.nodes.map((n) => Math.round(n.cy)))].sort(
      (a, b) => a - b,
    );
    if (cys.length > 1) {
      const step = cys[1] - cys[0];
      for (let i = 1; i < cys.length; i++) {
        expect((cys[i] - cys[0]) % step).toBe(0);
      }
    }
  });

  it("buckets an undated node by its earliest dated neighbor", () => {
    const nodeMap = new Map(NODES.map((n) => [n.id, n]));
    const bo = NODES.find((n) => n.id === "n-bo-jett")!;
    expect(bo.date).toBeNull();
    expect(effectiveDate(bo, EDGES, nodeMap)).not.toBeNull();
  });
});
