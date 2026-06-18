// =============================================================================
// YAML-as-source-of-truth acceptance tests (PLE-136 loader; PLE-141 single
// source). The three editor-managed public/data/*.yaml files ARE the canonical
// content now (content.ts retired in PLE-141), so these tests assert that the
// committed files load, validate, assemble, and are internally consistent —
// not that they round-trip against any TS literal. Plus graceful located
// failure (PLE-136 board requirement).
// =============================================================================

import { describe, it, expect } from "vitest";
import { parse as parseYaml } from "yaml";
// Inline the committed YAML as strings (?raw) — jsdom has no fs, and this also
// proves the committed files parse. Mirrors what the runtime loader fetches.
import nodesYaml from "../../public/data/nodes.yaml?raw";
import lanesYaml from "../../public/data/lanes.yaml?raw";
import connectionsYaml from "../../public/data/connections.yaml?raw";
import {
  TimelineDataError,
  assembleBundle,
  connectionsFileSchema,
  lanesFileSchema,
  nodesFileSchema,
  validateFile,
} from "./schema";

const RAW: Record<string, string> = {
  "nodes.yaml": nodesYaml,
  "lanes.yaml": lanesYaml,
  "connections.yaml": connectionsYaml,
};
const read = (f: string) => parseYaml(RAW[f]);

const nodesDoc = validateFile("nodes.yaml", nodesFileSchema, read("nodes.yaml"));
const lanesDoc = validateFile("lanes.yaml", lanesFileSchema, read("lanes.yaml"));
const connectionsDoc = validateFile("connections.yaml", connectionsFileSchema, read("connections.yaml"));
const bundle = assembleBundle(nodesDoc, lanesDoc, connectionsDoc);

describe("YAML data files (PLE-136 loader / PLE-141 single source)", () => {
  it("assembles a non-empty, schema-valid bundle from the committed YAML", () => {
    expect(bundle.data.nodes.length).toBeGreaterThan(0);
    expect(bundle.data.edges.length).toBeGreaterThan(0);
    expect(bundle.data.citations.length).toBeGreaterThan(0);
    expect(bundle.lanes.length).toBeGreaterThan(0);
    expect(bundle.data.anchorDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(bundle.data.demandModel).toBeTruthy();
  });

  it("has a lane for every thread used by a node", () => {
    const laneIds = new Set(bundle.lanes.map((l) => l.id));
    for (const n of bundle.data.nodes) {
      if (n.thread) expect(laneIds.has(n.thread)).toBe(true);
    }
  });

  it("lane order is contiguous 0..n-1", () => {
    const orders = [...bundle.lanes].map((l) => l.order).sort((a, b) => a - b);
    expect(orders).toEqual(bundle.lanes.map((_, i) => i));
  });
});

describe("graceful located failure (PLE-136 board requirement)", () => {
  it("reports file + field + reason on a schema violation", () => {
    const bad = { anchorDate: "nope", demandModel: bundle.data.demandModel, citations: [], nodes: [] };
    try {
      validateFile("nodes.yaml", nodesFileSchema, bad);
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TimelineDataError);
      const err = e as TimelineDataError;
      const fields = err.errors.map((x) => x.field);
      expect(err.errors.every((x) => x.file === "nodes.yaml")).toBe(true);
      expect(fields).toContain("anchorDate"); // bad ISO date
      expect(fields).toContain("nodes");       // empty array (min 1)
      expect(err.errors[0].reason).toBeTruthy();
    }
  });

  it("rejects unknown fields (strict) so editor typos surface", () => {
    const docs = read("lanes.yaml") as { lanes: Record<string, unknown>[] };
    docs.lanes[0].typo = true;
    expect(() => validateFile("lanes.yaml", lanesFileSchema, docs)).toThrow(TimelineDataError);
  });

  it("catches dangling connection endpoints across files", () => {
    const conns = { connections: [{ id: "e-x", from: "n-ghost", to: "n-nowhere", kind: "depends_on", label: null }] };
    const cDoc = validateFile("connections.yaml", connectionsFileSchema, conns);
    try {
      assembleBundle(nodesFileSchema.parse(read("nodes.yaml")), lanesFileSchema.parse(read("lanes.yaml")), cDoc);
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(TimelineDataError);
      const reasons = (e as TimelineDataError).errors.map((x) => x.reason).join(" ");
      expect(reasons).toMatch(/dangling endpoint/);
    }
  });
});
