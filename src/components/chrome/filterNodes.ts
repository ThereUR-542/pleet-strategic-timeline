import type { TimelineNode } from "../../data/types";
import type { FilterState } from "./SearchFilterBar";
import { isFilterEmpty } from "./SearchFilterBar";

/** Returns the set of node IDs that MATCH the current filter (empty set = no filter active). */
export function matchingNodeIds(nodes: TimelineNode[], filter: FilterState): Set<string> | null {
  if (isFilterEmpty(filter)) return null;

  const q = filter.query.toLowerCase().trim();
  const hasThread = filter.threads.length > 0;
  const hasType = filter.types.length > 0;

  const matched = new Set<string>();
  for (const node of nodes) {
    const matchesQuery =
      !q ||
      node.title.toLowerCase().includes(q) ||
      node.summary.toLowerCase().includes(q) ||
      (node.date ?? "").includes(q) ||
      (node.dateStart ?? "").includes(q) ||
      (node.dateEnd ?? "").includes(q);

    const matchesThread = !hasThread || (node.thread != null && filter.threads.includes(node.thread));
    const matchesType = !hasType || filter.types.includes(node.type);

    if (matchesQuery && matchesThread && matchesType) {
      matched.add(node.id);
    }
  }
  return matched;
}
