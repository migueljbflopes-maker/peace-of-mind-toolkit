// After a deploy: ask every deployed edge function for a CORS preflight and
// fail if any of them does not boot (backlog F-08).
//
// OPTIONS has no side effects: each handler answers it before reading the
// body or touching the database. A function whose imports do not resolve
// never reaches its handler and the platform answers 5xx for it.
//
//   node scripts/smoke-deployed-functions.mjs <project-ref> [function ...]
//
// With no function names, every directory under supabase/functions is checked.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FUNCTIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../supabase/functions");

export function listFunctions(dir = FUNCTIONS_DIR) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .filter((entry) => fs.existsSync(path.join(dir, entry.name, "index.ts")))
    .map((entry) => entry.name)
    .sort();
}

/**
 * booted:   the function's own handler answered.
 * unknown:  the gateway refused the call before the function ran (a function
 *           that requires a signed-in caller), so booting is not shown.
 * failed:   the platform answered for a function that did not start.
 */
export function classify(status, body) {
  if (/BOOT_ERROR|WORKER_ERROR|WORKER_LIMIT/.test(body) || status >= 500) return "failed";
  if (status === 200 || status === 204) return "booted";
  if (status === 401 || status === 403) return "unknown";
  return "failed";
}

async function preflight(url) {
  let last = { status: 0, body: "no answer" };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, { method: "OPTIONS", signal: AbortSignal.timeout(30_000) });
      last = { status: response.status, body: (await response.text()).slice(0, 300) };
      if (classify(last.status, last.body) !== "failed") return last;
    } catch (error) {
      last = { status: 0, body: String(error) };
    }
    // A cold start can time out once; a function that does not boot keeps failing.
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  return last;
}

async function main() {
  const [ref, ...only] = process.argv.slice(2);
  if (!/^[a-z0-9]{20}$/.test(ref ?? "")) {
    console.error("usage: smoke-deployed-functions.mjs <project-ref> [function ...]");
    process.exit(2);
  }
  const known = listFunctions();
  const names = only.length ? only : known;
  const strangers = names.filter((name) => !known.includes(name));
  if (strangers.length) {
    console.error(`not a function in supabase/functions: ${strangers.join(", ")}`);
    process.exit(2);
  }

  const counts = { booted: 0, unknown: 0, failed: 0 };
  for (const name of names) {
    const { status, body } = await preflight(`https://${ref}.supabase.co/functions/v1/${name}`);
    const verdict = classify(status, body);
    counts[verdict]++;
    console.log(`${verdict.padEnd(8)} ${String(status).padEnd(4)} ${name}${verdict === "booted" ? "" : `  ${body.replace(/\s+/g, " ")}`}`);
  }
  console.log(`\n${counts.booted} booted, ${counts.unknown} not shown (caller must be signed in), ${counts.failed} failed`);
  if (counts.failed > 0) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
