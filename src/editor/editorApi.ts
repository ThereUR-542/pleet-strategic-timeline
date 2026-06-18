// =============================================================================
// Editor → dev-server bridge (PLE-137). Talks to the dev-only Vite middleware
// (scripts/editor-plugin.ts) that re-validates and writes public/data/
// connections.yaml. Available ONLY under `npm run dev`; the prod static deploy
// has no such endpoint (and no editor route), by design.
// =============================================================================

import type { Edge } from "../data/types";
import type { LocatedError } from "../data/schema";

export interface SaveResult {
  ok: boolean;
  status: number;
  /** Located errors the server's loader-parity gate rejected the write with. */
  errors: LocatedError[];
  message?: string;
  count?: number;
}

/** POST the edited connections; the server validates + writes connections.yaml. */
export async function saveConnections(connections: Edge[]): Promise<SaveResult> {
  let res: Response;
  try {
    res = await fetch("/__editor/connections", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ connections }),
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
