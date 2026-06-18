// =============================================================================
// Editor → dev-server bridge (PLE-137). Talks to the dev-only Vite middleware
// (scripts/editor-plugin.ts) that re-validates and writes public/data/
// connections.yaml. Available ONLY under `npm run dev`; the prod static deploy
// has no such endpoint (and no editor route), by design.
// =============================================================================

import type { Edge, Lane, TimelineNode } from "../data/types";
import type { LocatedError } from "../data/schema";

export interface SaveResult {
  ok: boolean;
  status: number;
  /** Located errors the server's loader-parity gate rejected the write with. */
  errors: LocatedError[];
  message?: string;
  count?: number;
}

/** POST a JSON payload to a dev write endpoint; normalise the SaveResult shape. */
async function post(path: string, payload: unknown): Promise<SaveResult> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return {
      ok: false,
      status: 0,
      errors: [],
      message: `Could not reach the dev write endpoint (is \`npm run dev\` running?): ${
        (e as Error).message
      }`,
    };
  }
  const body = (await res.json().catch(() => ({}))) as Partial<SaveResult>;
  return {
    ok: res.ok,
    status: res.status,
    errors: body.errors ?? [],
    message: body.message,
    count: body.count,
  };
}

/** POST the edited connections; the server validates + writes connections.yaml. */
export function saveConnections(connections: Edge[]): Promise<SaveResult> {
  return post("/__editor/connections", { connections });
}

/**
 * POST the edited nodes; the server preserves on-disk meta (anchorDate/
 * demandModel/citations) + lanes/connections, re-runs the loader gate, and only
 * then writes nodes.yaml (PLE-138).
 */
export function saveNodes(nodes: TimelineNode[]): Promise<SaveResult> {
  return post("/__editor/nodes", { nodes });
}

/** POST the edited lane registry; the server validates + writes lanes.yaml (PLE-138). */
export function saveLanes(lanes: Lane[]): Promise<SaveResult> {
  return post("/__editor/lanes", { lanes });
}
