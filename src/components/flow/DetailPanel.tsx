// =============================================================================
// Node detail — DOCKED side panel (PLE-92). Replaces the stacked modal for the
// flow view: it sits in its OWN column beside the canvas (the canvas resizes to
// make room), so nothing is layered over the graph. Esc / ✕ close.
// =============================================================================

import { useEffect } from "react";
import type { TimelineNode, Citation } from "../../data/types";
import { renderMla } from "../../lib/mla";
import { renderInline } from "../../lib/inlineMarkdown";
import { MediaEmbed } from "../modal/MediaEmbed";
import { NODE_COLOR, NODE_TYPE_LABEL, threadLabel } from "./flowTheme";

interface Props {
  node: TimelineNode;
  citations: Citation[];
  onClose: () => void;
}

export function DetailPanel({ node, citations, onClose }: Props) {
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

  const meta = [NODE_TYPE_LABEL[node.type], threadLabel(node.thread), node.date]
    .filter(Boolean)
    .join(" · ");

  return (
    <aside
      className="detail-panel"
      role="complementary"
      aria-label={`Details: ${node.title}`}
    >
      <header className="detail-panel__head">
        <span
          className="detail-panel__dot"
          style={{ background: color }}
          aria-hidden="true"
        />
        <div className="detail-panel__headtext">
          <h2 className="detail-panel__title">{node.title}</h2>
          <p className="detail-panel__meta">{meta}</p>
        </div>
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

        <MediaEmbed media={node.media} />

        {nodeCitations.length > 0 && (
          <div className="detail-panel__cites">
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
    </aside>
  );
}
