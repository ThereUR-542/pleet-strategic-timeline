// PLE-92: Flow-graph layout — proves the dagre layout places every node, keeps
// Lawrence's hard constraint ("NOTHING stacked on top of something else"), and
// flows left→right in time.

import { describe, it, expect } from "vitest";
import { NODES, EDGES } from "../../data/content";
import { computeFlowLayout, effectiveDate, NODE_W, NODE_H } from "./layout";

const TODAY = "2026-06-17";

describe("computeFlowLayout (dagre)", () => {
  const layout = computeFlowLayout(NODES, EDGES, TODAY);

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
          Math.abs(a.x - b.x) < NODE_W && Math.abs(a.y - b.y) < NODE_H;
        expect(overlap).toBe(false);
      }
    }
  });

  it("flows left → right in time (early origin, later downstream)", () => {
    const formed = layout.nodes.find((n) => n.id === "n-pleet-formed")!;
    const printing = layout.nodes.find((n) => n.id === "n-oswego-printing")!;
    expect(formed.x).toBeLessThan(printing.x);
  });

  it("buckets an undated node by its earliest dated neighbor", () => {
    const nodeMap = new Map(NODES.map((n) => [n.id, n]));
    const bo = NODES.find((n) => n.id === "n-bo-jett")!;
    expect(bo.date).toBeNull();
    expect(effectiveDate(bo, EDGES, nodeMap)).not.toBeNull();
  });

  it("reports a positive canvas extent", () => {
    expect(layout.width).toBeGreaterThan(NODE_W);
    expect(layout.height).toBeGreaterThan(NODE_H);
    expect(layout.maxBucket).toBeGreaterThan(layout.minBucket);
  });
});
