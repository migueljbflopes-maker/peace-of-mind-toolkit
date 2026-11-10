import { defineConfig, devices } from "@playwright/test";
import { STORAGE_STATE } from "./e2e/backend/paths";

const PORT = 4173;

// Two kinds of browser test (backlog A-06):
//
//  - "mobile-chrome": needs no backend. Runs everywhere, always.
//  - "backend" (e2e/backend): signs in and uses a real database, auth and edge
//    functions on a LOCAL Supabase stack. It runs only when E2E_BACKEND=1,
//    which scripts/with-local-supabase.mjs sets after reading the running
//    stack. CI always runs it. e2e/global-setup.ts prints which projects run.
//
// The backend project is switched on by a flag rather than detected, so that
// a stack that failed to start in CI is an error and never a silent skip.
const BACKEND = process.env.E2E_BACKEND === "1";

const phone = { ...devices["Pixel 7"], channel: process.env.PW_CHANNEL || undefined };

// Browser tests run against the production build, because the service
// worker and offline behaviour only exist in a real build.
// Set PW_CHANNEL=chrome to use a system Chrome instead of the bundled Chromium.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile-chrome",
      testIgnore: /e2e\/backend\//,
      use: phone,
    },
    ...(BACKEND
      ? [
          {
            // Signs in once through the real sign-in page and saves the session.
            name: "backend-setup",
            testDir: "./e2e/backend",
            testMatch: /.*\.setup\.ts/,
            use: { ...phone, locale: "en-US" },
          },
          {
            name: "backend",
            testDir: "./e2e/backend",
            dependencies: ["backend-setup"],
            use: { ...phone, locale: "en-US", storageState: STORAGE_STATE },
          },
        ]
      : []),
  ],
  webServer: {
    // The build reads VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from
    // the environment when they are set there (they win over .env), which is
    // how the backend run gets a build that talks to the local stack.
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    // Never reuse a server for a backend run: it may serve a build made for
    // the hosted project.
    reuseExistingServer: !process.env.CI && !BACKEND,
    timeout: 120_000,
  },
});
