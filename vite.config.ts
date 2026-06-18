import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite + React SPA per PRD §10. Vitest config is colocated (test block) so the
// §6 dual-verification unit tests run via `npm test`.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.ts", "src/**/*.{test,spec}.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
