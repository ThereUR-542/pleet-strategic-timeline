// =============================================================================
// Person relationship graph (PLE-155, stage-③). The single-anchor model: each
// person appears once (moored at initialAppearanceDate) and every later
// touchpoint in their profile becomes an EDGE radiating from that one anchor —
// never a duplicate node at a later date. This module synthesizes those edges
// from `person.relationships[]` so the canvas can draw the relationship web; the
// modal builds its own graphic directly from the profile.
// =============================================================================

import type { Edge, TimelineNode } from "../../data/types";

/** Unordered pair key so an edge surfaced from both endpoints' profiles dedups. */
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Synthesize curvilinear relationship edges radiating from each person's single
 * anchor node to every connected node in their profile. Deduped against the
 * existing connection edges (so we never double-draw a relationship already in
 * connections.yaml) and against each other (Brady↔Bo draws once). Self-edges and
 * connectedNodeIds that don't resolve to a real node are skipped (the loader has
 * already validated resolution; this is belt-and-braces for render safety).
 */
export function buildPersonRelationshipEdges(
  nodes: TimelineNode[],
  edges: Edge[],
): Edge[] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const seen = new Set<string>();
  for (const e of edges) seen.add(pairKey(e.from, e.to));

  const out: Edge[] = [];
  for (const n of nodes) {
    if (n.type !== "person" || !n.person) continue;
    for (const rel of n.person.relationships) {
      for (const cid of rel.connectedNodeIds) {
        if (cid === n.id || !nodeIds.has(cid)) continue;
        const key = pairKey(n.id, cid);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          id: `pe-${n.id}-${cid}`,
          from: n.id,
          to: cid,
          // The profile records no EdgeKind, so the synthesized relationship edge
          // is the neutral `other` kind, rendered in --node-person on the canvas
          // (spec §3). Dated semantics live in the modal's interaction timeline.
          kind: "other",
          label: null,
        });
      }
    }
  }
  return out;
}

/** True when an edge is incident to a person node → routes curvilinear (spec §3). */
export function isPersonEdge(
  edge: Edge,
  nodeById: Map<string, TimelineNode>,
): boolean {
  return (
    nodeById.get(edge.from)?.type === "person" ||
    nodeById.get(edge.to)?.type === "person"
  );
}

/** A single resolved connection for the modal relationship graphic / timeline. */
export interface PersonConnection {
  /** Real node id when the connection resolves to a node (→ clickable). */
  id: string | null;
  title: string;
  /** Connected node's type color, else neutral. */
  color: string;
}
