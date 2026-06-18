// =============================================================================
// Flow-graph theme tokens (PLE-92). Shared color/label tables for the React
// Flow node-graph so the custom node, edges, legend, and detail panel all read
// from ONE source. Mirrors the §4.2 palette already used by the modal.
// =============================================================================

import type { EdgeKind, NodeType } from "../../data/types";

/** Node fill/accent color by §7 type. */
export const NODE_COLOR: Record<NodeType, string> = {
  person: "#6ea8ff",
  project: "#57e0a8",
  event: "#f59e0b",
  concept: "#c084fc",
};

export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  person: "Person",
  project: "Project",
  event: "Event",
  concept: "Concept",
};

/** Edge color by §7 relationship kind. `finances`/`converges_on` are distinct (§4.2). */
export const EDGE_COLOR: Record<EdgeKind, string> = {
  finances: "#f59e0b",
  converges_on: "#a78bfa",
  introduced: "#94a3b8",
  owns: "#6ea8ff",
  partners: "#4ade80",
  demonstrates: "#22d3ee",
  depends_on: "#fbbf24",
  other: "#6b7280",
};

export const EDGE_KIND_LABEL: Record<EdgeKind, string> = {
  finances: "Finances",
  converges_on: "Converges on",
  introduced: "Introduced",
  owns: "Owns",
  partners: "Partners",
  demonstrates: "Demonstrates",
  depends_on: "Depends on",
  other: "Related",
};

/** Human-readable thread label for §9 story threads. */
export function threadLabel(thread: string | null): string {
  if (!thread) return "";
  return thread
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
