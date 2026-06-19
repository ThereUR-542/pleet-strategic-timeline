// PLE-155 — single-anchor person-relationship edge synthesis.
import { describe, it, expect } from "vitest";
import { buildPersonRelationshipEdges, isPersonEdge } from "./personGraph";
import { NODES, EDGES as LIVE_EDGES } from "../../data/timeline-fixture";
import type { Edge, TimelineNode } from "../../data/types";

const baseNode = (over: Partial<TimelineNode> & Pick<TimelineNode, "id">): TimelineNode => ({
  type: "event",
  title: over.id,
  date: null,
  dateStart: null,
  dateEnd: null,
  thread: null,
  summary: "",
  bodyMd: "",
  demandScore: null,
  media: [],
  citationIds: [],
  confidence: "confirmed",
  ...over,
});

describe("buildPersonRelationshipEdges (PLE-155 single-anchor)", () => {
  it("synthesizes one edge per connected node, radiating from the person anchor", () => {
    const nodes: TimelineNode[] = [
      baseNode({ id: "n-evt-a" }),
      baseNode({ id: "n-evt-b" }),
      baseNode({
        id: "n-p",
        type: "person",
        person: {
          name: "P",
          role: "R",
          initialAppearanceDate: "2026-01-01",
          threads: [],
          modalGraphic: null,
          note: null,
          relationships: [
            { date: "2026-01-01", scheduled: false, description: "x", connectedNodeIds: ["n-evt-a"], connectedNodeTitles: ["A"] },
            { date: "2026-02-01", scheduled: false, description: "y", connectedNodeIds: ["n-evt-b"], connectedNodeTitles: ["B"] },
          ],
        },
      }),
    ];
    const edges = buildPersonRelationshipEdges(nodes, []);
    expect(edges).toHaveLength(2);
    expect(edges.every((e) => e.from === "n-p")).toBe(true);
    expect(new Set(edges.map((e) => e.to))).toEqual(new Set(["n-evt-a", "n-evt-b"]));
  });

  it("dedups against an existing structural edge and against the reciprocal person", () => {
    const mkPerson = (id: string, otherId: string): TimelineNode =>
      baseNode({
        id,
        type: "person",
        person: {
          name: id, role: "", initialAppearanceDate: null, threads: [], modalGraphic: null, note: null,
          relationships: [{ date: null, scheduled: false, description: "", connectedNodeIds: [otherId], connectedNodeTitles: [otherId] }],
        },
      });
    const nodes = [mkPerson("n-a", "n-b"), mkPerson("n-b", "n-a")];
    // both profiles reference each other → exactly one synthesized edge.
    expect(buildPersonRelationshipEdges(nodes, [])).toHaveLength(1);
    // already present structurally → zero synthesized.
    const existing: Edge[] = [{ id: "e", from: "n-a", to: "n-b", kind: "partners", label: null }];
    expect(buildPersonRelationshipEdges(nodes, existing)).toHaveLength(0);
  });

  it("flags any edge incident to a person as curvilinear", () => {
    const byId = new Map<string, TimelineNode>([
      ["n-p", baseNode({ id: "n-p", type: "person" })],
      ["n-e", baseNode({ id: "n-e" })],
    ]);
    expect(isPersonEdge({ id: "1", from: "n-p", to: "n-e", kind: "other", label: null }, byId)).toBe(true);
    expect(isPersonEdge({ id: "2", from: "n-e", to: "n-e", kind: "other", label: null }, byId)).toBe(false);
  });

  it("every synthesized edge resolves to a real node id and starts at a person (live data)", () => {
    const ids = new Set(NODES.map((n) => n.id));
    const personIds = new Set(NODES.filter((n) => n.type === "person").map((n) => n.id));
    const synth = buildPersonRelationshipEdges(NODES, LIVE_EDGES);
    expect(synth.length).toBeGreaterThan(0);
    for (const e of synth) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
      expect(personIds.has(e.from)).toBe(true);
    }
  });
});
