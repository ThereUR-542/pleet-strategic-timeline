// =============================================================================
// YAML content schema + graceful, LOCATED validation (PLE-136 scope 3).
// -----------------------------------------------------------------------------
// Mirrors the contracts in `types.ts`. Every YAML file is parsed and validated
// here; on ANY misconfiguration we throw a `TimelineDataError` carrying the
// offending FILE, FIELD PATH, and a human REASON — the UI renders that instead
// of a blank/white screen (explicit board requirement). zod is the validator;
// `safeParse` keeps us off exceptions so we can format issues ourselves.
// =============================================================================

import { z } from "zod";
import type { Lane, TimelineData } from "./types";

/** Which YAML document a problem came from. */
export type DataFile = "nodes.yaml" | "lanes.yaml" | "connections.yaml";

/** A single located validation problem: file + field path + why. */
export interface LocatedError {
  file: DataFile;
  /** Dotted field path inside the file, e.g. `nodes[3].date`. */
  field: string;
  reason: string;
}

/**
 * The one error type the loader throws. `errors` is never empty. `summary` is a
 * one-line headline; the UI lists every entry so a content editor sees exactly
 * what to fix and where.
 */
export class TimelineDataError extends Error {
  readonly errors: LocatedError[];
  constructor(summary: string, errors: LocatedError[]) {
    super(summary);
    this.name = "TimelineDataError";
    this.errors = errors;
  }
}

// ── ISO date `YYYY-MM-DD` (the build's canonical form) ───────────────────────
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date YYYY-MM-DD");

// ── Threads / enums (must match types.ts unions exactly) ─────────────────────
const THREADS = [
  "foundational", "growth", "savanna", "oswego", "major_projects",
  "media_brand", "strategic_relationships", "manufacturing", "financial_interest",
] as const;
const thread = z.enum(THREADS);
const nodeType = z.enum(["person", "project", "event", "concept"]);
const edgeKind = z.enum([
  "introduced", "owns", "partners", "converges_on",
  "demonstrates", "depends_on", "finances", "other",
]);
const confidence = z.enum(["confirmed", "unconfirmed"]);
const mediaKind = z.enum(["pdf", "image", "map", "video", "link"]);

// ── Media / citations ────────────────────────────────────────────────────────
const mediaItem = z.object({
  id: z.string().min(1),
  kind: mediaKind,
  src: z.string().min(1),
  caption: z.string().nullable(),
  citationIds: z.array(z.string()),
  opensExternal: z.boolean(),
}).strict();

const mlaContainer = z.object({
  title: z.string().nullable(),
  otherContributors: z.string().nullable(),
  version: z.string().nullable(),
  number: z.string().nullable(),
  publisher: z.string().nullable(),
  pubDate: z.string().nullable(),
  location: z.string().nullable(),
}).strict();

const citation = z.object({
  id: z.string().min(1),
  author: z.string().nullable(),
  titleSource: z.string().nullable(),
  container1: mlaContainer.nullable(),
  container2: mlaContainer.nullable(),
  // MLA-9 human date (e.g. "18 June 2026"), printed verbatim by mla.ts — NOT
  // ISO. (The `IsoDate` annotation on Citation.accessDate in types.ts is loose;
  // the live content is MLA format, so the schema accepts a plain string.)
  accessDate: z.string().nullable(),
  isDoi: z.boolean(),
  intextKey: z.string().min(1),
}).strict();

// ── Person profile (PLE-152/PLE-154) ─────────────────────────────────────────
// A `person` node carries an OPTIONAL enriched profile: the Master Person–
// Relationship Index v1.0 data. Single-anchor model — the person appears once,
// moored to `initialAppearanceDate` (first interaction w/ Lawrence Gene / Pleet
// LLC); every later touchpoint is a dated `relationships[]` entry that the
// render child (PLE-155) draws as a curvilinear edge radiating from the anchor.
// Field names are camelCase to match the codebase's direct YAML→TS passthrough
// (cf. dateStart, citationIds, opensExternal); the PRD §7 table maps them to the
// index's snake_case spelling. `person` is optional + ORTHOGONAL to existing
// node fields, so non-index persons (Lawrence Gene, Mayor Nichols) and all other
// node types are unaffected.
const personRelationship = z.object({
  // ISO date of the interaction; null when undated/unspecified in the record
  // (e.g. Amy K. Cook's meeting dates are flagged-for-confirmation, not deleted).
  date: isoDate.nullable(),
  // true for future/scheduled interactions (e.g. the 23 June Mayor meeting).
  scheduled: z.boolean(),
  description: z.string().min(1),
  // Resolved to REAL existing node ids only (validated in assembleBundle).
  connectedNodeIds: z.array(z.string()),
  // Human labels — carry items that have no node of their own too.
  connectedNodeTitles: z.array(z.string()),
}).strict();

