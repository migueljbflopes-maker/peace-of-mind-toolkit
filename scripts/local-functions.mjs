// Backlog A-06. Serving the edge functions to the local test stack.
//
// The functions import their dependencies from esm.sh by URL. esm.sh attaches
// TypeScript declarations to those modules, the local edge runtime loads the
// declarations too, and the ones for supabase-js 2.57.2 point at a file that
// no longer exists (its storage-js dependency floats to a newer release with a
// different layout). Every function then fails to boot locally with
// "Module not found ... storage-js@2.99.1/dist/module/StorageClient".
//
// Until the functions pin their dependencies (backlog F-08), the test run
// serves a COPY of supabase/functions in which each esm.sh import asks for
// the same module without declarations (`?no-dts`). The code that runs is the
// same; nothing under supabase/ is changed, so nothing here can be deployed.

import fs from "node:fs";
import path from "node:path";

/** Adds `?no-dts` to every esm.sh import URL that has no query string yet. */
export function withoutTypeDeclarations(source) {
  return source.replace(/(["'])(https:\/\/esm\.sh\/[^"'?\s]+)\1/g, "$1$2?no-dts$1");
}

/**
 * Copies supabase/config.toml and supabase/functions into `target/supabase`,
 * rewriting the imports. Returns the directory to pass to `supabase --workdir`.
 */
export function prepareFunctionsWorkdir(repoRoot, target) {
  const source = path.join(repoRoot, "supabase");
  const out = path.join(target, "supabase");
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  // The same config: project id (the local stack to join) and verify_jwt per function.
  fs.copyFileSync(path.join(source, "config.toml"), path.join(out, "config.toml"));
  fs.cpSync(path.join(source, "functions"), path.join(out, "functions"), { recursive: true });

  let rewritten = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
        const before = fs.readFileSync(file, "utf8");
        const after = withoutTypeDeclarations(before);
        if (after !== before) {
          fs.writeFileSync(file, after);
          rewritten += 1;
        }
      }
    }
  };
  walk(path.join(out, "functions"));
  return { workdir: target, rewritten };
}
