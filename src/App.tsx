import { useState, useCallback, useMemo, useRef } from "react";
import TIMELINE_DATA from "./data/content";
import { resolveToday } from "./lib/temporal";
import { TimelineRenderer, type Orientation } from "./components/timeline/TimelineRenderer";
import { NodeModal, HoverCard } from "./components/modal";
import { Legend } from "./components/legend/Legend";
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

type ViewTab = "timeline" | "summary";

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

  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [openModalNodeId, setOpenModalNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("timeline");
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [presenterActive, setPresenterActive] = useState(false);
  const [presenterStep, setPresenterStep] = useState(0);

  // Hover card state (§4.3)
  const [hoverState, setHoverState] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);

  // The SVG <g> that triggered the last modal open; focus returns there on close (§4.3)
  const modalOriginRef = useRef<Element | null>(null);

  const presenterStepIds = useMemo(
    () => buildPresenterSteps(TIMELINE_DATA.nodes, TIMELINE_DATA.edges),
    [],
  );

  const matchedIds = useMemo(
    () => matchingNodeIds(TIMELINE_DATA.nodes, filter),
    [filter],
  );

  const handleNodeClick = useCallback((id: string, originEl: Element) => {
    setFocusNodeId(id);
    modalOriginRef.current = originEl;
    setOpenModalNodeId(id);
    setHoverState(null);
  }, []);

  const handleModalClose = useCallback(() => {
    setOpenModalNodeId(null);
  }, []);

  const handleOrientationToggle = useCallback(() => {
    setOrientation((o) => (o === "horizontal" ? "vertical" : "horizontal"));
  }, []);

  const handleNodeHover = useCallback(
    (id: string | null, x: number, y: number) => {
      if (openModalNodeId) return;
      setHoverState(id ? { id, x, y } : null);
    },
    [openModalNodeId],
  );

  const enterPresenter = useCallback(() => {
    setPresenterStep(0);
    setPresenterActive(true);
  }, []);

  const exitPresenter = useCallback(() => {
    setPresenterActive(false);
    setFocusNodeId(presenterStepIds[presenterStep] ?? null);
  }, [presenterStep, presenterStepIds]);

  const openNode = openModalNodeId
    ? TIMELINE_DATA.nodes.find((n) => n.id === openModalNodeId)
    : null;

  const hoverNode = hoverState
    ? TIMELINE_DATA.nodes.find((n) => n.id === hoverState.id)
    : null;

  const presenterNodeId = presenterActive ? (presenterStepIds[presenterStep] ?? null) : null;

  const timelineContent = (
    <TimelineRenderer
      data={TIMELINE_DATA}
      orientation={orientation}
      today={today}
      focusNodeId={presenterNodeId ?? focusNodeId}
      onNodeClick={handleNodeClick}
      onOrientationToggle={handleOrientationToggle}
      onNodeHover={handleNodeHover}
      matchedNodeIds={presenterActive ? null : matchedIds}
      presenterStepId={presenterNodeId}
      hideControls={presenterActive}
    />
  );

  if (presenterActive) {
    return (
      <>
        <PresenterMode
          nodes={TIMELINE_DATA.nodes}
          edges={TIMELINE_DATA.edges}
          stepIndex={presenterStep}
          stepIds={presenterStepIds}
          onStepChange={setPresenterStep}
          onExit={exitPresenter}
          orientation={orientation}
        >
          {timelineContent}
        </PresenterMode>
        {openNode && (
          <NodeModal
            node={openNode}
            citations={TIMELINE_DATA.citations}
            onClose={handleModalClose}
            originEl={modalOriginRef.current}
          />
        )}
      </>
    );
  }

  return (
    <div className="timeline-view">
      {/* ── Global chrome: tabs + search ── */}
      <div className="global-chrome">
        <div className="chrome-tabs" role="tablist" aria-label="Views">
          <button
            className={`chrome-tab ${activeTab === "timeline" ? "chrome-tab-active" : ""}`}
            role="tab"
            aria-selected={activeTab === "timeline"}
            onClick={() => setActiveTab("timeline")}
          >
            Timeline
          </button>
          <button
            className={`chrome-tab ${activeTab === "summary" ? "chrome-tab-active" : ""}`}
            role="tab"
            aria-selected={activeTab === "summary"}
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

        {activeTab === "timeline" && (
          <SearchFilterBar
            filter={filter}
            onChange={setFilter}
            resultCount={matchedIds?.size ?? TIMELINE_DATA.nodes.length}
            totalCount={TIMELINE_DATA.nodes.length}
          />
        )}
      </div>

      {/* ── Main content area ── */}
      {activeTab === "timeline" ? (
        <>
          {timelineContent}
          <Legend />
          <div className="footer-bar">
            <span className="footer-disclaimer">
              Demand model is theoretical / illustrative — not audited fact (§6).
            </span>
          </div>
        </>
      ) : (
        <StrategicSummary data={TIMELINE_DATA} today={today} />
      )}

      {/* ── Panels ── */}
      <CitationsPanel
        citations={TIMELINE_DATA.citations}
        nodes={TIMELINE_DATA.nodes}
      />

      {/* Hover card (§4.3) — position: fixed, zero layout shift */}
      {hoverNode && hoverState && (
        <HoverCard node={hoverNode} x={hoverState.x} y={hoverState.y} />
      )}

      {/* Focus-trapped modal (§4.3) */}
      {openNode && (
        <NodeModal
          node={openNode}
          citations={TIMELINE_DATA.citations}
          onClose={handleModalClose}
          originEl={modalOriginRef.current}
        />
      )}
    </div>
  );
}
