import { defineConfig, devices } from "@playwright/test";

// TEMPORARY (backlog A-13): the old conditions of e2e/frozen-features.spec.ts,
// with nothing aborted and no proxy, to see which request keeps the network
// busy in CI. Serves the dist/ the step before built for the local stack.
export default defineConfig({
  testDir: ".",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: { ...devices["Pixel 7"], channel: process.env.PW_CHANNEL || undefined, baseURL: "http://127.0.0.1:4174", trace: process.env.A13_TRACE === "on" ? "on" : "retain-on-failure" },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4174 --strictPort",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
    cwd: "..",
  },
});
