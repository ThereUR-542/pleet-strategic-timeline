// =============================================================================
// Editor-side validation (PLE-137) — PARITY WITH THE LOADER BY CONSTRUCTION.
// -----------------------------------------------------------------------------
// The editor must never be able to produce YAML the PLE-136 graceful-fail loader
// would reject. We guarantee that not by re-implementing the rules, but by
// calling the EXACT SAME functions the loader calls: `validateFile` against the
// shared zod schemas + `assembleBundle` for cross-file referential checks
// (dangling from/to, duplicate ids). Same code path → same located errors,
// surfaced inline before a save is ever allowed. Server-side, the dev middleware
// (scripts/editor-plugin.ts) runs this identical gate again before writing disk.
// =============================================================================

import {
  TimelineDataError,
  assembleBundle,
  connectionsFileSchema,
  lanesFileSchema,
  nodesFileSchema,
  validateFile,
  type LocatedError,
} from "../data/schema";
import type { TimelineData, Lane, TimelineNode, Edge } from "../data/types";

/** The nodes.yaml meta the editor preserves but still must validate. */
type NodesMeta = Pick<TimelineData, "anchorDate" | "demandModel" | "citations">;

/**
 * Validate a candidate connections set against an already-loaded bundle, using
 * the loader's own validators. Returns the located errors the loader WOULD throw
 * (empty array = the edit is safe to persist). `nodes`/`lanes` come from a
 * successfully loaded bundle, so any error returned here is caused by the edited
 * connections (bad enum/shape, dangling endpoint, duplicate id).
 */
export function validateConnections(
  connections: unknown,
  data: Pick<TimelineData, "anchorDate" | "demandModel" | "citations" | "nodes">,
  lanes: Lane[],
): LocatedError[] {
  try {
    const nodesDoc = validateFile("nodes.yaml", nodesFileSchema, {
      anchorDate: data.anchorDate,
      demandModel: data.demandModel,
      citations: data.citations,
      nodes: data.nodes,
    });
    const lanesDoc = validateFile("lanes.yaml", lanesFileSchema, { lanes });
    const connectionsDoc = validateFile("connections.yaml", connectionsFileSchema, {
      connections,
    });
    assembleBundle(nodesDoc, lanesDoc, connectionsDoc);
    return [];
  } catch (e) {
    if (e instanceof TimelineDataError) return e.errors;
    throw e;
  }
}

/** Run the full loader gate over a candidate triple; return its located errors. */
function gate(
  meta: NodesMeta,
  nodes: unknown,
  lanes: unknown,
  connections: unknown,
): LocatedError[] {
  try {
    const nodesDoc = validateFile("nodes.yaml", nodesFileSchema, {
      anchorDate: meta.anchorDate,
      demandModel: meta.demandModel,
      citations: meta.citations,
      nodes,
    });
    const lanesDoc = validateFile("lanes.yaml", lanesFileSchema, { lanes });
    const connectionsDoc = validateFile("connections.yaml", connectionsFileSchema, { connections });
    assembleBundle(nodesDoc, lanesDoc, connectionsDoc);
    return [];
  } catch (e) {
    if (e instanceof TimelineDataError) return e.errors;
    throw e;
  }
}

/**
 * Validate an edited node set (PLE-138) against the loaded sibling lanes +
 * connections, using the loader's own gate. Catches bad shape/enums, duplicate
 * ids, unknown citation refs, threads with no lane — and, crucially, an UNSAFE
 * DELETE: removing a node still referenced by a connection surfaces as a
 * dangling-endpoint error in connections.yaml (board AC). Empty array = safe.
 */
export function validateNodes(
  nodes: unknown,
  meta: NodesMeta,
  lanes: Lane[],
  connections: Edge[],
): LocatedError[] {
  return gate(meta, nodes, lanes, connections);
}

/**
 * Validate an edited lane registry (PLE-138) against the loaded sibling nodes +
 * connections. Catches bad shape (non-thread id, dup), and the UNSAFE DELETE
 * case: removing a lane a node still points to surfaces as `nodes[i].thread has
 * no lane` (board AC). Empty array = safe to persist.
 */
export function validateLanes(
  lanes: unknown,
  meta: NodesMeta,
  nodes: TimelineNode[],
  connections: Edge[],
): LocatedError[] {
  return gate(meta, nodes, lanes, connections);
}
