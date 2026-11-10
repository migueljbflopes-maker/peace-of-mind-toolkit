#!/usr/bin/env node
// Backlog A-06. Fails unless every file in supabase/migrations is recorded as
// applied on the local stack. Run through scripts/with-local-supabase.mjs.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { assertLocalUrl, stackFromEnv } from "./local-supabase.mjs";

const { dbUrl } = stackFromEnv();
if (!dbUrl) {
  console.error("[migrations] the local stack did not report DB_URL");
  process.exit(1);
}
assertLocalUrl(dbUrl.replace(/^postgres(ql)?:/, "http:"), "DB_URL");

const files = fs
  .readdirSync("supabase/migrations")
  .filter((name) => name.endsWith(".sql"))
  .map((name) => name.split("_")[0])
  .sort();

const applied = execFileSync(
  "psql",
  [dbUrl, "-At", "-c", "select version from supabase_migrations.schema_migrations order by version"],
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean);

const missing = files.filter((version) => !applied.includes(version));
console.log(`[migrations] ${files.length} files, ${applied.length} applied on the local stack`);
if (missing.length || applied.length !== files.length) {
  console.error(`[migrations] not applied: ${missing.join(", ") || "(count mismatch)"}`);
  process.exit(1);
}
