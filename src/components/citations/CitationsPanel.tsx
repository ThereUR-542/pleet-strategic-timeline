import { useEffect, useMemo, useRef } from "react";
import type { Citation, TimelineNode } from "../../data/types";
import { mlaAlphaKey, renderMla } from "../../lib/mla";
import { useCitations } from "./CitationsContext";

interface Props {
  citations: Citation[];
  nodes: TimelineNode[];
}

/**
 * Alphabetized Works-Cited panel with bi-directional cross-links.
 *
 * - Markers (InTextMarker) call open(citationId) → panel opens and scrolls
 *   to the matching entry.
 * - Each entry lists back the nodes that cite it (reverse index via
 *   node.citationIds).
 */
export function CitationsPanel({ citations, nodes }: Props) {
  const { isOpen, close, targetCitationId, clearTarget } = useCitations();
  const panelRef = useRef<HTMLDivElement>(null);

  // Reverse index: citation.id → nodes that reference it
  const citeIndex = useMemo(() => {
    const map = new Map<string, TimelineNode[]>();
    for (const node of nodes) {
      for (const cId of node.citationIds) {
        const arr = map.get(cId) ?? [];
        arr.push(node);
        map.set(cId, arr);
      }
    }
    return map;
  }, [nodes]);

  // Works-Cited alphabetical order
  const sorted = useMemo(
    () => [...citations].sort((a, b) => mlaAlphaKey(a).localeCompare(mlaAlphaKey(b))),
    [citations],
  );

  // Scroll to the target entry when the panel opens or the target changes
  useEffect(() => {
    if (!isOpen || !targetCitationId) return;
    const el = document.getElementById(`cite-entry-${targetCitationId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      clearTarget();
    }
  }, [isOpen, targetCitationId, clearTarget]);

  // Trap keyboard focus inside the panel
  useEffect(() => {
    if (!isOpen) return;
    const el = panelRef.current;
    if (!el) return;
    const first = el.querySelector<HTMLElement>('[tabindex], button, a');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div
      className="citations-overlay"
      role="dialog"
      aria-label="Works Cited"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="citations-panel glass-panel" ref={panelRef}>
        <div className="citations-header">
          <h2 className="citations-title">Works Cited</h2>
          <button className="citations-close" onClick={close} aria-label="Close citations">
            &#x2715;
          </button>
        </div>

        {sorted.length === 0 ? (
          <p className="citations-empty">No citations yet.</p>
        ) : (
          <ol className="citations-list">
            {sorted.map((c) => {
              const segs = renderMla(c);
              const citingNodes = citeIndex.get(c.id) ?? [];
              return (
                <li key={c.id} id={`cite-entry-${c.id}`} className="citation-entry">
                  <p className="citation-mla">
                    {segs.map((seg, i) =>
                      seg.kind === "em"
                        ? <em key={i}>{seg.value}</em>
                        : <span key={i}>{seg.value}</span>,
                    )}
                  </p>
                  {citingNodes.length > 0 && (
                    <p className="citation-cited-in">
                      <span className="cited-in-label">Cited in: </span>
                      {citingNodes.map((n, i) => (
                        <span key={n.id}>
                          {i > 0 && <span className="cited-in-sep">; </span>}
                          <span className="cited-in-node">{n.title}</span>
                        </span>
                      ))}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
