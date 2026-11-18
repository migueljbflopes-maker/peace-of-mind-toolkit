// Backlog F-08. The dependencies of the edge functions are pinned.
//
// What is tested must be what is deployed, so no dependency of a function may
// float: packages come from npm at an exact version declared in the
// function's own deno.json, and a deno.lock next to it records every
// transitive package and the hash of every file imported by URL. This test
// checks the declarations; CI checks with Deno itself that each lockfile is
// complete (`npm run functions:check-locks`).

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const FUNCTIONS_DIR = path.resolve("supabase/functions");
const EXACT = /^\d+\.\d+\.\d+$/;
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*)(["'])([^"'\n]+)\1/g;

const functionNames = fs
  .readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .map((entry) => entry.name)
  .sort();

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    return /\.(ts|tsx|js|mjs)$/.test(entry.name) ? [file] : [];
  });
}

function importsOf(file) {
  return [...fs.readFileSync(file, "utf8").matchAll(IMPORT)].map((match) => match[2]);
}

/** Every specifier a function imports, following relative imports (into _shared too). */
function specifiersOf(name) {
  const seen = new Set();
  const specifiers = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const specifier of importsOf(file)) {
      if (specifier.startsWith(".")) visit(path.resolve(path.dirname(file), specifier));
      else specifiers.add(specifier);
    }
  };
  visit(path.join(FUNCTIONS_DIR, name, "index.ts"));
  return [...specifiers].sort();
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

describe("edge function dependencies are pinned", () => {
  it("finds the functions", () => {
    expect(functionNames).toContain("panic-trigger");
    expect(functionNames.length).toBeGreaterThan(20);
  });

  it("no file imports from esm.sh, and every URL import names an exact version", () => {
    const problems = [];
    for (const file of sourceFiles(FUNCTIONS_DIR)) {
      for (const specifier of importsOf(file)) {
        if (!/^https?:/.test(specifier)) continue;
        const exact = /^https:\/\/deno\.land\/(std|x\/[\w-]+)@v?\d+\.\d+\.\d+\//.test(specifier);
        if (!exact) problems.push(`${path.relative(FUNCTIONS_DIR, file)}: ${specifier}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it("no file names a package version itself: versions live in deno.json", () => {
    const problems = [];
    for (const file of sourceFiles(FUNCTIONS_DIR)) {
      for (const specifier of importsOf(file)) {
        if (/^(npm|jsr):/.test(specifier)) problems.push(`${path.relative(FUNCTIONS_DIR, file)}: ${specifier}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it.each(functionNames)("%s declares exactly the packages it imports, at exact versions, and locks them", (name) => {
    const dir = path.join(FUNCTIONS_DIR, name);
    expect(fs.existsSync(path.join(dir, "deno.json")), `${name}/deno.json`).toBe(true);
    expect(fs.existsSync(path.join(dir, "deno.lock")), `${name}/deno.lock`).toBe(true);

    const declared = readJson(path.join(dir, "deno.json")).imports ?? {};
    const specifiers = specifiersOf(name);
    const bare = specifiers.filter((specifier) => !/^(https?|node):/.test(specifier));
    const urls = specifiers.filter((specifier) => /^https?:/.test(specifier));

    expect(Object.keys(declared).sort()).toEqual(bare);
    for (const [alias, target] of Object.entries(declared)) {
      const match = /^npm:(.+)@([^@]+)$/.exec(target);
      expect(match, `${name}: ${alias} -> ${target} must be an npm: specifier`).not.toBeNull();
      expect(match[1]).toBe(alias);
      expect(match[2], `${name}: ${target} must name an exact version`).toMatch(EXACT);
    }

    // The lockfile format of Deno 2.1, which is what edge-runtime 1.78 embeds.
    const lock = readJson(path.join(dir, "deno.lock"));
    expect(lock.version).toBe("4");
    const targets = Object.values(declared).sort();
    expect([...(lock.workspace?.dependencies ?? [])].sort()).toEqual(targets);
    for (const target of targets) {
      const version = target.slice(target.lastIndexOf("@") + 1);
      expect(lock.specifiers?.[target], `${name}/deno.lock resolves ${target}`).toBe(version);
    }
    for (const url of urls) {
      expect(lock.remote?.[url], `${name}/deno.lock has the hash of ${url}`).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("every function uses the same version of a package", () => {
    const versions = {};
    for (const name of functionNames) {
      const file = path.join(FUNCTIONS_DIR, name, "deno.json");
      if (!fs.existsSync(file)) continue;
      for (const [alias, target] of Object.entries(readJson(file).imports ?? {})) {
        (versions[alias] ??= new Set()).add(target);
      }
    }
    for (const [alias, targets] of Object.entries(versions)) {
      expect([...targets], `versions of ${alias}`).toHaveLength(1);
    }
  });
});
