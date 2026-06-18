// =============================================================================
// PLE-138: the node + lane editor's validation IS the loader's validation. These
// tests pin that parity — every error the editor surfaces is exactly what the
// PLE-136 loader (validateFile + assembleBundle) would throw — and the two key
// board ACs: (a) no editor action produces loader-invalid YAML (serialise →
// re-load is clean), and (b) UNSAFE DELETES are caught, not silently broken.
// =============================================================================

import { describe, it, expect } from "vitest";
import { parse as parseYaml } from "yaml";
import type { Edge, Lane, TimelineNode } from "../data/types";
import {
  assembleBundle,
  connectionsFileSchema,
  lanesFileSchema,
  nodesFileSchema,
  validateFile,
} from "../data/schema";
import { validateNodes, validateLanes } from "./validate";
import { serializeNodes, serializeLanes, type NodesMeta } from "./serialize";

// ── Loader-valid fixture ─────────────────────────────────────────────────────
const META: NodesMeta = {
  anchorDate: "2026-06-17",
  demandModel: { L: 100, k: 1, t0: 6, weights: { R: 0.2, V: 0.2, C: 0.2, S: 0.2, M: 0.2 }, cMachine: 10, verified: false },
  citations: [],
};
const NODE = (id: string, over: Partial<TimelineNode> = {}): TimelineNode => ({
  id, type: "event", title: id, date: "2026-01-01", dateStart: null, dateEnd: null,
  thread: "growth", summary: "", bodyMd: "", demandScore: null, media: [],
  citationIds: [], confidence: "confirmed", ...over,
});
const LANE = (id: Lane["id"], order = 0): Lane => ({ id, label: id, order, chapter: "growth", color: "var(--x)", zLayer: 0 });

const NODES = [NODE("n-a"), NODE("n-b")];
const LANES = [LANE("growth")];
const EDGES: Edge[] = [{ id: "e-1", from: "n-a", to: "n-b", kind: "depends_on", label: null }];

describe("validateNodes — loader parity", () => {
  it("accepts a valid node set", () => {
    expect(validateNodes(NODES, META, LANES, EDGES)).toEqual([]);
  });

  it("flags a duplicate node id", () => {
    const errs = validateNodes([NODE("n-a"), NODE("n-a")], META, LANES, EDGES);
    expect(errs).toContainEqual({ file: "nodes.yaml", field: "nodes[1].id", reason: 'duplicate node id "n-a"' });
  });

  it("flags a thread with no lane", () => {
    const errs = validateNodes([NODE("n-a", { thread: "oswego" }), NODE("n-b")], META, LANES, EDGES);
    expect(errs).toContainEqual({ file: "nodes.yaml", field: "nodes[0].thread", reason: 'thread "oswego" has no lane in lanes.yaml' });
  });

  it("flags an unknown citation ref", () => {
    const errs = validateNodes([NODE("n-a", { citationIds: ["c-missing"] }), NODE("n-b")], META, LANES, EDGES);
    expect(errs).toContainEqual({ file: "nodes.yaml", field: "nodes[0].citationIds[0]", reason: 'unknown citation id "c-missing"' });
  });

  it("UNSAFE DELETE: removing a node a connection points to → dangling endpoint", () => {
    // Drop n-b while e-1 (n-a → n-b) still references it.
    const errs = validateNodes([NODE("n-a")], META, LANES, EDGES);
    expect(errs).toContainEqual({ file: "connections.yaml", field: "connections[0].to", reason: 'dangling endpoint — no node "n-b"' });
  });
});

describe("validateLanes — loader parity", () => {
  it("accepts a valid lane set", () => {
    expect(validateLanes(LANES, META, NODES, EDGES)).toEqual([]);
  });

  it("flags a duplicate lane id", () => {
    const errs = validateLanes([LANE("growth", 0), LANE("growth", 1)], META, NODES, EDGES);
    expect(errs).toContainEqual({ file: "lanes.yaml", field: "lanes[1].id", reason: 'duplicate lane id "growth"' });
  });

  it("UNSAFE DELETE: removing a lane a node points to → orphaned node thread", () => {
    // Replace the only lane with a different thread; n-a/n-b still on `growth`.
    const errs = validateLanes([LANE("oswego")], META, NODES, EDGES);
    expect(errs).toContainEqual({ file: "nodes.yaml", field: "nodes[0].thread", reason: 'thread "growth" has no lane in lanes.yaml' });
  });
});

describe("serializeNodes / serializeLanes — round-trip through the loader", () => {
  it("nodes output re-parses + assembles with no errors", () => {
    const nodes = [NODE("n-a", { isAntecedent: true, keyFacts: ["x: 1"] }), NODE("n-b")];
    const yaml = serializeNodes(META, nodes);
    const nodesDoc = validateFile("nodes.yaml", nodesFileSchema, parseYaml(yaml));
    const lanesDoc = validateFile("lanes.yaml", lanesFileSchema, { lanes: LANES });
    const connectionsDoc = validateFile("connections.yaml", connectionsFileSchema, { connections: EDGES });
    const bundle = assembleBundle(nodesDoc, lanesDoc, connectionsDoc);
    expect(bundle.data.nodes[0].isAntecedent).toBe(true);
    expect(bundle.data.nodes[0].keyFacts).toEqual(["x: 1"]);
  });

  it("drops unset optionals (no `isAntecedent: null`, no empty `keyFacts`)", () => {
    const yaml = serializeNodes(META, [NODE("n-a")]);
    expect(yaml).not.toMatch(/isAntecedent/);
    expect(yaml).not.toMatch(/keyFacts/);
  });

  it("lanes output re-parses + assembles with no errors", () => {
    const yaml = serializeLanes(LANES);
    const lanesDoc = validateFile("lanes.yaml", lanesFileSchema, parseYaml(yaml));
    expect(lanesDoc.lanes).toEqual(LANES);
  });

  it("both prepend the authoritative-source header so diffs stay clean", () => {
    expect(serializeNodes(META, NODES)).toMatch(/^# AUTHORITATIVE timeline data \(PLE-141\)/);
    expect(serializeLanes(LANES)).toMatch(/^# AUTHORITATIVE timeline data \(PLE-141\)/);
  });
});
