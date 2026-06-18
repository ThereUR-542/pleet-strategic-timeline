// PLE-92: Flow-graph layout — proves Lawrence's hard constraint ("NOTHING
// stacked on top of something else") holds for the REAL content payload.

import { describe, it, expect } from "vitest";
import { NODES, EDGES } from "../../data/content";
import { computeFlowLayout, effectiveDate, NODE_W, NODE_H } from "./layout";
import { STAGES } from "./flowTheme";

describe("computeFlowLayout", () => {
  const layout = computeFlowLayout(NODES, EDGES);

  it("places every node exactly once", () => {
    expect(layout.nodes).toHaveLength(NODES.length);
    const ids = new Set(layout.nodes.map((n) => n.id));
    expect(ids.size).toBe(NODES.length);
  });

  it("produces one column per stage", () => {
    expect(layout.columns).toHaveLength(STAGES.length);
  });

  it("never overlaps two nodes (the hard constraint)", () => {
    for (let i = 0; i < layout.nodes.length; i++) {
      for (let j = i + 1; j < layout.nodes.length; j++) {
        const a = layout.nodes[i];
        const b = layout.nodes[j];
        const overlapX = Math.abs(a.x - b.x) < NODE_W;
        const overlapY = Math.abs(a.y - b.y) < NODE_H;
        expect(overlapX && overlapY).toBe(false);
      }
    }
  });

  it("flows left → right by chronological stage", () => {
    // Foundation node sits left of a projected node.
    const formed = layout.nodes.find((n) => n.id === "n-pleet-formed");
    const printing = layout.nodes.find((n) => n.id === "n-oswego-printing");
    expect(formed).toBeDefined();
    expect(printing).toBeDefined();
    expect(formed!.x).toBeLessThan(printing!.x);
  });

  it("buckets an undated node by its earliest dated neighbor", () => {
    const nodeMap = new Map(NODES.map((n) => [n.id, n]));
    // n-bo-jett is a dateless person introduced via dated events.
    const bo = NODES.find((n) => n.id === "n-bo-jett")!;
    expect(bo.date).toBeNull();
    expect(effectiveDate(bo, EDGES, nodeMap)).not.toBeNull();
  });
});
