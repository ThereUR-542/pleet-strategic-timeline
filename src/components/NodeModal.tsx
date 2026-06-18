import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { TimelineNode, Citation } from "../data/types";
import { renderMla } from "../lib/mla";

const NODE_COLORS: Record<string, string> = {
  person: "#6ea8ff",
  project: "#57e0a8",
  event: "#f59e0b",
  concept: "#c084fc",
};

interface Props {
  node: TimelineNode;
  citations: Citation[];
  onClose: () => void;
}

export function NodeModal({ node, citations, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const nodeCitations = citations.filter((c) => node.citationIds.includes(c.id));
  const color = NODE_COLORS[node.type] ?? "#94a3b8";

  const paragraphs = node.bodyMd
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return createPortal(
    <div
      className="node-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="node-modal">
        <div className="node-modal-header">
          <span className="node-modal-dot" style={{ background: color }} aria-hidden="true" />
          <div>
            <h2 className="node-modal-title" id="modal-title">{node.title}</h2>
            <p className="node-modal-meta">
              {node.type}{node.thread ? ` · ${node.thread.replace(/_/g, " ")}` : ""}
              {node.date ? ` · ${node.date}` : ""}
            </p>
          </div>
        </div>

        {node.confidence === "unconfirmed" && (
          <div className="node-modal-unconfirmed" role="note">
            Pending verification (§12) — treat as illustrative
          </div>
        )}

        {node.demandScore !== null && (
          <div className="node-modal-demand">
            THEORETICAL demand score: {node.demandScore}/100 (§5.2/§6.2 — illustrative)
          </div>
        )}

        <div className="node-modal-body">
          {paragraphs.map((p, i) => (
            <p key={i}>{renderInline(p)}</p>
          ))}
        </div>

        {nodeCitations.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 12, color: "var(--text-1)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>
              Works Cited
            </h3>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--text-1)", lineHeight: 1.6 }}>
              {nodeCitations.map((c) => (
                <li key={c.id}>
                  {renderMla(c).map((seg, i) =>
                    seg.kind === "em" ? <em key={i}>{seg.value}</em> : <span key={i}>{seg.value}</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        <button ref={closeRef} className="btn-close-modal" onClick={onClose}>
          Close
        </button>
      </div>
    </div>,
    document.body,
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}
