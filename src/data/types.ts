// =============================================================================
// Pleet Strategic Timeline — Canonical Data Model (PRD §7)
// -----------------------------------------------------------------------------
// Names map directly to code. Dates are ISO 8601 (`YYYY-MM-DD`); ranges use
// `dateStart`/`dateEnd`. This file is the SHARED CONTRACT for the whole build:
// the renderer (Frontend), content/citations (Backend), demand math (§6), and
// QA all depend on these shapes. Change them only via the Engineering Lead.
// =============================================================================

/** ISO 8601 date string, `YYYY-MM-DD`. */
export type IsoDate = string;

export type NodeType = "person" | "project" | "event" | "concept";

/**
 * Story threads (PRD §9). `thread` on a node is one of these. The Financial
 * Interest thread (#6) gets its own distinct visual treatment (§4.2/§4.8/§4.10).
 */
export type Thread =
  | "foundational"
  | "growth"
  | "savanna"
  | "oswego"
  | "major_projects"
  | "media_brand"
  | "strategic_relationships"
  | "manufacturing"
  | "financial_interest";

/** Edge relationship kinds (PRD §7). `finances` gets a distinct style (§4.2). */
export type EdgeKind =
  | "introduced"
  | "owns"
  | "partners"
  | "converges_on"
  | "demonstrates"
  | "depends_on"
  | "finances"
  | "other";

/**
 * DERIVED at render time by comparing `date`/`dateEnd` to "today" (§4.7).
 * Never stored on a node — computed so it updates as the live marker advances.
 */
export type TemporalState = "past" | "today" | "projected";

/** Gates unconfirmed facts (§12). Unconfirmed nodes render "pending verification". */
export type Confidence = "confirmed" | "unconfirmed";

export type MediaKind = "pdf" | "image" | "map" | "video" | "link";

export interface MediaItem {
  id: string;
  kind: MediaKind;
  /** Asset URL or embed URL. */
  src: string;
  caption: string | null;
  citationIds: string[];
  /** If true → rendered with target="_blank" rel="noopener noreferrer" (§4.4). */
  opensExternal: boolean;
}

export interface TimelineNode {
  id: string;
  type: NodeType;
  title: string;
  /** Single date; null if range-only. */
  date: IsoDate | null;
  dateStart: IsoDate | null;
  dateEnd: IsoDate | null;
  thread: Thread | null;
  /** One-line, for the hover card. */
  summary: string;
  /** Rich modal content (markdown). */
  bodyMd: string;
  /** 0–100, THEORETICAL/illustrative; projects only, else null (§5.2/§6). */
  demandScore: number | null;
  media: MediaItem[];
  citationIds: string[];
  confidence: Confidence;
  /**
   * Ghost / antecedent visual state (PLE-120/PLE-127). True for events that
   * predate the thread they belong to and motivate a later introduction (e.g.
   * `n-savanna-bond-fail` 2026-04-07, before `n-savanna-intro` 2026-04-14).
   * ORTHOGONAL to `confidence` — an antecedent can be confirmed or unconfirmed.
   * Optional, defaults falsy; nothing flags/suppresses the antecedent.
   */
  isAntecedent?: boolean;
  /**
   * Scannable key-fact bullets for the detail panel (PLE-101). Optional and
   * non-blocking: when absent the panel derives a fallback set from existing
   * fields. Each entry may be `"Key: value"` — the panel styles key vs. value.
   */
  keyFacts?: string[];
}

export interface Edge {
  id: string;
  from: TimelineNode["id"];
  to: TimelineNode["id"];
  kind: EdgeKind;
  label: string | null;
}

/** One MLA 9 container's core elements (slots 3–9), rendered by rule (§4.5). */
export interface MlaContainer {
  title: string | null;
  otherContributors: string | null;
  version: string | null;
  number: string | null;
  publisher: string | null;
  pubDate: string | null;
  location: string | null;
}

/**
 * MLA 9 citation stored as core-element SLOTS, not a flat string (§4.5), so the
 * renderer enforces punctuation and the same citation is reusable across modals.
 */
export interface Citation {
  id: string;
  /** "Last, First" or org; null → alphabetize/shorten by title. */
  author: string | null;
  titleSource: string | null;
  container1: MlaContainer | null;
  /** Nested source (repeat slots 3–9). */
  container2: MlaContainer | null;
  /** Only for undated/volatile sources (§4.5). */
  accessDate: IsoDate | null;
  /** If true, location rendered with `https://doi.org/` prefix. */
  isDoi: boolean;
  /** Lead element (author surname or shortened title); the marker↔entry join key. */
  intextKey: string;
}

/** One sampled point on the background demand curve (§5.1/§6.1). */
export interface DemandPoint {
  /** Months since 2026-01-01 (Jan = 0). */
  tMonths: number;
  /** D(t), 0–100, theoretical. */
  value: number;
}

/** §6 model parameters — all configurable so Lawrence's real method is a swap. */
export interface DemandModel {
  /** Saturation ceiling (normalized to 100). */
  L: number;
  /** Growth steepness. */
  k: number;
  /** Inflection month (fastest growth). */
  t0: number;
  /** Per-project factor weights; must sum to 1 (§6.2). */
  weights: { R: number; V: number; C: number; S: number; M: number };
  /** Throughput capacity of one printer (§6.3). */
  cMachine: number;
  /** Set true only after the |Δ| ≤ 1e-4 dual-verification passes (§6.4). */
  verified: boolean;
}

/** The full content payload the app loads (§7). Content is data, not code. */
export interface TimelineData {
  nodes: TimelineNode[];
  edges: Edge[];
  citations: Citation[];
  demandModel: DemandModel;
  /** The narrative "today" anchor (§1/§4.7): 2026-06-17 Oswego approval. */
  anchorDate: IsoDate;
}
