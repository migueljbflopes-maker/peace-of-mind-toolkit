#!/usr/bin/env node
// Runs a command with the environment of the local Supabase stack:
//
//   node scripts/with-local-supabase.mjs npm run test:e2e
//
// The web app is then built against the local stack instead of the hosted
// project in .env, and Playwright runs the "backend" project as well.
// It refuses to run if the stack reported by the CLI is not on this machine.

import { spawnSync } from "node:child_process";
import { readLocalStack } from "./local-supabase.mjs";

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Usage: node scripts/with-local-supabase.mjs <command> [args...]");
  process.exit(2);
}

let env;
try {
  env = readLocalStack();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

console.log(`[local-supabase] running against ${env.E2E_SUPABASE_URL}`);
const result = spawnSync(command, args, {
  stdio: "inherit",
  env: { ...process.env, ...env },
  shell: process.platform === "win32",
});
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
