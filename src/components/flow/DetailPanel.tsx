// =============================================================================
// Node detail — DOCKED side panel (PLE-92 / PLE-102, per the PLE-101 spec).
// Sits in its OWN column beside the canvas on desktop (the canvas resizes to
// make room); on mobile it's a bottom sheet over a dimmed/blurred graph. Nothing
// is ever stacked over a live, busy graph. Esc / ✕ / scrim-tap close.
//
// Anatomy (PLE-101 §3): type-keyed top border → tag pill → title → meta + state
// chip → status chips → description → KEY FACTS → CONNECTIONS → media → footer
// source line. All spacing/type from PLE-99 tokens; all color from flowTheme.
// =============================================================================

import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import type { Edge, IsoDate, TimelineNode, Citation } from "../../data/types";
import { renderMla } from "../../lib/mla";
import { renderInline } from "../../lib/inlineMarkdown";
import { temporalStateFor } from "../../lib/temporal";
import { MediaEmbed } from "../modal/MediaEmbed";
import {
  NODE_COLOR,
  NODE_TYPE_LABEL,
  EDGE_COLOR,
  EDGE_KIND_LABEL,
  threadLabel,
} from "./flowTheme";

interface Props {
  node: TimelineNode;
  citations: Citation[];
  /** All edges — used to derive the Connections row (PLE-101 §3.2). */
  edges: Edge[];
  /** All nodes — to resolve connected node titles. */
  nodes: TimelineNode[];
  /** "Today" anchor for the temporal-state chip (§4.7). */
  today: IsoDate;
  onClose: () => void;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** `2026-06-17` → `Jun 17, 2026`. Pure string parse (no Date/locale). */
function formatDate(iso: IsoDate): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${MONTHS[Number(mo) - 1]} ${Number(d)}, ${y}`;
}

/** Human "when" line: single date, or a `start – end` range. */
function formatWhen(node: TimelineNode): string | null {
  if (node.date) return formatDate(node.date);
  if (node.dateStart && node.dateEnd)
    return `${formatDate(node.dateStart)} – ${formatDate(node.dateEnd)}`;
  return node.dateStart ?? node.dateEnd ? formatDate((node.dateStart ?? node.dateEnd)!) : null;
}

const STATE_LABEL = { past: "Past", today: "Today", projected: "Projected" } as const;

/**
 * Key facts. Curated `node.keyFacts` win; otherwise derive a scannable fallback
 * from existing fields (PLE-101 §4.5 — derived fallback is acceptable for v1).
 * Demand + connections have their own surfaces, so they're excluded here.
 */
function deriveKeyFacts(node: TimelineNode): string[] {
  if (node.keyFacts && node.keyFacts.length) return node.keyFacts.slice(0, 6);
  const when = formatWhen(node);
  const candidates = [
    `Type: ${NODE_TYPE_LABEL[node.type]}`,
    node.thread ? `Thread: ${threadLabel(node.thread)}` : null,
    when ? `When: ${when}` : null,
    node.summary ? `Summary: ${node.summary}` : null,
    `Confidence: ${node.confidence === "confirmed" ? "Confirmed — cited" : "Pending verification (§12)"}`,
  ];
  return candidates.filter((f): f is string => Boolean(f)).slice(0, 6);
}

/** Split `"Key: value"` for styling; plain strings render as value-only. */
function splitFact(fact: string): { key: string | null; value: string } {
  const i = fact.indexOf(": ");
  if (i === -1) return { key: null, value: fact };
  return { key: fact.slice(0, i), value: fact.slice(i + 2) };
}

export function DetailPanel({ node, citations, edges, nodes, today, onClose }: Props) {
  const citesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const color = NODE_COLOR[node.type] ?? "#94a3b8";
  const nodeCitations = citations.filter((c) => node.citationIds.includes(c.id));
  const paragraphs = node.bodyMd
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const tagText = [NODE_TYPE_LABEL[node.type], threadLabel(node.thread)]
    .filter(Boolean)
    .join(" · ");
  const when = formatWhen(node);
  const state = temporalStateFor(node, today);
  const facts = deriveKeyFacts(node);

  // Connections: edges touching this node, with the other end's title + relation
  // word (colored by EdgeKind). Outgoing → arrow, incoming ← arrow (§3.2).
  const connections = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    return edges
      .filter((e) => e.from === node.id || e.to === node.id)
      .map((e) => {
        const outgoing = e.from === node.id;
        const other = byId.get(outgoing ? e.to : e.from);
        if (!other) return null;
        return {
          id: e.id,
          kind: e.kind,
          rel: EDGE_KIND_LABEL[e.kind],
          arrow: outgoing ? "→" : "←",
          title: other.title,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .slice(0, 8);
  }, [edges, nodes, node.id]);

  const primaryCite = nodeCitations[0];

  return (
    <aside
      className="detail-panel"
      role="complementary"
      aria-label={`Details: ${node.title}`}
      style={{ "--type": color } as CSSProperties}
    >
      <span className="detail-panel__grabber" aria-hidden="true" />
      <header className="detail-panel__head">
        <span className="detail-panel__tag">
          <span className="detail-panel__tag-dot" aria-hidden="true" />
          {tagText}
        </span>
        <h2 className="detail-panel__title">{node.title}</h2>
        <p className="detail-panel__meta">
          {when && <span className="detail-panel__date">{when}</span>}
          <span className={`detail-panel__state detail-panel__state--${state}`}>
            {STATE_LABEL[state]}
          </span>
        </p>
        <button
          className="detail-panel__close"
          onClick={onClose}
          aria-label="Close details"
          title="Close (Esc)"
        >
          ✕
        </button>
      </header>

      <div className="detail-panel__scroll">
        {node.confidence === "unconfirmed" && (
          <div className="detail-panel__note" role="note">
            Pending verification (§12) — treat as illustrative
          </div>
        )}

        {node.demandScore !== null && (
          <div className="detail-panel__demand">
            THEORETICAL demand score: {node.demandScore}/100 (§5.2/§6.2 — illustrative)
          </div>
        )}

        <div className="detail-panel__body">
          {paragraphs.map((p, i) => (
            <p key={i}>{renderInline(p)}</p>
          ))}
        </div>

        {facts.length > 0 && (
          <>
            <p className="detail-panel__section-label">Key facts</p>
            <ul className="detail-panel__facts">
              {facts.map((fact, i) => {
                const { key, value } = splitFact(fact);
                return (
                  <li key={i}>
                    <span>
                      {key && <span className="detail-panel__fact-key">{key}: </span>}
                      <span className="detail-panel__fact-value">{value}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {connections.length > 0 && (
          <>
            <p className="detail-panel__section-label">Connections</p>
            <div className="detail-panel__conns">
              {connections.map((c) => (
                <span
                  key={c.id}
                  className="detail-panel__conn"
                  style={{ "--ek": EDGE_COLOR[c.kind] } as CSSProperties}
                >
                  <span className="detail-panel__conn-rel">
                    {c.rel} {c.arrow}
                  </span>{" "}
                  {c.title}
                </span>
              ))}
            </div>
          </>
        )}

        <MediaEmbed media={node.media} />

        {nodeCitations.length > 0 && (
          <div className="detail-panel__cites" ref={citesRef}>
            <h3>Works Cited</h3>
            <ol>
              {nodeCitations.map((c) => (
                <li key={c.id}>
                  {renderMla(c).map((seg, i) =>
                    seg.kind === "em" ? (
                      <em key={i}>{seg.value}</em>
                    ) : (
                      <span key={i}>{seg.value}</span>
                    ),
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {nodeCitations.length > 0 && (
        <footer className="detail-panel__foot">
          Source: {primaryCite.intextKey} ·{" "}
          <button
            type="button"
            className="detail-panel__foot-link"
            onClick={() =>
              citesRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
            }
          >
            Works Cited ({nodeCitations.length})
          </button>
        </footer>
      )}
    </aside>
  );
}
