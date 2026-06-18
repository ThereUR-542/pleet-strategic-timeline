import { useMemo } from "react";
import type { TimelineData, Thread } from "../../data/types";
import { demandAt } from "../../lib/demand";

const THREAD_META: { thread: Thread; label: string; color: string; weight?: "strong" }[] = [
  { thread: "financial_interest", label: "Financial Interest", color: "var(--thread-financial-interest)", weight: "strong" },
  { thread: "foundational",       label: "Foundational",      color: "var(--thread-foundational)" },
  { thread: "growth",             label: "Growth",            color: "var(--thread-growth)" },
  { thread: "savanna",            label: "Savanna",           color: "var(--thread-savanna)" },
  { thread: "oswego",             label: "Oswego",            color: "var(--thread-oswego)" },
  { thread: "major_projects",     label: "Major Projects",    color: "var(--thread-major-projects)" },
  { thread: "manufacturing",      label: "Manufacturing",     color: "var(--thread-manufacturing)" },
  { thread: "strategic_relationships", label: "Strategic Relationships", color: "var(--thread-strategic-relationships)" },
  { thread: "media_brand",        label: "Media & Brand",     color: "var(--thread-media-brand)" },
];

interface Props {
  data: TimelineData;
  today: string;
}

export function StrategicSummary({ data, today }: Props) {
  // Group nodes by thread
  const byThread = useMemo(() => {
    const map = new Map<Thread, typeof data.nodes>();
    for (const node of data.nodes) {
      if (!node.thread) continue;
      const arr = map.get(node.thread) ?? [];
      arr.push(node);
      map.set(node.thread, arr);
    }
    return map;
  }, [data.nodes]);

  // Demand curve snapshot at today (t ≈ months since Jan 1, 2026)
  const todayDate = new Date(today + "T00:00:00Z");
  const epochJan2026 = new Date("2026-01-01T00:00:00Z").getTime();
  const tNow = (todayDate.getTime() - epochJan2026) / (30.4375 * 86400000);
  const demandNow = demandAt(tNow, data.demandModel);
  const demandEOY = demandAt(12, data.demandModel);

  // Manufacturing imperative: N machines at peak
  const machinesAtPeak = Math.ceil(demandEOY / (data.demandModel.cMachine ?? 20));

  // Financial interest nodes
  const finNodes = byThread.get("financial_interest") ?? [];

  return (
    <div className="strategic-summary" role="main" aria-label="Strategic Summary">
      <div className="summary-header">
        <h1 className="summary-title">Strategic Summary</h1>
        <p className="summary-subtitle">
          Pleet LLC · 2026 — threads, demand trajectory, and manufacturing imperative.
        </p>
        <p className="summary-disclaimer">
          Demand model is theoretical / illustrative (§6). Not audited fact.
        </p>
      </div>

      {/* ── Why this matters — Financial Interest callout (§4.10) ── */}
      <div className="summary-financing-callout">
        <div className="callout-header">
          <span className="callout-icon">💰</span>
          <span className="callout-label">Why This Matters — Banking & Financing</span>
        </div>
        <p className="callout-body">
          Multiple regional lenders (IBC Bank, Gateway First/BancFirst) have independently engaged
          Pleet about financing 3D-printed residences — an unsolicited signal that institutional
          finance considers this asset class viable. Each financing meeting is tracked as a
          confirmed demand-legitimacy event.
        </p>
        <ul className="callout-nodes">
          {finNodes.map((n) => (
            <li key={n.id} className="callout-node">
              <span className="callout-node-dot" />
              <strong>{n.title}</strong>
              {" — "}
              <span className="callout-node-summary">{n.summary}</span>
              {n.confidence === "unconfirmed" && (
                <span className="unconfirmed-badge" title="Pending verification (§12)"> ⚠ unconfirmed</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Demand curve snapshot ── */}
      <div className="summary-section">
        <h2 className="summary-section-title">Demand Curve (§5.1) — Theoretical / Illustrative</h2>
        <div className="demand-snapshot">
          <DemandMiniChart model={data.demandModel} tNow={tNow} />
          <div className="demand-stats">
            <div className="demand-stat">
              <span className="demand-stat-value">{Math.round(demandNow)}</span>
              <span className="demand-stat-label">D(t) today</span>
            </div>
            <div className="demand-stat demand-stat-accent">
              <span className="demand-stat-value">{Math.round(demandEOY)}</span>
              <span className="demand-stat-label">D(t) end-2026 (proj.)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Manufacturing imperative (§5.3) ── */}
      <div className="summary-section">
        <h2 className="summary-section-title">Manufacturing Imperative (§5.3)</h2>
        <div className="manufacturing-imperative">
          <div className="imperative-stat">
            <span className="imperative-n">N ≈ {machinesAtPeak}</span>
            <span className="imperative-label">
              printers required to meet projected end-2026 demand
            </span>
          </div>
          <p className="imperative-note">
            Based on theoretical throughput of {data.demandModel.cMachine ?? 20} units/machine.
            Each additional machine is a discrete capital commitment — the manufacturing
            decision gate is approaching.
          </p>
        </div>
      </div>

      {/* ── Thread narratives ── */}
      <div className="summary-section">
        <h2 className="summary-section-title">Story Threads (§9)</h2>
        <div className="thread-grid">
          {THREAD_META.map(({ thread, label, color, weight }) => {
            const nodes = byThread.get(thread) ?? [];
            if (nodes.length === 0) return null;
            return (
              <div
                key={thread}
                className={`thread-card ${weight === "strong" ? "thread-card-strong" : ""}`}
                style={{ borderColor: color }}
              >
                <div className="thread-card-header">
                  <span className="thread-dot" style={{ background: color }} />
                  <span className="thread-card-name">{label}</span>
                  <span className="thread-card-count">{nodes.length} nodes</span>
                </div>
                <ul className="thread-node-list">
                  {nodes.slice(0, weight === "strong" ? 6 : 3).map((n) => (
                    <li key={n.id} className="thread-node-item">
                      <span className="thread-node-type" data-type={n.type}>{n.type[0].toUpperCase()}</span>
                      <span className="thread-node-title">{n.title}</span>
                      {n.confidence === "unconfirmed" && (
                        <span className="unconfirmed-badge"> ⚠</span>
                      )}
                    </li>
                  ))}
                  {nodes.length > (weight === "strong" ? 6 : 3) && (
                    <li className="thread-node-more">
                      +{nodes.length - (weight === "strong" ? 6 : 3)} more
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DemandMiniChart({ model, tNow }: { model: { L: number; k: number; t0: number }; tNow: number }) {
  const W = 280, H = 80;
  const pad = { l: 8, r: 8, t: 8, b: 8 };
  const n = 48;
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * 12;
    const v = demandAt(t, model);
    const x = pad.l + (t / 12) * (W - pad.l - pad.r);
    const y = H - pad.b - (v / model.L) * (H - pad.t - pad.b);
    return `${x},${y}`;
  });
  const todayX = pad.l + (tNow / 12) * (W - pad.l - pad.r);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="demand-mini-chart" aria-label="Demand curve preview (theoretical)">
      <polyline points={pts.join(" ")} fill="none" stroke="#6ea8ff" strokeWidth="1.5" opacity="0.8" />
      <line x1={todayX} y1={pad.t} x2={todayX} y2={H - pad.b} stroke="white" strokeWidth="1" strokeDasharray="3 2" />
      <text x={todayX + 3} y={pad.t + 10} style={{ fontSize: 8, fill: "white" }}>Today</text>
    </svg>
  );
}
