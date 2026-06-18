// =============================================================================
// PLE-137: the editor's validation is the loader's validation. These tests pin
// that parity — every error the editor surfaces is exactly what the PLE-136
// loader (validateFile + assembleBundle) would throw — and that anything the
// editor serialises re-loads cleanly (AC: "no path produces loader-invalid YAML").
// =============================================================================

import { describe, it, expect } from "vitest";
import { parse as parseYaml } from "yaml";
import type { Edge, Lane, TimelineData } from "../data/types";
import {
  assembleBundle,
  connectionsFileSchema,
  lanesFileSchema,
  nodesFileSchema,
  validateFile,
} from "../data/schema";
import { validateConnections } from "./validate";
import { serializeConnections } from "./serialize";

// ── Minimal but loader-valid fixture ────────────────────────────────────────
const NODE = (id: string): TimelineData["nodes"][number] => ({
  id, type: "event", title: id, date: "2026-01-01", dateStart: null, dateEnd: null,
  thread: "growth", summary: "", bodyMd: "", demandScore: null, media: [],
  citationIds: [], confidence: "confirmed",
});

const DATA: Pick<TimelineData, "anchorDate" | "demandModel" | "citations" | "nodes"> = {
  anchorDate: "2026-06-17",
  demandModel: { L: 100, k: 1, t0: 6, weights: { R: 0.2, V: 0.2, C: 0.2, S: 0.2, M: 0.2 }, cMachine: 10, verified: false },
  citations: [],
  nodes: [NODE("n-a"), NODE("n-b"), NODE("n-c")],
};
const LANES: Lane[] = [
  { id: "growth", label: "Growth", order: 0, chapter: "growth", color: "var(--x)", zLayer: 0 },
];

const okEdge: Edge = { id: "e-1", from: "n-a", to: "n-b", kind: "depends_on", label: "x" };

describe("validateConnections — loader parity", () => {
  it("accepts a valid connection set (no errors)", () => {
    expect(validateConnections([okEdge], DATA, LANES)).toEqual([]);
  });

  it("flags a dangling `to` with the loader's exact located error", () => {
    const errs = validateConnections(
      [{ ...okEdge, to: "n-missing" }], DATA, LANES,
    );
    expect(errs).toContainEqual({
      file: "connections.yaml",
      field: "connections[0].to",
      reason: 'dangling endpoint — no node "n-missing"',
    });
  });

  it("flags a duplicate connection id", () => {
    const errs = validateConnections(
      [okEdge, { ...okEdge, from: "n-b", to: "n-c" }], DATA, LANES,
    );
    expect(errs).toContainEqual({
      file: "connections.yaml",
      field: "connections[1].id",
      reason: 'duplicate connection id "e-1"',
    });
  });

  it("flags an invalid kind via the shared zod schema", () => {
    const errs = validateConnections(
      [{ ...okEdge, kind: "befriends" as Edge["kind"] }], DATA, LANES,
    );
    expect(errs.some((e) => e.field === "connections[0].kind")).toBe(true);
  });
});

describe("serializeConnections — round-trips through the loader", () => {
  it("editor output re-parses + revalidates with no errors", () => {
    const edges: Edge[] = [okEdge, { id: "e-2", from: "n-b", to: "n-c", kind: "finances", label: null }];
    const yaml = serializeConnections(edges);

    // Parses, passes the file schema, and assembles — i.e. the loader accepts it.
    const parsed = parseYaml(yaml);
    const connectionsDoc = validateFile("connections.yaml", connectionsFileSchema, parsed);
    const nodesDoc = validateFile("nodes.yaml", nodesFileSchema, {
      anchorDate: DATA.anchorDate, demandModel: DATA.demandModel,
      citations: DATA.citations, nodes: DATA.nodes,
    });
    const lanesDoc = validateFile("lanes.yaml", lanesFileSchema, { lanes: LANES });
    const bundle = assembleBundle(nodesDoc, lanesDoc, connectionsDoc);
    expect(bundle.data.edges).toEqual(edges);
  });

  it("prepends the authoritative-source header so diffs stay clean", () => {
    expect(serializeConnections([okEdge])).toMatch(/^# AUTHORITATIVE timeline data \(PLE-141\)/);
  });
});
