// =============================================================================
// MLA 9 citation renderer (PRD §4.5).
// Renders a Citation (9 core-element slots + optional 2nd container + access
// date) to an array of typed segments. Callers either join to plain text
// (testing, sorting) or map segments to JSX (em = italic, text = span).
// =============================================================================

import type { Citation, MlaContainer } from "../data/types";

/** One run of rendered text — plain or italic. */
export type MlaSegment = { kind: "text"; value: string } | { kind: "em"; value: string };

/** Sequence of segments representing one MLA-9 Works-Cited entry. */
export type RenderedMla = MlaSegment[];

// MLA 9 month abbreviations (May/June/July are never abbreviated).
const MONTHS = [
  "Jan.", "Feb.", "Mar.", "Apr.", "May", "June",
  "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec.",
];

function formatAccessDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function normalizeLocation(loc: string, isDoi: boolean): string {
  if (isDoi) {
    // DOI → always https://doi.org/ prefix.
    return loc.startsWith("https://doi.org/") ? loc : `https://doi.org/${loc}`;
  }
  // Strip http(s):// from live URLs; leave non-URL strings (e.g. "PDF") as-is.
  return loc.replace(/^https?:\/\//, "");
}

function renderContainer(c: MlaContainer, isDoi: boolean): MlaSegment[] {
  const parts: Array<MlaSegment[]> = [];
  // Slots 3–9 in order; null slots are skipped.
  if (c.title)             parts.push([{ kind: "em",   value: c.title }]);
  if (c.otherContributors) parts.push([{ kind: "text", value: c.otherContributors }]);
  if (c.version)           parts.push([{ kind: "text", value: c.version }]);
  if (c.number)            parts.push([{ kind: "text", value: c.number }]);
  if (c.publisher)         parts.push([{ kind: "text", value: c.publisher }]);
  if (c.pubDate)           parts.push([{ kind: "text", value: c.pubDate }]);
  if (c.location)          parts.push([{ kind: "text", value: normalizeLocation(c.location, isDoi) }]);

  const out: MlaSegment[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) out.push({ kind: "text", value: ", " });
    out.push(...parts[i]);
  }
  return out;
}

/**
 * Render a Citation to typed segments (MLA 9).
 *
 * Punctuation rules:
 * - Period after slot 1 (author) and after slot 2 (title).
 * - Title in "curly quotes" when contained (container1 present), in italics
 *   when standalone. Period goes inside the closing quote.
 * - Container slots 3–9 are comma-separated; period closes each container.
 * - Access date appended before the final period for undated/volatile sources.
 * - DOI locations → https://doi.org/ prefix; other URLs → strip http(s)://.
 */
export function renderMla(citation: Citation): RenderedMla {
  const segs: MlaSegment[] = [];
  const hasContainer = citation.container1 !== null;

  // Slot 1: Author.
  if (citation.author) {
    segs.push({ kind: "text", value: `${citation.author}. ` });
  }

  // Slot 2: Title of source.
  if (citation.titleSource) {
    if (hasContainer) {
      // Contained work → "Quoted title." (period inside closing quote per MLA 9).
      const t = citation.titleSource;
      const needsPeriod = !/[.?!]$/.test(t);
      segs.push({ kind: 'text', value: '"' + t + (needsPeriod ? '.' : '') + '"' + ' ' });
    } else {
      // Standalone work → Italic title.
      segs.push({ kind: "em", value: citation.titleSource });
      segs.push({ kind: "text", value: ". " });
    }
  }

  // Slots 3–9: Container 1.
  if (citation.container1) {
    const c1 = renderContainer(citation.container1, citation.isDoi);
    segs.push(...c1);
    if (!citation.container2) {
      if (citation.accessDate) {
        if (c1.length > 0) segs.push({ kind: "text", value: ", " });
        segs.push({ kind: "text", value: `Accessed ${formatAccessDate(citation.accessDate)}` });
      }
      segs.push({ kind: "text", value: "." });
    } else {
      // Container 2 follows; close container 1 with ". ".
      segs.push({ kind: "text", value: ". " });
    }
  }

  // Slots 3–9: Container 2 (nested source, e.g. database).
  if (citation.container2) {
    const c2 = renderContainer(citation.container2, false);
    segs.push(...c2);
    if (citation.accessDate) {
      if (c2.length > 0) segs.push({ kind: "text", value: ", " });
      segs.push({ kind: "text", value: `Accessed ${formatAccessDate(citation.accessDate)}` });
    }
    segs.push({ kind: "text", value: "." });
  }

  // No containers: access date follows standalone title directly.
  if (!citation.container1 && !citation.container2 && citation.accessDate) {
    segs.push({ kind: "text", value: `Accessed ${formatAccessDate(citation.accessDate)}.` });
  }

  return segs;
}

/** Collapses segments to plain text — for testing and alphabetic sort keys. */
export function renderMlaText(citation: Citation): string {
  return renderMla(citation).map((s) => s.value).join("");
}

/** Works-Cited sort key: author surname (lowercase) or title when no author. */
export function mlaAlphaKey(citation: Citation): string {
  return (citation.author ?? citation.titleSource ?? "").toLowerCase();
}
