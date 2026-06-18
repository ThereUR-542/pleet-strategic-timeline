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

// ── Chronological stage columns (left → right flow) ──────────────────────────
// Each node is bucketed into ONE stage by its effective date. Stages give the
// graph its intake → downstream reading order without a continuous "rail" axis.

export interface Stage {
  /** Column index, 0 = left-most (earliest). */
  index: number;
  label: string;
  blurb: string;
  /** Inclusive lower ISO bound; null = open (catches earliest/undated). */
  from: string | null;
  /** Exclusive upper ISO bound; null = open (catches latest). */
  to: string | null;
}

/** Phase boundaries tuned to §8 chronology (Jan 2026 → Apr 2027, anchor Jun 17). */
export const STAGES: Stage[] = [
  { index: 0, label: "Foundations", blurb: "Formation & first contacts", from: null, to: "2026-04-01" },
  { index: 1, label: "Inbound & Growth", blurb: "Deaton inbound, lunches, intros", from: "2026-04-01", to: "2026-05-01" },
  { index: 2, label: "Convergence · Today", blurb: "Approvals converge on the City", from: "2026-05-01", to: "2026-07-01" },
  { index: 3, label: "Execution", blurb: "Printing begins, financing, bonds", from: "2026-07-01", to: "2026-10-01" },
  { index: 4, label: "Projected", blurb: "Downstream demand & pipeline", from: "2026-10-01", to: null },
];

export function stageForDate(iso: string | null): Stage {
  if (!iso) return STAGES[0];
  for (const s of STAGES) {
    const afterFrom = s.from === null || iso >= s.from;
    const beforeTo = s.to === null || iso < s.to;
    if (afterFrom && beforeTo) return s;
  }
  return STAGES[STAGES.length - 1];
}
