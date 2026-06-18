import { useCallback, useId, useMemo } from "react";
import type { Lane, Thread, NodeType } from "../../data/types";

export interface FilterState {
  query: string;
  threads: Thread[];
  types: NodeType[];
}

export const EMPTY_FILTER: FilterState = { query: "", threads: [], types: [] };

export function isFilterEmpty(f: FilterState): boolean {
  return !f.query && f.threads.length === 0 && f.types.length === 0;
}

const THREAD_LABELS: Record<Thread, string> = {
  foundational: "Foundational",
  growth: "Growth",
  savanna: "Savanna",
  oswego: "Oswego",
  major_projects: "Major Projects",
  media_brand: "Media & Brand",
  strategic_relationships: "Strategic Relationships",
  manufacturing: "Manufacturing",
  financial_interest: "Financial Interest",
};

const TYPE_LABELS: Record<NodeType, string> = {
  person: "Person",
  project: "Project",
  event: "Event",
  concept: "Concept",
};

const ALL_THREADS: Thread[] = [
  "foundational","growth","savanna","oswego","major_projects",
  "media_brand","strategic_relationships","manufacturing","financial_interest",
];
const ALL_TYPES: NodeType[] = ["person","project","event","concept"];

interface Props {
  filter: FilterState;
  onChange: (f: FilterState) => void;
  resultCount: number;
  totalCount: number;
  /** Lane registry from lanes.yaml (PLE-136); drives the thread chips + order.
   *  Falls back to the static defaults when absent (e.g. in unit tests). */
  lanes?: Lane[];
}

export function SearchFilterBar({ filter, onChange, resultCount, totalCount, lanes }: Props) {
  const searchId = useId();

  // Thread chips are data-driven from the lane registry (id, label, story order)
  // when supplied; otherwise fall back to the built-in defaults.
  const threadChips = useMemo<{ id: Thread; label: string }[]>(() => {
    if (lanes && lanes.length) {
      return [...lanes]
        .sort((a, b) => a.order - b.order)
        .map((l) => ({ id: l.id, label: l.label }));
    }
    return ALL_THREADS.map((t) => ({ id: t, label: THREAD_LABELS[t] }));
  }, [lanes]);

  const setQuery = useCallback((q: string) => {
    onChange({ ...filter, query: q });
  }, [filter, onChange]);

  const toggleThread = useCallback((t: Thread) => {
    const threads = filter.threads.includes(t)
      ? filter.threads.filter((x) => x !== t)
      : [...filter.threads, t];
    onChange({ ...filter, threads });
  }, [filter, onChange]);

  const toggleType = useCallback((t: NodeType) => {
    const types = filter.types.includes(t)
      ? filter.types.filter((x) => x !== t)
      : [...filter.types, t];
    onChange({ ...filter, types });
  }, [filter, onChange]);

  const clear = useCallback(() => onChange(EMPTY_FILTER), [onChange]);
  const hasFilter = !isFilterEmpty(filter);

  return (
    <div className="search-filter-bar" role="search" aria-label="Search and filter timeline">
      {/* Search input */}
      <label htmlFor={searchId} className="sr-only">Search nodes</label>
      <div className="search-input-wrap">
        <svg className="search-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          id={searchId}
          type="search"
          className="search-input"
          placeholder="Search by name, keyword, or date…"
          value={filter.query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search timeline nodes"
        />
      </div>

      {/* Thread filters */}
      <div className="filter-group" role="group" aria-label="Filter by thread">
        {threadChips.map(({ id: t, label }) => (
          <button
            key={t}
            className={`filter-chip filter-chip-thread filter-chip-thread-${t.replace(/_/g, "-")} ${filter.threads.includes(t) ? "active" : ""}`}
            onClick={() => toggleThread(t)}
            aria-pressed={filter.threads.includes(t)}
            title={label}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Type filters */}
      <div className="filter-group" role="group" aria-label="Filter by node type">
        {ALL_TYPES.map((t) => (
          <button
            key={t}
            className={`filter-chip filter-chip-type filter-chip-type-${t} ${filter.types.includes(t) ? "active" : ""}`}
            onClick={() => toggleType(t)}
            aria-pressed={filter.types.includes(t)}
            title={TYPE_LABELS[t]}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Result count + clear */}
      {hasFilter && (
        <div className="filter-status">
          <span className="filter-count" aria-live="polite">
            {resultCount} / {totalCount}
          </span>
          <button className="filter-clear" onClick={clear} aria-label="Clear all filters">
            ✕ Clear
          </button>
        </div>
      )}
    </div>
  );
}
