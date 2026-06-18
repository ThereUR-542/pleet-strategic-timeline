import { useEffect, useCallback, useRef } from "react";
import type { TimelineNode, Edge } from "../../data/types";

interface Props {
  nodes: TimelineNode[];
  edges: Edge[];
  stepIndex: number;
  stepIds: string[];
  onStepChange: (idx: number) => void;
  onExit: () => void;
  orientation: "horizontal" | "vertical";
  children: React.ReactNode;
}

/** Ordered list of presenter step node IDs: convergence targets first, then demand-scored. */
export function buildPresenterSteps(nodes: TimelineNode[], edges: Edge[]): string[] {
  // Step 1: convergence targets (nodes that are the `to` of a converges_on edge)
  const convergenceTargets = new Set(
    edges.filter((e) => e.kind === "converges_on").map((e) => e.to),
  );
  // Step 2: high demand-score nodes (top quartile)
  const scored = nodes
    .filter((n) => n.demandScore != null && !convergenceTargets.has(n.id))
    .sort((a, b) => (b.demandScore ?? 0) - (a.demandScore ?? 0));
  const demandThreshold = scored.length > 0 ? (scored[0].demandScore ?? 0) * 0.5 : 0;
  const highDemand = scored.filter((n) => (n.demandScore ?? 0) >= demandThreshold);

  // Step 3: financial_interest thread nodes (not already included)
  const alreadyIn = new Set([...convergenceTargets, ...highDemand.map((n) => n.id)]);
  const financial = nodes.filter(
    (n) => n.thread === "financial_interest" && !alreadyIn.has(n.id),
  );

  // Step 4: remaining nodes sorted by date
  const allIncluded = new Set([
    ...convergenceTargets,
    ...highDemand.map((n) => n.id),
    ...financial.map((n) => n.id),
  ]);
  const remaining = nodes
    .filter((n) => !allIncluded.has(n.id))
    .sort((a, b) => {
      const da = a.date ?? a.dateStart ?? "";
      const db = b.date ?? b.dateStart ?? "";
      return da < db ? -1 : da > db ? 1 : 0;
    });

  // Gather convergence nodes in original node order
  const convNodes = nodes.filter((n) => convergenceTargets.has(n.id));

  return [
    ...convNodes.map((n) => n.id),
    ...highDemand.map((n) => n.id),
    ...financial.map((n) => n.id),
    ...remaining.map((n) => n.id),
  ];
}

export function PresenterMode({
  nodes,
  stepIndex,
  stepIds,
  onStepChange,
  onExit,
  orientation,
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

  // Keyboard handler: ←/→ to navigate, Escape to exit, F to fullscreen toggle
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onExit(); return; }
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft"  || e.key === "PageUp")  { e.preventDefault(); goPrev(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onExit]);

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