const personProfile = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  // Anchor date on the timeline; null when first-interaction date is not in the
  // record (render child anchors by this, never by a duplicate later node).
  initialAppearanceDate: isoDate.nullable(),
  // All threads this person participates in (superset of the lane `thread`).
  threads: z.array(thread),
  // Reference (asset path or key) to the modal relationship graphic; null until
  // the render/modal child (PLE-155) generates it.
  modalGraphic: z.string().nullable(),
  // Carried verification flags / identity notes (e.g. Amy distinct-identity,
  // Cherokee $40M, Amy K. Cook meeting-date flag). Do NOT resolve here.
  note: z.string().nullable(),
  relationships: z.array(personRelationship),
}).strict();

// ── Nodes ────────────────────────────────────────────────────────────────────
const timelineNode = z.object({
  id: z.string().min(1),
  type: nodeType,
  title: z.string().min(1),
  date: isoDate.nullable(),
  dateStart: isoDate.nullable(),
  dateEnd: isoDate.nullable(),
  thread: thread.nullable(),
  summary: z.string(),
  bodyMd: z.string(),
  demandScore: z.number().min(0).max(100).nullable(),
  media: z.array(mediaItem),
  citationIds: z.array(z.string()),
  confidence,
  isAntecedent: z.boolean().optional(),
  keyFacts: z.array(z.string()).optional(),
  // Enriched person profile (PLE-152/PLE-154); only valid on `type: person`
  // nodes — enforced referentially in assembleBundle.
  person: personProfile.optional(),
}).strict();

// ── Demand model (§6) ─────────────────────────────────────────────────────────
const demandModel = z.object({
  L: z.number(),
  k: z.number(),
  t0: z.number(),
  weights: z.object({
    R: z.number(), V: z.number(), C: z.number(), S: z.number(), M: z.number(),
  }).strict(),
  cMachine: z.number(),
  verified: z.boolean(),
}).strict();

// ── Edges / connections ───────────────────────────────────────────────────────
const edge = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  kind: edgeKind,
  label: z.string().nullable(),
}).strict();

// ── Lanes (PLE-133 registry) ──────────────────────────────────────────────────
const lane = z.object({
  id: thread,
  label: z.string().min(1),
  order: z.number().int(),
  chapter: z.string().min(1),
  color: z.string().min(1),
  zLayer: z.number().int().min(0),
}).strict();

// ── File-level document schemas ───────────────────────────────────────────────
export const nodesFileSchema = z.object({
  anchorDate: isoDate,
  demandModel,
  citations: z.array(citation),
  nodes: z.array(timelineNode).min(1),
}).strict();

export const lanesFileSchema = z.object({
  lanes: z.array(lane).min(1),
}).strict();

export const connectionsFileSchema = z.object({
  connections: z.array(edge),
}).strict();

// ── Located-validation driver ─────────────────────────────────────────────────
function zodToLocated(file: DataFile, err: z.ZodError): LocatedError[] {
  return err.issues.map((issue) => {
    const path = issue.path
      .map((p) => (typeof p === "number" ? `[${p}]` : `.${String(p)}`))
      .join("")
      .replace(/^\./, "");
    return { file, field: path || "(root)", reason: issue.message };
  });
}

/**
 * Validate one already-parsed YAML document against its schema. Throws
 * `TimelineDataError` with located entries on failure; returns typed data on
 * success. `parsed` is `unknown` because it came from arbitrary YAML.
 */
export function validateFile<S extends z.ZodType>(
  file: DataFile,
  schema: S,
  parsed: unknown,
): z.infer<S> {
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const errors = zodToLocated(file, result.error);
    throw new TimelineDataError(
      `${file}: ${errors.length} validation error${errors.length === 1 ? "" : "s"} — ${errors[0].field}: ${errors[0].reason}`,
      errors,
    );
  }
  return result.data;
}

