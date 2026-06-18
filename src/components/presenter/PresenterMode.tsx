import { useEffect, useCallback, useRef } from "react";
import type { TimelineNode, Edge } from "../../data/types";
import { effectiveDate } from "../flow/layout";

interface Props {
  nodes: TimelineNode[];
  edges: Edge[];
  stepIndex: number;
  stepIds: string[];
  onStepChange: (idx: number) => void;
  onExit: () => void;
  orientation: "horizontal" | "vertical";
  /** PLE-146: whether the node detail modal is currently open. */
  detailOpen: boolean;
  /** PLE-146: open the detail modal (info + files + links) for a node id. */
  onShowDetail: (id: string) => void;
  children: React.ReactNode;
}

/**
 * Ordered list of presenter step node IDs — STRICTLY chronological by node date
 * (PLE-144). Lawrence's ask: Present-mode slides must advance in date order.
 *
 * Every timeline node becomes a slide (the prior 4-tier ordering's tiers already
 * unioned to the full node set, so the slide *set* is unchanged — only the order
 * is). Each node sorts by its `effectiveDate`: its own axis date
 * (`date ?? dateEnd ?? dateStart`), else the earliest axis date among its edge
 * neighbors, so an undated-but-connected node still slots in sensibly. We reuse
 * the canonical `effectiveDate` helper — no re-implemented date precedence.
 *
 * ISO `YYYY-MM-DD` strings compare correctly as strings. Undated nodes (effective
 * date resolves to null) go LAST in stable original array order; equal dates keep
 * stable original array order. The sort reads live data, so dates added later via
 * /editor re-slot automatically with no code change.
 */
export function buildPresenterSteps(nodes: TimelineNode[], edges: Edge[]): string[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return nodes
    .map((n, i) => ({ id: n.id, date: effectiveDate(n, edges, nodeMap), i }))
    .sort((a, b) => {
      if (a.date === b.date) return a.i - b.i; // tiebreak: stable original order
      if (a.date === null) return 1; // undated last
      if (b.date === null) return -1;
      return a.date < b.date ? -1 : 1;
    })
    .map((s) => s.id);
}

export function PresenterMode({
  nodes,
  stepIndex,
  stepIds,
  onStepChange,
  onExit,
  orientation,
  detailOpen,
  onShowDetail,
  children,
}: Props) {
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const currentNode = stepIds[stepIndex] != null
    ? nodes.find((n) => n.id === stepIds[stepIndex])
    : null;

  const goNext = useCallback(() => {
    if (stepIndex < stepIds.length - 1) onStepChange(stepIndex + 1);
  }, [stepIndex, stepIds.length, onStepChange]);

  const goPrev = useCallback(() => {
    if (stepIndex > 0) onStepChange(stepIndex - 1);
  }, [stepIndex, onStepChange]);

  // Keyboard handler: ←/→ navigate, I/Enter open detail, Escape close/exit.
  // When the detail modal is open, Escape is handled by DetailPanel itself
  // (close-first); we must NOT also exit the presentation (PLE-146).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { if (!detailOpen) onExit(); return; }
      if ((e.key === "i" || e.key === "I" || e.key === "Enter") && currentNode && !detailOpen) {
        e.preventDefault(); onShowDetail(currentNode.id); return;
      }
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft"  || e.key === "PageUp")  { e.preventDefault(); goPrev(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onExit, detailOpen, onShowDetail, currentNode]);

  // Fullscreen on mount
  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {/* ignore */});
    }
    return () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {/* ignore */});
      }
    };
  }, []);

  const total = stepIds.length;
  const pct = total > 1 ? ((stepIndex / (total - 1)) * 100).toFixed(1) : "100";

  return (
    <div
      className={`presenter-overlay presenter-${orientation}`}
      role="dialog"
      aria-label="Presenter Mode"
      aria-modal="true"
    >
      {/* The timeline content fills the overlay */}
      <div className="presenter-content" data-reduced-motion={prefersReducedMotion.current ? "true" : undefined}>
        {children}
      </div>

      {/* Current node info banner */}
      {currentNode && (
        <div className="presenter-node-banner" aria-live="polite">
          <span className="presenter-node-type" data-type={currentNode.type}>
            {currentNode.type[0].toUpperCase()}
          </span>
          <span className="presenter-node-title">{currentNode.title}</span>
          <span className="presenter-node-summary">{currentNode.summary}</span>
          <span className="presenter-node-hint">Click node · ⓘ Details for files &amp; links</span>
        </div>
      )}

      {/* Navigation controls */}
      <div className="presenter-nav" aria-label="Presenter navigation">
        <button
          className="presenter-nav-btn"
          onClick={goPrev}
          disabled={stepIndex === 0}
          aria-label="Previous step"
          title="Previous (← / Page Up)"
        >
          ‹
        </button>

        <div className="presenter-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total - 1} aria-valuenow={stepIndex}>
          <div className="presenter-progress-bar" style={{ width: `${pct}%` }} />
          <span className="presenter-progress-text">{stepIndex + 1} / {total}</span>
        </div>

        <button
          className="presenter-nav-btn"
          onClick={goNext}
          disabled={stepIndex === total - 1}
          aria-label="Next step"
          title="Next (→ / Page Down)"
        >
          ›
        </button>

        {currentNode && (
          <button
            className="presenter-detail-btn"
            onClick={() => onShowDetail(currentNode.id)}
            aria-label="Show node details, files and links"
            aria-expanded={detailOpen}
            title="Details, files & links (I / Enter)"
          >
            ⓘ Details
          </button>
        )}

        <button
          className="presenter-exit-btn"
          onClick={onExit}
          aria-label="Exit presenter mode"
          title="Exit (Escape)"
        >
          ✕ Exit
        </button>
      </div>
    </div>
  );
}
