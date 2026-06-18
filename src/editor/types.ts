// =============================================================================
// Shared editor-local types (PLE-137 / PLE-138).
// =============================================================================

import type { Citation, DemandModel, IsoDate, Thread } from "../data/types";

/**
 * The nodes.yaml payload the editor preserves but never lets the board edit
 * (anchorDate + §6 demand model + the citation registry). Threaded into each tab
 * so validation runs the full loader gate.
 */
export interface EditorMeta {
  anchorDate: IsoDate;
  demandModel: DemandModel;
  citations: Citation[];
}

/** The 9 canonical thread keys — the only legal `lane.id` / node `thread` values. */
export const THREADS: Thread[] = [
  "foundational", "growth", "savanna", "oswego", "major_projects",
  "media_brand", "strategic_relationships", "manufacturing", "financial_interest",
];
