#!/usr/bin/env node
// Backlog F-08. The lockfiles of the edge functions.
//
//   npm run functions:check-locks   every function resolves from its deno.lock
//                                   and the lockfile would not change (CI)
//   npm run functions:lock          rewrite every deno.lock from scratch, after
//                                   changing a version in a deno.json
//
// Each function has a deno.json (its packages, at exact versions) and a
// deno.lock (every transitive package with its integrity hash, and the hash
// of every file imported by URL). The edge runtime resolves from that
// lockfile when it serves a function and when it bundles one for a deploy,
// but it does not complain when the lockfile is incomplete: it resolves what
// is missing on the spot, which is the floating this task removes. So the
// completeness is checked here, with Deno itself and `--frozen`.
//
// Deno 2.1 is required: it is the version edge-runtime 1.78 embeds, and it
// writes the lockfile format (version 4) that runtime reads.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DENO_SERIES = "2.1.";
const write = process.argv.includes("--write");
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const functionsDir = path.join(repoRoot, "supabase", "functions");

const version = spawnSync("deno", ["--version"], { encoding: "utf8" });
if (version.error || version.status !== 0) {
  console.error(`[functions] Deno ${DENO_SERIES}x is needed and was not found on PATH (https://deno.com).`);
  process.exit(1);
}
const found = /^deno (\S+)/.exec(version.stdout)?.[1] ?? "unknown";
if (!found.startsWith(DENO_SERIES)) {
  console.error(
    `[functions] Deno ${found} found, Deno ${DENO_SERIES}x is needed: it is what the edge runtime embeds, ` +
      "and another version may write a lockfile the runtime reads differently.",
  );
  process.exit(1);
}

const names = fs
  .readdirSync(functionsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .filter((entry) => fs.existsSync(path.join(functionsDir, entry.name, "index.ts")))
  .map((entry) => entry.name)
  .sort();

const failed = [];
for (const name of names) {
  const cwd = path.join(functionsDir, name);
  if (write) fs.rmSync(path.join(cwd, "deno.lock"), { force: true });
  const result = spawnSync("deno", ["cache", "--quiet", write ? "--frozen=false" : "--frozen", "index.ts"], {
    cwd,
    stdio: "inherit",
    // As in the edge runtime: the web app's package.json is not the function's.
    env: { ...process.env, DENO_NO_PACKAGE_JSON: "1" },
  });
  if (result.status === 0) console.log(`[functions] ${name}: ${write ? "locked" : "lockfile complete"}`);
  else failed.push(name);
}

if (failed.length) {
  console.error(`\n[functions] ${failed.length} of ${names.length} failed: ${failed.join(", ")}`);
  if (!write) console.error("[functions] After changing a dependency, run `npm run functions:lock` and commit the lockfiles.");
  process.exit(1);
}
console.log(`[functions] ${names.length} functions ${write ? "locked" : "checked"} with Deno ${found}`);
