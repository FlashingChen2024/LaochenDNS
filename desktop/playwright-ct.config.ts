import { defineConfig } from "@playwright/experimental-ct-react";
import react from "@vitejs/plugin-react";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    viewport: { width: 1200, height: 800 },
    channel: "msedge",
  },
  ctViteConfig: {
    plugins: [react()],
  },
});
