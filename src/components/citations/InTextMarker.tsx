import type { Citation } from "../../data/types";
import { useCitations } from "./CitationsContext";

interface Props {
  citation: Citation;
}

/**
 * Inline citation marker — renders (intextKey) as a clickable button that
 * opens the Citations panel and scrolls to the matching Works-Cited entry.
 * Never fabricates page numbers; uses the citation.intextKey join key as-is.
 */
export function InTextMarker({ citation }: Props) {
  const { open } = useCitations();

  return (
    <button
      className="intext-marker"
      onClick={() => open(citation.id)}
      aria-label={`Go to Works Cited entry: ${citation.intextKey}`}
      title="Open Works Cited"
      type="button"
    >
      ({citation.intextKey})
    </button>
  );
}
