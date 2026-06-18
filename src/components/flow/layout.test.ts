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

  it("uses a TRUE CALENDAR SCALE by default — equal px per unit time (PLE-133)", () => {
    // Lawrence's directive: the axis is proportional to real time, so the whole
    // month-tick grid is evenly spaced (a 2-month gap reads 2× a 1-month gap).
    const xs = layout.axis.ticks.map((t) => Math.round(t.x));
    const gaps = xs.slice(1).map((x, i) => x - xs[i]);
    const base = gaps[0];
    for (const g of gaps) expect(Math.abs(g - base)).toBeLessThanOrEqual(1);
    expect(base).toBeGreaterThan(0);
  });

  it("places nodes at their TRUE temporal x (proportional, not equidistant)", () => {
    // A node ~2 months after the origin sits ~2× as far right as one ~1 month
    // after — proportionality, the thing equal-width columns would destroy.
    const formed = layout.nodes.find((n) => n.id === "n-pleet-formed")!;
    const printing = layout.nodes.find((n) => n.id === "n-oswego-printing")!;
    // span between two real events is driven by real elapsed time, so the gap is
    // large (months apart) rather than a single fixed column step.
    expect(printing.cx - formed.cx).toBeGreaterThan(400);
  });

  it("organizes threads into horizontal swim-lane bands (PLE-133)", () => {
    // One band per thread present in the data; bands carry a label.
    expect(layout.bands.length).toBeGreaterThan(4);
    expect(layout.bands.every((b) => b.label.length > 0)).toBe(true);
  });

  it("never overlaps two BANDS (the immiscible-liquid rule, PLE-133)", () => {
    const sorted = [...layout.bands].sort((a, b) => a.y - b.y);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      expect(cur.y).toBeGreaterThanOrEqual(prev.y + prev.height); // no vertical overlap
    }
  });

  it("distributes bands ABOUT the centred time axis (+Y and −Y)", () => {
    const oy = layout.axis.y;
    const above = layout.nodes.some((n) => n.cy < oy);
    const below = layout.nodes.some((n) => n.cy > oy);
    expect(above && below).toBe(true);
  });

  it("ordinal mode (the rejected reading, behind the flag) still builds even columns", () => {
    const ord = computeTimelineLayout(NODES, EDGES, TODAY, "ordinal");
    const xs = [...new Set(ord.axis.ticks.map((t) => Math.round(t.x)))].sort(
      (a, b) => a - b,
    );
    const gaps = xs.slice(1).map((x, i) => x - xs[i]);
    const base = Math.min(...gaps);
    for (const g of gaps) expect(g % base).toBe(0); // equal-width columns
  });

  it("buckets an undated node by its earliest dated neighbor", () => {
    const nodeMap = new Map(NODES.map((n) => [n.id, n]));
    const bo = NODES.find((n) => n.id === "n-bo-jett")!;
    expect(bo.date).toBeNull();
    expect(effectiveDate(bo, EDGES, nodeMap)).not.toBeNull();
  });
});
