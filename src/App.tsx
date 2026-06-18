import { useMemo } from "react";
import TIMELINE_DATA from "./data/content";
import { verifyCumulativeDemand } from "./lib/demand";
import { resolveToday, temporalStateFor } from "./lib/temporal";

/**
 * Foundation shell (Phase 1). This boots the app against the canonical data
 * model, runs the §6.4 dual verification at runtime, and renders a status
 * surface so the Vercel preview shows real, verified state while the Frontend
 * builds the dual-orientation renderer (PLE child issue, Phase 2). Replace this
 * shell with the timeline renderer — the data + math layer below is stable.
 */
export function App() {
  const today = resolveToday(typeof window !== "undefined" ? window.location.search : "");
  const verification = useMemo(
    () => verifyCumulativeDemand(0, 18, TIMELINE_DATA.demandModel),
    [],
  );

  const counts = TIMELINE_DATA.nodes.reduce(
    (acc, n) => {
      acc[temporalStateFor(n, today)]++;
      return acc;
    },
    { past: 0, today: 0, projected: 0 } as Record<string, number>,
  );

  return (
    <main className="app-shell">
      <section className="glass-panel hero">
        <p className="eyebrow">Pleet LLC · Strategic Timeline</p>
        <h1>Foundation online</h1>
        <p className="lede">
          Data model (§7), reconciled content (§8), and the demand-math layer (§6)
          are wired. The dual-orientation glass renderer is in build.
        </p>
        <dl className="stats">
          <div>
            <dt>Nodes</dt>
            <dd>{TIMELINE_DATA.nodes.length}</dd>
          </div>
          <div>
            <dt>Edges</dt>
            <dd>{TIMELINE_DATA.edges.length}</dd>
          </div>
          <div>
            <dt>Citations</dt>
            <dd>{TIMELINE_DATA.citations.length}</dd>
          </div>
          <div>
            <dt>Today</dt>
            <dd>{today}</dd>
          </div>
        </dl>
        <p className="temporal">
          past {counts.past} · today {counts.today} · projected {counts.projected}
        </p>
        <p className={`verify ${verification.ok ? "ok" : "fail"}`}>
          {verification.ok ? "✓" : "✗"} Demand math dual-verified · |Δ| ={" "}
          {verification.delta.toExponential(2)}
        </p>
        <p className="theoretical">
          Demand model is theoretical / illustrative — not audited fact (§6).
        </p>
      </section>
    </main>
  );
}
