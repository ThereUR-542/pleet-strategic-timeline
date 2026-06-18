import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { connectionEditorPlugin } from "./scripts/editor-plugin";

// Vite + React SPA per PRD §10. Vitest config is colocated (test block) so the
// §6 dual-verification unit tests run via `npm test`.
export default defineConfig({
  // connectionEditorPlugin is `apply: "serve"` → dev-only write endpoint for the
  // PLE-137 connection editor; absent from production builds.
  plugins: [react(), connectionEditorPlugin()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.ts", "src/**/*.{test,spec}.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
