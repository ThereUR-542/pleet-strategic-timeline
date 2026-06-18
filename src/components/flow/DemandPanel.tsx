// =============================================================================
// Demand Outlook — a DEDICATED, SEPARATE panel (PLE-92). The demand-growth story
// (§5/§6) is KEPT, but presented cleanly in its own card — NOT as a layer behind
// the node-graph (that layered metaphor is exactly what got v1 rejected). All
// numbers are THEORETICAL / ILLUSTRATIVE and labeled as such (§12).
// =============================================================================

import { useMemo } from "react";
import type { DemandModel } from "../../data/types";
import { backgroundCurveSamples, equipmentStepSeries } from "../../lib/demand-viz";
import { verifyCumulativeDemand } from "../../lib/demand";

interface Props {
  model: DemandModel;
  open: boolean;
  onToggle: () => void;
}

const TMAX = 12;
const W = 260;
const H = 84;

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export function DemandPanel({ model, open, onToggle }: Props) {
  const { path, steps, verify } = useMemo(() => {
    const samples = backgroundCurveSamples(model, 0, TMAX);
    const path = samples
      .map((p, i) => {
        const x = (p.tMonths / TMAX) * W;
        const y = H - (p.value / 100) * H;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    const steps = equipmentStepSeries(model, TMAX).filter((s) => s.machines >= 1);
    const verify = verifyCumulativeDemand(0, TMAX, model);
    return { path, steps, verify };
  }, [model]);

  if (!open) {
    return (
      <button className="demand-toggle" onClick={onToggle} aria-expanded={false}>
        ▸ Demand Outlook
      </button>
    );
  }

  return (
    <section className="demand-panel" aria-label="Demand outlook (theoretical)">
      <header className="demand-panel__head">
        <span className="demand-panel__title">Demand Outlook</span>
        <button
          className="demand-panel__close"
          onClick={onToggle}
          aria-label="Collapse demand outlook"
          aria-expanded
        >
          ▾
        </button>
      </header>

      <svg
        className="demand-panel__chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Theoretical demand growth curve D(t) over 2026"
      >
        <defs>
          <linearGradient id="demand-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#57e0a8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#57e0a8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L${W},${H} L0,${H} Z`} fill="url(#demand-fill)" stroke="none" />
        <path d={path} fill="none" stroke="#57e0a8" strokeWidth="2" />
      </svg>
      <div className="demand-panel__axis" aria-hidden="true">
        {MONTHS.map((m, i) => (
          <span key={i}>{m}</span>
        ))}
      </div>

      <p className="demand-panel__sub">D(t) — theoretical / illustrative (§6)</p>

      <div className="demand-panel__steps">
        <span className="demand-panel__steps-label">Printers needed N(t):</span>
        <div className="demand-panel__steps-row">
          {steps.map((s) => (
            <span key={s.tMonths} className="demand-step" title={`Month ${s.tMonths}`}>
              {MONTHS[s.tMonths] ?? s.tMonths}
              <strong>{s.machines}</strong>
            </span>
          ))}
        </div>
      </div>

      <p className={`demand-panel__verify ${verify.ok ? "ok" : "fail"}`}>
        {verify.ok ? "✓" : "✕"} Dual-verified (§6.4) · |Δ| = {verify.delta.toExponential(1)}
      </p>
    </section>
  );
}
