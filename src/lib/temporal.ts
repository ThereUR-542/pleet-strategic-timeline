// =============================================================================
// Temporal state + live "Today" marker helpers (PRD §4.7).
// `temporal_state` is DERIVED, never stored — it updates as the marker advances.
// =============================================================================

import type { IsoDate, TemporalState, TimelineNode } from "../data/types";

/** Resolve "today": `?asof=YYYY-MM-DD` override wins, else the live clock. */
export function resolveToday(search = ""): IsoDate {
  const params = new URLSearchParams(search);
  const asof = params.get("asof");
  if (asof && /^\d{4}-\d{2}-\d{2}$/.test(asof)) return asof;
  return new Date().toISOString().split("T")[0];
}

/**
 * The effective date a node sits at on the axis (end of a range, else date).
 * PLE-155 single-anchor model: a `person` node carries no top-level date, so it
 * is moored to `person.initialAppearanceDate` (first contact). This flows through
 * both the layout x-position AND the temporal-state chip, and adds NO special
 * casing of the live Today marker — a person is just another dated point.
 */
export function nodeAxisDate(node: TimelineNode): IsoDate | null {
  return (
    node.date ??
    node.dateEnd ??
    node.dateStart ??
    node.person?.initialAppearanceDate ??
    null
  );
}

/** Derive past | today | projected by comparing the node date to `today`. */
export function temporalStateFor(node: TimelineNode, today: IsoDate): TemporalState {
  const d = nodeAxisDate(node);
  if (!d) return "past"; // role/undated nodes render as established context
  if (d < today) return "past";
  if (d === today) return "today";
  return "projected";
}

/** Months since 2026-01-01 for an ISO date (the §6 time axis unit). */
export function monthsSinceEpoch(iso: IsoDate, epoch = "2026-01-01"): number {
  const a = new Date(epoch + "T00:00:00Z").getTime();
  const b = new Date(iso + "T00:00:00Z").getTime();
  const days = (b - a) / 86_400_000;
  return days / 30.4375; // average month length
}
