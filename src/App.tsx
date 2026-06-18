import { useState, useCallback, useMemo } from "react";
import TIMELINE_DATA from "./data/content";
import { resolveToday } from "./lib/temporal";
import { FlowCanvas } from "./components/flow/FlowCanvas";
import { DetailPanel } from "./components/flow/DetailPanel";
import { DemandPanel } from "./components/flow/DemandPanel";
import {
  CitationsPanel,
  CitationsProvider,
  useCitations,
} from "./components/citations";
import { SearchFilterBar, EMPTY_FILTER, type FilterState } from "./components/chrome/SearchFilterBar";
import { matchingNodeIds } from "./components/chrome/filterNodes";
import { StrategicSummary } from "./components/summary/StrategicSummary";
import { PresenterMode, buildPresenterSteps } from "./components/presenter/PresenterMode";
import "./styles/timeline.css";
import "./styles/flow.css";

type ViewTab = "flow" | "summary";

export function App() {
  return (
    <CitationsProvider>
      <TimelineApp />
    </CitationsProvider>
  );
}

function TimelineApp() {
  const today = resolveToday(typeof window !== "undefined" ? window.location.search : "");
  const { open: openCitations } = useCitations();

  const [activeTab, setActiveTab] = useState<ViewTab>("flow");
  // Deep-link support: `?node=<id>` preselects a node (handy when presenting).
  const initialSelected = useMemo(() => {
    if (typeof window === "undefined") return null;
    const id = new URLSearchParams(window.location.search).get("node");
    return id && TIMELINE_DATA.nodes.some((n) => n.id === id) ? id : null;
  }, []);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [presenterActive, setPresenterActive] = useState(false);
  const [presenterStep, setPresenterStep] = useState(0);
  const [demandOpen, setDemandOpen] = useState(
    typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("demand") === "1",
  );

  const presenterStepIds = useMemo(
    () => buildPresenterSteps(TIMELINE_DATA.nodes, TIMELINE_DATA.edges),
    [],
  );

  const matchedIds = useMemo(
    () => matchingNodeIds(TIMELINE_DATA.nodes, filter),
    [filter],
  );

  const handleNodeSelect = useCallback((id: string) => {
    setSelectedId(id || null);
  }, []);

  const enterPresenter = useCallback(() => {
    setPresenterStep(0);
    setSelectedId(null);
    setPresenterActive(true);
  }, []);

  const exitPresenter = useCallback(() => {
    setPresenterActive(false);
  }, []);

  const selectedNode = selectedId
    ? TIMELINE_DATA.nodes.find((n) => n.id === selectedId) ?? null
    : null;

  const presenterNodeId = presenterActive ? (presenterStepIds[presenterStep] ?? null) : null;

  // ── Presenter mode: fullscreen step-through over the same flow graph ──
  if (presenterActive) {
    return (
      <PresenterMode
        nodes={TIMELINE_DATA.nodes}
        edges={TIMELINE_DATA.edges}
        stepIndex={presenterStep}
        stepIds={presenterStepIds}
        onStepChange={setPresenterStep}
        onExit={exitPresenter}
        orientation="horizontal"
      >
        <div className="flow-canvas-host" style={{ height: "100%" }}>
          <FlowCanvas
            data={TIMELINE_DATA}
            today={today}
            selectedId={presenterNodeId}
            focusNodeId={presenterNodeId}
            matchedNodeIds={null}
            onNodeSelect={() => {}}
            compact
          />
        </div>
      </PresenterMode>
    );
  }

  return (
    <div className="flow-shell">
      {/* ── Global chrome: tabs + search ── */}
      <div className="global-chrome">
        <div className="chrome-tabs" role="tablist" aria-label="Views">
          <button
            id="tab-flow"
            className={`chrome-tab ${activeTab === "flow" ? "chrome-tab-active" : ""}`}
            role="tab"
            aria-selected={activeTab === "flow"}
            aria-controls="panel-flow"
            onClick={() => setActiveTab("flow")}
          >
            Flow Chart
          </button>
          <button
            id="tab-summary"
            className={`chrome-tab ${activeTab === "summary" ? "chrome-tab-active" : ""}`}
            role="tab"
            aria-selected={activeTab === "summary"}
            aria-controls="panel-summary"
            onClick={() => setActiveTab("summary")}
          >
            Strategic Summary
          </button>
          <div className="chrome-tab-spacer" />
          <button
            className="btn-toggle btn-presenter"
            onClick={enterPresenter}
            aria-label="Enter Presenter Mode"
            title="Enter Presenter Mode (fullscreen step-through)"
          >
            ▶ Present
          </button>
          <button
            className="btn-toggle btn-citations"
            onClick={() => openCitations()}
            aria-label={`Open citations panel (${TIMELINE_DATA.citations.length} sources)`}
          >
            Works Cited ({TIMELINE_DATA.citations.length})
          </button>
        </div>

        {activeTab === "flow" && (
          <SearchFilterBar
            filter={filter}
            onChange={setFilter}
            resultCount={matchedIds?.size ?? TIMELINE_DATA.nodes.length}
            totalCount={TIMELINE_DATA.nodes.length}
          />
        )}
      </div>

      {/* ── Main content ── */}
      {activeTab === "flow" ? (
        <div id="panel-flow" role="tabpanel" aria-labelledby="tab-flow" className="flow-stage">
          <div className="flow-canvas-host">
            <FlowCanvas
              data={TIMELINE_DATA}
              today={today}
              selectedId={selectedId}
              focusNodeId={null}
              matchedNodeIds={matchedIds}
              onNodeSelect={handleNodeSelect}
            />
            <DemandPanel
              model={TIMELINE_DATA.demandModel}
              open={demandOpen}
              onToggle={() => setDemandOpen((v) => !v)}
            />
          </div>
          {selectedNode && (
            <>
              <div
                className="detail-scrim"
                aria-hidden="true"
                onClick={() => setSelectedId(null)}
              />
              <DetailPanel
                node={selectedNode}
                citations={TIMELINE_DATA.citations}
                edges={TIMELINE_DATA.edges}
                nodes={TIMELINE_DATA.nodes}
                today={today}
                onClose={() => setSelectedId(null)}
              />
            </>
          )}
        </div>
      ) : (
        <div
          id="panel-summary"
          role="tabpanel"
          aria-labelledby="tab-summary"
          tabIndex={0}
          style={{ flex: "1 1 auto", overflowY: "auto" }}
        >
          <StrategicSummary data={TIMELINE_DATA} today={today} />
        </div>
      )}

      {/* ── Citations side panel ── */}
      <CitationsPanel
        citations={TIMELINE_DATA.citations}
        nodes={TIMELINE_DATA.nodes}
      />
    </div>
  );
}
