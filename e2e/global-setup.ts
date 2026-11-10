import fs from "node:fs";
import path from "node:path";
import type { FullConfig } from "@playwright/test";
import { stackFromEnv } from "../scripts/local-supabase.mjs";

// Runs once, after the web server has built the app. It says which projects
// are running, and when the backend project is on it proves that the build
// under test talks to the local Supabase stack and not to the hosted project.
export default function globalSetup(config: FullConfig) {
  const backend = config.projects.some((project) => project.name === "backend");

  if (!backend) {
    console.log(
      "\n[e2e] project mobile-chrome: RUNNING (needs no backend)\n" +
        "[e2e] project backend: NOT RUNNING, E2E_BACKEND is not set. It needs the local Supabase stack;\n" +
        "      run `npm run test:e2e:backend` with the stack started (see README). CI always runs it.\n",
    );
    return;
  }

  const stack = stackFromEnv();
  const assets = path.resolve(process.cwd(), "dist/assets");
  const bundle = fs
    .readdirSync(assets)
    .filter((file) => file.endsWith(".js"))
    .map((file) => fs.readFileSync(path.join(assets, file), "utf8"))
    .join("\n");

  const config_toml = fs.readFileSync(path.resolve(process.cwd(), "supabase/config.toml"), "utf8");
  const hostedRef = /^project_id\s*=\s*"([^"]+)"/m.exec(config_toml)?.[1];
  const hosted = bundle.match(/https:\/\/[a-z0-9]{20}\.supabase\.co/g) ?? [];
  if (hosted.length || (hostedRef && bundle.includes(hostedRef))) {
    throw new Error(
      `[e2e] The build in dist/ points at a hosted Supabase project (${hosted[0] ?? hostedRef}). ` +
        "Backend tests only run against a build made for the local stack: stop any preview server " +
        "left running and use `npm run test:e2e:backend`.",
    );
  }
  if (!bundle.includes(stack.url)) {
    throw new Error(`[e2e] The build in dist/ does not contain the local Supabase URL ${stack.url}.`);
  }

  console.log(
    "\n[e2e] project mobile-chrome: RUNNING\n" +
      `[e2e] project backend: RUNNING against the local Supabase stack at ${stack.url}\n` +
      "[e2e] the build under test contains the local URL and no hosted project URL\n",
  );
}
