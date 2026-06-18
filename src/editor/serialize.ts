// =============================================================================
// YAML serializers for the visual editor (PLE-137 connections + PLE-138 nodes/
// lanes).
// -----------------------------------------------------------------------------
// The editor writes the YAML files that ARE the single source of truth
// (PLE-141 retired content.ts + the gen-yaml generator). Header string +
// stringify opts produce a stable, human-readable diff with a clean round-trip
// through the PLE-136 loader, so successive editor saves churn only real edits.
// =============================================================================

import { stringify } from "yaml";
import type { Citation, DemandModel, Edge, IsoDate, Lane, TimelineNode } from "../data/types";

/** Prepended to every editor-written file; matches the committed public/data/*.yaml. */
export const YAML_HEADER =
  "# AUTHORITATIVE timeline data (PLE-141) — single source of truth.\n" +
  "# Edit via the visual editor (/editor, PLE-137/138) or by hand; validated by src/data/schema.ts, loaded by src/data/loader.ts.\n";

/** lineWidth:0 disables wrapping so long labels/bodies stay on one logical scalar. */
const STRINGIFY_OPTS = { lineWidth: 0 } as const;

/** Serialise an Edge[] to the exact connections.yaml on-disk format. */
export function serializeConnections(connections: Edge[]): string {
  return YAML_HEADER + stringify({ connections }, STRINGIFY_OPTS);
}

/** The non-node payload of nodes.yaml the editor preserves verbatim. */
export interface NodesMeta {
  anchorDate: IsoDate;
  demandModel: DemandModel;
  citations: Citation[];
}

/**
 * Rebuild a node in the canonical types.ts field order, dropping optional fields
 * (`isAntecedent`, `keyFacts`) when unset, so successive editor writes produce a
 * stable key order and diff cleanly.
 */
export function normalizeNode(n: TimelineNode): TimelineNode {
  const out: TimelineNode = {
    id: n.id,
    type: n.type,
    title: n.title,
    date: n.date,
    dateStart: n.dateStart,
    dateEnd: n.dateEnd,
    thread: n.thread,
    summary: n.summary,
    bodyMd: n.bodyMd,
    demandScore: n.demandScore,
    media: n.media,
    citationIds: n.citationIds,
    confidence: n.confidence,
  };
  if (n.isAntecedent) out.isAntecedent = true;
  if (n.keyFacts && n.keyFacts.length) out.keyFacts = n.keyFacts;
  return out;
}

/** Serialise the full nodes.yaml document (meta preserved + edited nodes). */
export function serializeNodes(meta: NodesMeta, nodes: TimelineNode[]): string {
  return (
    YAML_HEADER +
    stringify(
      {
        anchorDate: meta.anchorDate,
        demandModel: meta.demandModel,
        citations: meta.citations,
        nodes: nodes.map(normalizeNode),
      },
      STRINGIFY_OPTS,
    )
  );
}

/** Serialise the lane registry to the exact lanes.yaml on-disk format. */
export function serializeLanes(lanes: Lane[]): string {
  return YAML_HEADER + stringify({ lanes }, STRINGIFY_OPTS);
}
