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

// ── PLE-155 person modal variant ─────────────────────────────────────────────
const PERSON: TimelineNode = {
  id: "n-bo",
  type: "person",
  title: "Bo Jett — Senior VP, IBC Bank",
  date: null,
  dateStart: null,
  dateEnd: null,
  thread: "financial_interest",
  summary: "Lender.",
  bodyMd: "Bo Jett body.",
  demandScore: null,
  media: [],
  citationIds: [],
  confidence: "unconfirmed",
  person: {
    name: "Bo Jett",
    role: "Senior VP, Commercial Lending, IBC Bank",
    initialAppearanceDate: "2026-04-23",
    threads: ["financial_interest"],
    modalGraphic: null,
    note: "A bank's willingness to finance a 3D-printed residence is an independent market signal.",
    relationships: [
      { date: "2026-04-23", scheduled: false, description: "Introduced at Meet Bo & LG.", connectedNodeIds: ["n-meet"], connectedNodeTitles: ["Meet Bo & LG"] },
      { date: null, scheduled: false, description: "Financing Brady's home.", connectedNodeIds: [], connectedNodeTitles: ["Brady's Home"] },
    ],
  },
};
const PEER: TimelineNode = { ...PERSON, id: "n-meet", type: "event", title: "Meet Bo & LG", person: undefined, confidence: "confirmed" };

describe("DetailPanel — PLE-155 person variant", () => {
  let container: HTMLDivElement;
  let root: ReactDOM.Root;
  const navigated: string[] = [];

  beforeEach(async () => {
    navigated.length = 0;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = ReactDOM.createRoot(container);
    root.render(
      <DetailPanel
        node={PERSON}
        citations={[]}
        edges={[]}
        nodes={[PERSON, PEER]}
        today="2026-06-19"
        onClose={() => {}}
        onNavigate={(id) => navigated.push(id)}
      />,
    );
    await new Promise((r) => setTimeout(r, 30));
  });
  afterEach(() => {
    if (root) root.unmount();
    if (container.parentNode) document.body.removeChild(container);
  });

  it("shows name, role caption, and first-appearance anchor date", () => {
    expect(container.querySelector(".detail-panel__title")!.textContent).toBe("Bo Jett");
    expect(container.querySelector(".detail-panel__role")!.textContent).toContain("IBC Bank");
    expect(container.querySelector(".detail-panel__meta")!.textContent).toContain("First appearance");
    expect(container.querySelector(".detail-panel__meta")!.textContent).toContain("2026");
  });

  it("surfaces the carried identity/market-signal note", () => {
    const note = container.querySelector(".detail-panel__note")!.textContent ?? "";
    expect(note).toContain("market signal");
  });

  it("renders the relationship graphic and a chronological interaction history", () => {
    expect(container.querySelector(".person-graphic")).not.toBeNull();
    const rows = container.querySelectorAll(".person-timeline__row");
    expect(rows.length).toBe(2);
    // dated row sorts before the undated one
    expect(rows[0].textContent).toContain("Apr 23, 2026");
    expect(rows[1].textContent).toContain("Undated");
  });

  it("navigates when a node-backed connection chip is clicked", () => {
    const chip = container.querySelector(".person-graphic__chip--link") as HTMLButtonElement;
    expect(chip).not.toBeNull();
    chip.click();
    expect(navigated).toContain("n-meet");
  });

  it("does not render the generic Connections section for a person", () => {
    const labels = [...container.querySelectorAll(".detail-panel__section-label")].map((n) => n.textContent);
    expect(labels).not.toContain("Connections");
    expect(labels).toContain("Relationship graphic");
  });
});
