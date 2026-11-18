import fs from "node:fs";
import path from "node:path";
import type { FullConfig } from "@playwright/test";
import { stackFromEnv } from "../scripts/local-supabase.mjs";
import { NO_BACKEND_SUPABASE_URL, hostedSupabaseIn } from "./build-env";

// Runs once, after the web server has built the app. It proves that the
// build under test does not point at a hosted Supabase project, whichever
// projects run (backlog A-13), and says which projects are running. When the
// backend project is on, the build must talk to the local Supabase stack.
export default function globalSetup(config: FullConfig) {
  const backend = config.projects.some((project) => project.name === "backend");

  const assets = path.resolve(process.cwd(), "dist/assets");
  const bundle = fs
    .readdirSync(assets)
    .filter((file) => file.endsWith(".js"))
    .map((file) => fs.readFileSync(path.join(assets, file), "utf8"))
    .join("\n");

  const config_toml = fs.readFileSync(path.resolve(process.cwd(), "supabase/config.toml"), "utf8");
  const hostedRef = /^project_id\s*=\s*"([^"]+)"/m.exec(config_toml)?.[1];
  const hosted = hostedSupabaseIn(bundle, hostedRef);
  if (hosted.length) {
    throw new Error(
      `[e2e] The build in dist/ points at a hosted Supabase project (${hosted.join(", ")}). ` +
        "Browser tests never run against the hosted project: it is production. Run them with " +
        "`npm run test:e2e` or `npm run test:e2e:backend`, which build the app for this machine " +
        "(playwright.config.ts, e2e/build-env.ts), and check that nothing sets VITE_SUPABASE_URL to a hosted address.",
    );
  }

  if (!backend) {
    if (!bundle.includes(NO_BACKEND_SUPABASE_URL)) {
      throw new Error(
        `[e2e] The build in dist/ does not contain ${NO_BACKEND_SUPABASE_URL}, the address a build ` +
          "for tests without a backend is made with (e2e/build-env.ts).",
      );
    }
    console.log(
      "\n[e2e] project mobile-chrome: RUNNING (needs no backend)\n" +
        "[e2e] project backend: NOT RUNNING, E2E_BACKEND is not set. It needs the local Supabase stack;\n" +
        "      run `npm run test:e2e:backend` with the stack started (see README). CI always runs it.\n" +
        `[e2e] the build under test points at ${NO_BACKEND_SUPABASE_URL} and at no hosted project\n`,
    );
    return;
  }

  const stack = stackFromEnv();
  if (!bundle.includes(stack.url)) {
    throw new Error(`[e2e] The build in dist/ does not contain the local Supabase URL ${stack.url}.`);
  }

  console.log(
    "\n[e2e] project mobile-chrome: RUNNING\n" +
      `[e2e] project backend: RUNNING against the local Supabase stack at ${stack.url}\n` +
      "[e2e] the build under test contains the local URL and no hosted project URL\n",
  );
}
