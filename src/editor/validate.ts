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
import type { TimelineData, Lane } from "../data/types";

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
