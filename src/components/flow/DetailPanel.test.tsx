import { describe, it, expect, beforeEach, afterEach } from "vitest";
import ReactDOM from "react-dom/client";
import { DetailPanel } from "./DetailPanel";
import type { Citation, Edge, TimelineNode } from "../../data/types";

// PLE-102 — verifies the redesigned docked detail panel renders the full
// PLE-101 anatomy: type border → tag pill → title → meta + state chip →
// status chips → description → key facts → connections → footer source line.

const NODE: TimelineNode = {
  id: "n-oswego",
  type: "project",
  title: "Oswego Project — Tulsa City Council final approval",
  date: "2026-06-17",
  dateStart: null,
  dateEnd: null,
  thread: "oswego",
  summary: "Pleet's first approved Tulsa printing job.",
  bodyMd: "**Tulsa City Council** votes to pass — final approval.",
  demandScore: 84,
  media: [],
  citationIds: ["c-prd"],
  confidence: "confirmed",
};

const OTHER: TimelineNode = {
  ...NODE,
  id: "n-janak",
  type: "person",
  title: "Timothy C. Janak",
  thread: "oswego",
  demandScore: null,
  citationIds: [],
};

const EDGES: Edge[] = [{ id: "e1", from: "n-oswego", to: "n-janak", kind: "owns", label: null }];

const CITATIONS: Citation[] = [
  {
    id: "c-prd",
    author: "Pleet LLC",
    titleSource: "Oswego Project approval",
    container1: null,
    container2: null,
    accessDate: null,
    isDoi: false,
    intextKey: "Pleet",
  },
];

describe("DetailPanel — PLE-102 redesigned anatomy", () => {
  let container: HTMLDivElement;
  let root: ReactDOM.Root;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    root.render(
      <DetailPanel
        node={NODE}
        citations={CITATIONS}
        edges={EDGES}
        nodes={[NODE, OTHER]}
        today="2026-06-17"
        onClose={() => {}}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
  });

  afterEach(() => {
    if (root) root.unmount();
    if (container.parentNode) document.body.removeChild(container);
  });

  it("renders as a docked complementary aside with a type-keyed border color", () => {
    const aside = container.querySelector("aside.detail-panel") as HTMLElement;
    expect(aside).not.toBeNull();
    expect(aside.getAttribute("role")).toBe("complementary");
    // project color from flowTheme.NODE_COLOR, surfaced as the --type custom prop.
    expect(aside.style.getPropertyValue("--type")).toBe("#57e0a8");
  });

  it("shows a type/thread tag pill and the title", () => {
    const tag = container.querySelector(".detail-panel__tag")!.textContent ?? "";
    expect(tag).toContain("Project");
    expect(tag).toContain("Oswego");
    expect(container.querySelector(".detail-panel__title")!.textContent).toContain(
      "Tulsa City Council final approval",
    );
  });

  it("shows the temporal-state chip (Today on the anchor date)", () => {
    const chip = container.querySelector(".detail-panel__state--today");
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toBe("Today");
  });

  it("renders the THEORETICAL demand chip", () => {
    expect(container.querySelector(".detail-panel__demand")!.textContent).toContain("84/100");
  });

  it("renders a scannable key-facts list (3–6 bullets)", () => {
    const facts = container.querySelectorAll(".detail-panel__facts li");
    expect(facts.length).toBeGreaterThanOrEqual(3);
    expect(facts.length).toBeLessThanOrEqual(6);
  });

  it("renders connections with the EdgeKind relation word and target title", () => {
    const conns = container.querySelector(".detail-panel__conns")!.textContent ?? "";
    expect(conns).toContain("Owns");
    expect(conns).toContain("Timothy C. Janak");
  });

  it("renders a footer source line linking to Works Cited", () => {
    const foot = container.querySelector(".detail-panel__foot")!.textContent ?? "";
    expect(foot).toContain("Source:");
    expect(foot).toContain("Works Cited (1)");
  });
});