/**
 * Cross-file referential checks that no single-file schema can see (dangling
 * edge endpoints, unknown thread on a node, duplicate ids, citation refs).
 * These are the misconfigurations a future visual connection editor is most
 * likely to introduce. Throws `TimelineDataError` listing every problem.
 */
export function assembleBundle(
  nodesDoc: z.infer<typeof nodesFileSchema>,
  lanesDoc: z.infer<typeof lanesFileSchema>,
  connectionsDoc: z.infer<typeof connectionsFileSchema>,
): { data: TimelineData; lanes: Lane[] } {
  const errors: LocatedError[] = [];

  const nodeIds = new Set<string>();
  nodesDoc.nodes.forEach((n, i) => {
    if (nodeIds.has(n.id)) errors.push({ file: "nodes.yaml", field: `nodes[${i}].id`, reason: `duplicate node id "${n.id}"` });
    nodeIds.add(n.id);
  });

  const citationIds = new Set(nodesDoc.citations.map((c) => c.id));
  nodesDoc.nodes.forEach((n, i) => {
    n.citationIds.forEach((cid, j) => {
      if (!citationIds.has(cid)) errors.push({ file: "nodes.yaml", field: `nodes[${i}].citationIds[${j}]`, reason: `unknown citation id "${cid}"` });
    });
  });

  // Person profiles (PLE-154): the profile is only meaningful on a person node,
  // and every relationship's connectedNodeIds must resolve to a real node — same
  // dangling-reference guard we apply to edges/citations, so a bad index entry
  // is caught at load with a located error rather than a silent broken edge.
  nodesDoc.nodes.forEach((n, i) => {
    if (!n.person) return;
    if (n.type !== "person") {
      errors.push({ file: "nodes.yaml", field: `nodes[${i}].person`, reason: `person profile on non-person node "${n.id}" (type "${n.type}")` });
    }
    n.person.relationships.forEach((rel, r) => {
      rel.connectedNodeIds.forEach((cid, c) => {
        if (!nodeIds.has(cid)) errors.push({ file: "nodes.yaml", field: `nodes[${i}].person.relationships[${r}].connectedNodeIds[${c}]`, reason: `unknown node id "${cid}"` });
      });
    });
  });

  // Lane ids must be unique now that the registry is board-editable (PLE-138);
  // a `Set` alone would silently swallow a duplicate.
  const laneIds = new Set<string>();
  lanesDoc.lanes.forEach((l, i) => {
    if (laneIds.has(l.id)) errors.push({ file: "lanes.yaml", field: `lanes[${i}].id`, reason: `duplicate lane id "${l.id}"` });
    laneIds.add(l.id);
  });
  nodesDoc.nodes.forEach((n, i) => {
    if (n.thread && !laneIds.has(n.thread)) {
      errors.push({ file: "nodes.yaml", field: `nodes[${i}].thread`, reason: `thread "${n.thread}" has no lane in lanes.yaml` });
    }
  });

  const edgeIds = new Set<string>();
  connectionsDoc.connections.forEach((e, i) => {
    if (edgeIds.has(e.id)) errors.push({ file: "connections.yaml", field: `connections[${i}].id`, reason: `duplicate connection id "${e.id}"` });
    edgeIds.add(e.id);
    if (!nodeIds.has(e.from)) errors.push({ file: "connections.yaml", field: `connections[${i}].from`, reason: `dangling endpoint — no node "${e.from}"` });
    if (!nodeIds.has(e.to)) errors.push({ file: "connections.yaml", field: `connections[${i}].to`, reason: `dangling endpoint — no node "${e.to}"` });
  });

  if (errors.length) {
    throw new TimelineDataError(
      `Referential errors: ${errors.length} — ${errors[0].field}: ${errors[0].reason}`,
      errors,
    );
  }

  return {
    data: {
      nodes: nodesDoc.nodes,
      edges: connectionsDoc.connections,
      citations: nodesDoc.citations,
      demandModel: nodesDoc.demandModel,
      anchorDate: nodesDoc.anchorDate,
    },
    lanes: lanesDoc.lanes,
  };
}
