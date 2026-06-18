// =============================================================================
// Dev-only write endpoint for the PLE-137 connection editor.
// -----------------------------------------------------------------------------
// `apply: "serve"` → this plugin exists ONLY under `npm run dev`; it is never in
// a production build, so the deployed static site has no write surface.
//
// POST /__editor/connections  { connections: Edge[] }
//   • Re-runs the EXACT loader gate server-side (validateFile + assembleBundle
//     from src/data/schema.ts) against the connections plus the on-disk
//     nodes.yaml / lanes.yaml — defence in depth, identical rules to the client.
//   • On pass: writes public/data/connections.yaml byte-compatibly with
//     scripts/gen-yaml.ts (serializeConnections). → 200 { ok, count }.
//   • On fail: writes NOTHING. → 422 { ok:false, message, errors:LocatedError[] }.
// =============================================================================

import type { Plugin } from "vite";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  TimelineDataError,
  assembleBundle,
  connectionsFileSchema,
  lanesFileSchema,
  nodesFileSchema,
  validateFile,
} from "../src/data/schema";
import { serializeConnections } from "../src/editor/serialize";

const DATA_DIR = resolve(process.cwd(), "public/data");

function readDoc(name: string): unknown {
  return parseYaml(readFileSync(resolve(DATA_DIR, name), "utf8"));
}

export function connectionEditorPlugin(): Plugin {
  return {
    name: "ple-connection-editor",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__editor/connections", (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(body));
        };
        if (req.method !== "POST") return send(405, { ok: false, message: "POST only" });

        let raw = "";
        req.on("data", (c) => (raw += c));
        req.on("end", () => {
          try {
            const body = JSON.parse(raw || "{}");
            // Same gate the runtime loader runs — disk nodes/lanes + posted edges.
            const nodesDoc = validateFile("nodes.yaml", nodesFileSchema, readDoc("nodes.yaml"));
            const lanesDoc = validateFile("lanes.yaml", lanesFileSchema, readDoc("lanes.yaml"));
            const connectionsDoc = validateFile("connections.yaml", connectionsFileSchema, {
              connections: body.connections,
            });
            assembleBundle(nodesDoc, lanesDoc, connectionsDoc);

            writeFileSync(
              resolve(DATA_DIR, "connections.yaml"),
              serializeConnections(connectionsDoc.connections),
              "utf8",
            );
            send(200, { ok: true, count: connectionsDoc.connections.length });
          } catch (e) {
            if (e instanceof TimelineDataError) {
              return send(422, { ok: false, message: e.message, errors: e.errors });
            }
            send(400, { ok: false, message: (e as Error).message, errors: [] });
          }
        });
      });
    },
  };
}
