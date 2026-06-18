export function Legend() {
  return (
    <details className="legend-panel">
      <summary className="legend-summary">Legend</summary>
      <div className="legend-body">

        <div className="legend-section">
          <h4>Node Types</h4>
          <div className="legend-items">
            <LegendDot color="var(--node-person)"  label="Person" />
            <LegendDot color="var(--node-project)" label="Project" />
            <LegendDot color="var(--node-event)"   label="Event" />
            <LegendDot color="var(--node-concept)" label="Concept" />
          </div>
        </div>

        <div className="legend-section">
          <h4>Threads</h4>
          <div className="legend-items">
            <LegendDot color="var(--thread-foundational)"            label="Foundational" />
            <LegendDot color="var(--thread-growth)"                  label="Growth" />
            <LegendDot color="var(--thread-savanna)"                 label="Savanna" />
            <LegendDot color="var(--thread-oswego)"                  label="Oswego" />
            <LegendDot color="var(--thread-major-projects)"          label="Major Projects" />
            <LegendDot color="var(--thread-media-brand)"             label="Media / Brand" />
            <LegendDot color="var(--thread-strategic-relationships)"  label="Strategic Relationships" />
            <LegendDot color="var(--thread-manufacturing)"           label="Manufacturing" />
            <LegendDot color="var(--thread-financial-interest)"      label="Financial Interest ★" />
          </div>
        </div>

        <div className="legend-section">
          <h4>Edge Relationships</h4>
          <div className="legend-items">
            <LegendLine color="var(--edge-finances)"     dashed label="Finances ★" />
            <LegendLine color="var(--edge-converges-on)" label="Converges on" arrow />
            <LegendLine color="var(--edge-introduced)"   label="Introduced" />
            <LegendLine color="var(--edge-owns)"         label="Owns" />
            <LegendLine color="var(--edge-partners)"     label="Partners" />
            <LegendLine color="var(--edge-demonstrates)" label="Demonstrates" />
            <LegendLine color="var(--edge-depends-on)"   label="Depends on" />
            <LegendLine color="var(--edge-other)"        label="Other" />
          </div>
        </div>

        <div className="legend-section">
          <h4>Temporal</h4>
          <div className="legend-items">
            <div className="legend-item">
              <svg width="20" height="14" aria-hidden="true">
                <circle cx="7" cy="7" r="6" fill="#6ea8ff" />
              </svg>
              Past
            </div>
            <div className="legend-item">
              <svg width="20" height="14" aria-hidden="true">
                <circle cx="7" cy="7" r="6" fill="#6ea8ff" opacity="0.45" />
              </svg>
              Projected
            </div>
            <div className="legend-item">
              <svg width="20" height="14" aria-hidden="true">
                <line x1="10" y1="1" x2="10" y2="13" stroke="white" strokeWidth="2" />
              </svg>
              Today
            </div>
          </div>
          <div className="legend-demand-note">
            <span>★ Financial Interest thread + Finances edges share gold (#f59e0b) — distinct treatment per §4.2/§9 #6</span><br />
            <span>Demand background layer and N(t) overlay are THEORETICAL / ILLUSTRATIVE (§5/§6)</span>
          </div>
        </div>

      </div>
    </details>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="legend-item">
      <span className="legend-dot" style={{ background: color }} aria-hidden="true" />
      {label}
    </div>
  );
}

function LegendLine({ color, label, dashed, arrow }: { color: string; label: string; dashed?: boolean; arrow?: boolean }) {
  return (
    <div className="legend-item">
      <svg width="22" height="10" aria-hidden="true" style={{ flexShrink: 0 }}>
        <line
          x1="1" y1="5" x2={arrow ? "16" : "21"} y2="5"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? "4 2" : undefined}
        />
        {arrow && (
          <polygon points="16,1 22,5 16,9" fill={color} />
        )}
      </svg>
      {label}
    </div>
  );
}
