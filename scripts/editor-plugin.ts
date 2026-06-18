// =============================================================================
// Dev-only write endpoints for the visual editor (PLE-137 connections +
// PLE-138 nodes/lanes).
// -----------------------------------------------------------------------------
// `apply: "serve"` → this plugin exists ONLY under `npm run dev`; it is never in
// a production build, so the deployed static site has no write surface.
//
// POST /__editor/connections  { connections: Edge[] }      → public/data/connections.yaml
// POST /__editor/nodes        { nodes: TimelineNode[] }    → public/data/nodes.yaml
// POST /__editor/lanes        { lanes: Lane[] }            → public/data/lanes.yaml
//
// Every endpoint re-runs the EXACT loader gate server-side (validateFile +
// assembleBundle from src/data/schema.ts) against the posted file PLUS the
// other two read fresh from disk — defence in depth, identical rules to the
// client. On pass it writes byte-compatibly with scripts/gen-yaml.ts; on any
// validation failure it writes NOTHING and returns 422 with located errors. The
// nodes endpoint preserves the on-disk meta (anchorDate/demandModel/citations)
// so the board only ever edits the `nodes` array, never the §6 model.
// =============================================================================

import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
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
import {
  serializeConnections,
  serializeLanes,
  serializeNodes,
} from "../src/editor/serialize";

const DATA_DIR = resolve(process.cwd(), "public/data");

function readDoc(name: string): unknown {
  return parseYaml(readFileSync(resolve(DATA_DIR, name), "utf8"));
}
function write(name: string, contents: string) {
  writeFileSync(resolve(DATA_DIR, name), contents, "utf8");
}

/** Validate a posted nodes/lanes/connections triple via the loader gate. */
function gate(nodesInput: unknown, lanesInput: unknown, connectionsInput: unknown) {
  const nodesDoc = validateFile("nodes.yaml", nodesFileSchema, nodesInput);
  const lanesDoc = validateFile("lanes.yaml", lanesFileSchema, lanesInput);
  const connectionsDoc = validateFile("connections.yaml", connectionsFileSchema, connectionsInput);
  assembleBundle(nodesDoc, lanesDoc, connectionsDoc);
  return { nodesDoc, lanesDoc, connectionsDoc };
}

/** Read a JSON POST body, run `handle`, and uniformly map success/errors. */
function jsonWrite(
  req: IncomingMessage,
  res: ServerResponse,
  handle: (body: any) => number,
) {
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
      send(200, { ok: true, count: handle(JSON.parse(raw || "{}")) });
    } catch (e) {
      if (e instanceof TimelineDataError) {
        return send(422, { ok: false, message: e.message, errors: e.errors });
      }
      send(400, { ok: false, message: (e as Error).message, errors: [] });
    }
  });
}

export function connectionEditorPlugin(): Plugin {
  return {
    name: "ple-visual-editor",
    apply: "serve",
    configureServer(server) {
      // ── Connections (PLE-137): disk nodes/lanes + posted edges ──────────────
      server.middlewares.use("/__editor/connections", (req, res) =>
        jsonWrite(req, res, (body) => {
          const { connectionsDoc } = gate(
            readDoc("nodes.yaml"),
            readDoc("lanes.yaml"),
            { connections: body.connections },
          );
          write("connections.yaml", serializeConnections(connectionsDoc.connections));
          return connectionsDoc.connections.length;
        }),
      );

      // ── Nodes (PLE-138): posted nodes + preserved disk meta, vs disk lanes/conns
      server.middlewares.use("/__editor/nodes", (req, res) =>
        jsonWrite(req, res, (body) => {
          const onDisk = readDoc("nodes.yaml") as {
            anchorDate: unknown;
            demandModel: unknown;
            citations: unknown;
          };
          const { nodesDoc } = gate(
            { ...onDisk, nodes: body.nodes },
            readDoc("lanes.yaml"),
            readDoc("connections.yaml"),
          );
          write(
            "nodes.yaml",
            serializeNodes(
              { anchorDate: nodesDoc.anchorDate, demandModel: nodesDoc.demandModel, citations: nodesDoc.citations },
              nodesDoc.nodes,
            ),
          );
          return nodesDoc.nodes.length;
        }),
      );

      // ── Lanes (PLE-138): posted lanes vs disk nodes/connections ─────────────
      server.middlewares.use("/__editor/lanes", (req, res) =>
        jsonWrite(req, res, (body) => {
          const { lanesDoc } = gate(
            readDoc("nodes.yaml"),
            { lanes: body.lanes },
            readDoc("connections.yaml"),
          );
          write("lanes.yaml", serializeLanes(lanesDoc.lanes));
          return lanesDoc.lanes.length;
        }),
      );
    },
  };
}
