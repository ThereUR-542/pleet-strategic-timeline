import { useState, useCallback, useMemo, useEffect, lazy, Suspense } from "react";
import type { Lane, TimelineData } from "./data/types";
import { loadTimelineBundle } from "./data/loader";
import { resolveToday } from "./lib/temporal";
import { FlowCanvas } from "./components/flow/FlowCanvas";
import { DetailPanel } from "./components/flow/DetailPanel";
import { DemandPanel } from "./components/flow/DemandPanel";
import { DataErrorScreen, DataLoadingScreen } from "./components/DataErrorScreen";
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

// ── Dev-only visual editor (PLE-137 connections + PLE-138 nodes/lanes). Lazy +
// DEV-gated: the public prod build never reaches this branch, so no repo-write
// surface ships to the live static site. Open at /editor under `npm run dev`.
const EditorShell = lazy(() => import("./editor/EditorShell"));
function isEditorRoute() {
  return (
    import.meta.env.DEV &&
    typeof window !== "undefined" &&
    window.location.pathname.replace(/\/$/, "") === "/editor"
  );
}

// ── Loader shell (PLE-136): content is fetched from /data/*.yaml at runtime.
// While it loads we show a spinner; on any located failure we show a clear
// error screen (never a blank page); on success we mount the timeline.
export function App() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setData(null);
    setError(null);
    loadTimelineBundle().then(
      (bundle) => { if (live) { setData(bundle.data); setLanes(bundle.lanes); } },
      (err) => { if (live) setError(err); },
    );
    return () => { live = false; };
  }, [attempt]);

  if (isEditorRoute()) {
    return (
      <Suspense fallback={<DataLoadingScreen />}>
        <EditorShell />
      </Suspense>
    );
  }

  if (error) return <DataErrorScreen error={error} onRetry={() => setAttempt((a) => a + 1)} />;
  if (!data) return <DataLoadingScreen />;

  return (
    <CitationsProvider>
      <TimelineApp data={data} lanes={lanes} />
    </CitationsProvider>
  );
}

function TimelineApp({ data, lanes }: { data: TimelineData; lanes: Lane[] }) {
  const today = resolveToday(typeof window !== "undefined" ? window.location.search : "");
  const { open: openCitations } = useCitations();

  const [activeTab, setActiveTab] = useState<ViewTab>("flow");
  // Deep-link support: `?node=<id>` preselects a node (handy when presenting).
  const initialSelected = useMemo(() => {
    if (typeof window === "undefined") return null;
    const id = new URLSearchParams(window.location.search).get("node");
    return id && data.nodes.some((n) => n.id === id) ? id : null;
  }, [data]);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [presenterActive, setPresenterActive] = useState(false);
  const [presenterStep, setPresenterStep] = useState(0);
  const [demandOpen, setDemandOpen] = useState(
    typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("demand") === "1",
  );

  const presenterStepIds = useMemo(
    () => buildPresenterSteps(data.nodes, data.edges),
    [data],
  );

  const matchedIds = useMemo(
    () => matchingNodeIds(data.nodes, filter),
    [data, filter],
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
    ? data.nodes.find((n) => n.id === selectedId) ?? null
    : null;

  const presenterNodeId = presenterActive ? (presenterStepIds[presenterStep] ?? null) : null;

  // ── Presenter mode: fullscreen step-through over the same flow graph ──
  if (presenterActive) {
    return (
      <PresenterMode
        nodes={data.nodes}
        edges={data.edges}
        stepIndex={presenterStep}
        stepIds={presenterStepIds}
        onStepChange={setPresenterStep}
        onExit={exitPresenter}
        orientation="horizontal"
      >
        <div className="flow-canvas-host" style={{ height: "100%" }}>
          <FlowCanvas
            data={data}
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
            aria-label={`Open citations panel (${data.citations.length} sources)`}
          >
            Works Cited ({data.citations.length})
          </button>
        </div>

        {activeTab === "flow" && (
          <SearchFilterBar
            filter={filter}
            onChange={setFilter}
            resultCount={matchedIds?.size ?? data.nodes.length}
            totalCount={data.nodes.length}
            lanes={lanes}
          />
        )}
      </div>

      {/* ── Main content ── */}
      {activeTab === "flow" ? (
        <div id="panel-flow" role="tabpanel" aria-labelledby="tab-flow" className="flow-stage">
          <div className="flow-canvas-host">
            <FlowCanvas
              data={data}
              today={today}
              selectedId={selectedId}
              focusNodeId={null}
              matchedNodeIds={matchedIds}
              onNodeSelect={handleNodeSelect}
            />
            <DemandPanel
              model={data.demandModel}
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
                citations={data.citations}
                edges={data.edges}
                nodes={data.nodes}
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
          <StrategicSummary data={data} today={today} />
        </div>
      )}

      {/* ── Citations side panel ── */}
      <CitationsPanel
        citations={data.citations}
        nodes={data.nodes}
      />
    </div>
  );
}
