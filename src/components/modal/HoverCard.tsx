import type { TimelineNode } from "../../data/types";

interface Props {
  node: TimelineNode;
  /** Screen-space X (fixed position). */
  x: number;
  /** Screen-space Y (fixed position, card renders above this point). */
  y: number;
}

const TYPE_LABEL: Record<string, string> = {
  person: "Person",
  project: "Project",
  event: "Event",
  concept: "Concept",
};

/**
 * Summary card shown on node hover/focus (§4.3).
 * Rendered via fixed positioning — causes zero layout shift.
 */
export function HoverCard({ node, x, y }: Props) {
  const label = TYPE_LABEL[node.type] ?? node.type;
  const dateStr = node.date ?? node.dateStart ?? null;

  return (
    <div
      className="hover-card"
      style={{ left: x, top: y }}
      role="tooltip"
      aria-live="polite"
      data-testid="hover-card"
    >
      <div className="hover-card-type">
        {label}
        {dateStr ? ` · ${dateStr}` : ""}
      </div>
      <div className="hover-card-title">{node.title}</div>
      {node.summary && (
        <div className="hover-card-summary">{node.summary}</div>
      )}
      {node.confidence === "unconfirmed" && (
        <div className="hover-card-unconfirmed">Pending verification (§12)</div>
      )}
    </div>
  );
}
