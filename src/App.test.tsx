import { describe, it, expect, beforeEach, afterEach } from "vitest";
import ReactDOM from "react-dom/client";
import { App } from "./App";

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
      await new Promise((resolve) => setTimeout(resolve, 50));
    } catch (e) {
      threwError = true;
    }
    expect(threwError).toBe(false);
  });
});
