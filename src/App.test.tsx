import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ReactDOM from "react-dom/client";
import TIMELINE_DATA from "./data/content";
import { LANES } from "./data/lanes";

// PLE-136: content now loads asynchronously from /data/*.yaml. jsdom has no
// server to fetch from, so we mock the loader with the real content — the guard
// still proves the app mounts a non-empty shell once data resolves.
vi.mock("./data/loader", () => ({
  loadTimelineBundle: async () => ({ data: TIMELINE_DATA, lanes: LANES }),
}));

import { App } from "./App";

async function flush(container: HTMLElement, selector: string, tries = 60) {
  for (let i = 0; i < tries; i++) {
    if (container.querySelector(selector)) return;
    await new Promise((r) => setTimeout(r, 5));
  }
}

describe("App render smoke test (PLE-47 guard)", () => {
  let container: HTMLDivElement;
  let root: ReactDOM.Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) root.unmount();
    if (container.parentNode) document.body.removeChild(container);
  });

  it("renders without throwing (blank-shell regression check)", async () => {
    let threwError = false;
    try {
      root = ReactDOM.createRoot(container);
      root.render(<App />);
      await flush(container, ".flow-shell");
    } catch (e) {
      threwError = true;
    }
    expect(threwError).toBe(false);
  });

  // Catches the PLE-47 "blank shell" pattern: the app renders without error
  // but produces an empty DOM with no navigable content.
  it("renders non-empty shell with navigation tabs", async () => {
    root = ReactDOM.createRoot(container);
    root.render(<App />);
    await flush(container, ".flow-shell");

    const shell = container.querySelector(".flow-shell");
    expect(shell).not.toBeNull();
    expect(shell!.children.length).toBeGreaterThan(0);

    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBeGreaterThanOrEqual(2);

    const tabLabels = Array.from(tabs).map((t) => t.textContent ?? "");
    expect(tabLabels.some((l) => l.includes("Flow Chart"))).toBe(true);
    expect(tabLabels.some((l) => l.includes("Strategic Summary"))).toBe(true);
  });
});
