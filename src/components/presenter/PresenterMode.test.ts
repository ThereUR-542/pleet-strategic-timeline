// PLE-144: Present mode must advance slides STRICTLY in chronological order by
// node effective date (Lawrence's ask). This proves buildPresenterSteps yields a
// monotonically non-decreasing sequence of effective dates, undated nodes last,
// and that the slide *set* still covers every timeline node.

import { describe, it, expect } from "vitest";
import { NODES, EDGES } from "../../data/timeline-fixture";
import { buildPresenterSteps } from "./PresenterMode";
import { effectiveDate } from "../flow/layout";
import type { Edge, TimelineNode } from "../../data/types";

const nodeMap = new Map(NODES.map((n) => [n.id, n]));
const effDate = (id: string) => effectiveDate(nodeMap.get(id)!, EDGES, nodeMap);

describe("buildPresenterSteps — strict chronological order (PLE-144)", () => {
  const order = buildPresenterSteps(NODES, EDGES);

  it("includes every timeline node exactly once (set unchanged)", () => {
    expect(order).toHaveLength(NODES.length);
    expect(new Set(order).size).toBe(NODES.length);
    expect(new Set(order)).toEqual(new Set(NODES.map((n) => n.id)));
  });

  it("is monotonically non-decreasing by effective date, with undated nodes last", () => {
    const dates = order.map(effDate);
    // Find the boundary where dated nodes end and undated (null) begin.
    const firstNull = dates.indexOf(null);
    if (firstNull !== -1) {
      // Every entry from the first null onward must also be null (undated block last).
      expect(dates.slice(firstNull).every((d) => d === null)).toBe(true);
    }
    // The dated prefix must be non-decreasing (ISO strings compare lexicographically).
    const dated = (firstNull === -1 ? dates : dates.slice(0, firstNull)) as string[];
    for (let i = 1; i < dated.length; i++) {
      expect(dated[i] >= dated[i - 1]).toBe(true);
    }
  });

  it("breaks date ties by original array order (stable)", () => {
    // Construct a minimal case: three undated, same-date nodes keep input order.
    const mk = (id: string, date?: string): TimelineNode =>
      ({ id, title: id, type: "event", thread: "x", date } as unknown as TimelineNode);
    const nodes = [mk("a", "2026-03-01"), mk("b", "2026-01-01"), mk("c", "2026-01-01")];
    const edges: Edge[] = [];
    // b and c share 2026-01-01 → stable input order b before c; a (later) last.
    expect(buildPresenterSteps(nodes, edges)).toEqual(["b", "c", "a"]);
  });

  it("places fully-undated, unconnected nodes last in original order", () => {
    const mk = (id: string, date?: string): TimelineNode =>
      ({ id, title: id, type: "event", thread: "x", date } as unknown as TimelineNode);
    const nodes = [mk("u1"), mk("d", "2026-05-01"), mk("u2")];
    expect(buildPresenterSteps(nodes, [])).toEqual(["d", "u1", "u2"]);
  });
});
