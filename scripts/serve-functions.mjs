#!/usr/bin/env node
// Serves the edge functions on the local Supabase stack for the browser tests
// (npm run supabase:functions). Dummy provider keys come from
// e2e/backend/functions.env. See scripts/local-functions.mjs for why a copy
// of the functions is served.

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareFunctionsWorkdir } from "./local-functions.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(repoRoot, "node_modules", ".cache", "amiready-e2e-supabase");
const { workdir, rewritten } = prepareFunctionsWorkdir(repoRoot, target);
console.log(`[functions] serving a copy of supabase/functions from ${workdir} (${rewritten} files with esm.sh imports rewritten)`);

const child = spawn(
  "supabase",
  ["--workdir", workdir, "functions", "serve", "--env-file", path.join(repoRoot, "e2e/backend/functions.env")],
  { stdio: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (error) => {
  console.error(`[functions] could not run the Supabase CLI: ${error.message}`);
  process.exit(1);
});
