// =============================================================================
// Test-only fixture: the timeline data shapes, derived FROM the YAML files.
// -----------------------------------------------------------------------------
// PLE-141 retired src/data/content.ts as the canonical source. The three
// editor-managed YAML files in public/data/ are now the SINGLE source of truth
// (authored via /editor — PLE-137/138 — or by hand, loaded at runtime by
// loader.ts). Tests that used to import `TIMELINE_DATA` / `NODES` / `EDGES` /
// `CITATIONS` / `DEMAND_MODEL` / `LANES` from content.ts/lanes.ts import them
// from here instead, so a board edit via the editor flows straight into the
// test suite with no stale-content resurrection path.
//
// This module is NOT part of the runtime bundle (nothing under src/ outside
// *.test.* imports it; the app loads YAML via loader.ts). It mirrors the loader
// exactly — same ?raw parse + validateFile + assembleBundle gate — so the
// fixture can never disagree with what the app actually loads.
// =============================================================================

import { parse as parseYaml } from "yaml";
// ?raw: jsdom has no fs, and inlining the bytes also proves the committed files
// parse + validate at test load. Mirrors loader.ts's fetch-then-parse.
import nodesYaml from "../../public/data/nodes.yaml?raw";
import lanesYaml from "../../public/data/lanes.yaml?raw";
import connectionsYaml from "../../public/data/connections.yaml?raw";
import type { Citation, DemandModel, Edge, Lane, TimelineData, TimelineNode } from "./types";
import {
  assembleBundle,
  connectionsFileSchema,
  lanesFileSchema,
  nodesFileSchema,
  validateFile,
} from "./schema";

const nodesDoc = validateFile("nodes.yaml", nodesFileSchema, parseYaml(nodesYaml));
const lanesDoc = validateFile("lanes.yaml", lanesFileSchema, parseYaml(lanesYaml));
const connectionsDoc = validateFile("connections.yaml", connectionsFileSchema, parseYaml(connectionsYaml));

/** The assembled bundle exactly as the runtime loader produces it. */
export const BUNDLE = assembleBundle(nodesDoc, lanesDoc, connectionsDoc);

export const TIMELINE_DATA: TimelineData = BUNDLE.data;
export const LANES: Lane[] = BUNDLE.lanes;
export const NODES: TimelineNode[] = BUNDLE.data.nodes;
export const EDGES: Edge[] = BUNDLE.data.edges;
export const CITATIONS: Citation[] = BUNDLE.data.citations;
export const DEMAND_MODEL: DemandModel = BUNDLE.data.demandModel;
export const ANCHOR_DATE = BUNDLE.data.anchorDate;

export default TIMELINE_DATA;
