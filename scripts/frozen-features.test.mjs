// Backlog A-07. The features frozen in A-03 are not in the product: no route,
// no function, no call, no configuration, and no reference to the AI gateway
// the expert chat used. Read from the sources, so it runs without a build;
// e2e/frozen-features.spec.ts checks the built app in a browser.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FROZEN_FUNCTIONS, FROZEN_ROUTES, FROZEN_STRINGS, FROZEN_TABLES } from "./frozen-features.mjs";

const ROOT = path.resolve(".");
const FUNCTIONS_DIR = path.join(ROOT, "supabase/functions");

// Every file git knows about or would add: nothing ignored, nothing built.
const repoFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  cwd: ROOT,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
})
  .split("\n")
  .filter(Boolean)
  .filter((file) => fs.existsSync(path.join(ROOT, file)));

const TEXT = /\.(ts|tsx|mjs|js|json|md|toml|yml|yaml|sql|html|css|env|lock)$|(^|\/)\.env[^/]*$/;
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const textFiles = repoFiles.filter((file) => TEXT.test(file));
const appSources = repoFiles.filter((file) => /^src\/.*\.(ts|tsx)$/.test(file));

function existingFunctions() {
  return fs
    .readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name);
}

describe("frozen features are removed (backlog A-07)", () => {
  it("reads the repository", () => {
    expect(appSources).toContain("src/App.tsx");
    expect(textFiles).toContain("supabase/config.toml");
    expect(existingFunctions()).toContain("panic-trigger");
  });

  it("the route table has no frozen route", () => {
    const paths = [...read("src/App.tsx").matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]);
    expect(paths).toContain("/panic");
    expect(paths.filter((routePath) => FROZEN_ROUTES.includes(routePath))).toEqual([]);
  });

  it("no source file of the app names a frozen route", () => {
    const found = [];
    for (const file of appSources) {
      const source = read(file);
      for (const route of FROZEN_ROUTES) {
        // The path as a string or at the start of one: "/products", `/products?q=`.
        const literal = new RegExp(`["'\`=]${route.replace(/[/]/g, "\\/")}(?![\\w-])`);
        if (literal.test(source)) found.push(`${file}: ${route}`);
      }
    }
    expect(found).toEqual([]);
  });

  it("no frozen edge function exists, with or without files in it", () => {
    expect(existingFunctions().filter((name) => FROZEN_FUNCTIONS.includes(name))).toEqual([]);
  });

  it("supabase/config.toml configures only functions that exist", () => {
    const configured = [...read("supabase/config.toml").matchAll(/^\[functions\.([^\]]+)\]/gm)].map((m) => m[1]);
    expect(configured).toContain("panic-trigger");
    const existing = existingFunctions();
    expect(configured.filter((name) => !existing.includes(name))).toEqual([]);
  });

  it("the app calls only edge functions that exist", () => {
    const existing = existingFunctions();
    const missing = [];
    for (const file of appSources) {
      for (const match of read(file).matchAll(/functions\s*\.invoke\(\s*["'`]([a-z0-9-]+)["'`]|functions\/v1\/([a-z0-9-]+)/g)) {
        const name = match[1] ?? match[2];
        if (!existing.includes(name)) missing.push(`${file}: ${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("nothing but this list names a frozen edge function", () => {
    const allowed = new Set([
      "scripts/frozen-features.mjs",
      // The record of the decision and of what was removed.
      "docs/backlog.md",
    ]);
    const found = [];
    for (const file of textFiles) {
      if (allowed.has(file)) continue;
      const source = read(file);
      for (const name of FROZEN_FUNCTIONS) {
        if (new RegExp(`(?<![\\w-])${name}(?![\\w-])`).test(source)) found.push(`${file}: ${name}`);
      }
    }
    expect(found).toEqual([]);
  });

  it("the app reads and writes no table of a frozen feature", () => {
    const found = [];
    for (const file of appSources) {
      // The generated description of the database lists every table.
      if (file === "src/integrations/supabase/types.ts") continue;
      const source = read(file);
      for (const table of FROZEN_TABLES) {
        if (new RegExp(`["'\`]${table}["'\`]`).test(source)) found.push(`${file}: ${table}`);
      }
    }
    expect(found).toEqual([]);
  });

  it("no reference to the AI gateway of the expert chat or to its key remains", () => {
    // docs/backlog.md states the acceptance criterion and so has to name them.
    const found = [];
    for (const file of textFiles) {
      if (file === "docs/backlog.md") continue;
      const source = read(file);
      for (const needle of FROZEN_STRINGS) {
        if (source.includes(needle)) found.push(`${file}: ${needle}`);
      }
    }
    expect(found).toEqual([]);
  });

  it("no migration schedules a job for a function that does not exist", () => {
    const existing = existingFunctions();
    const scheduled = [];
    for (const file of repoFiles.filter((name) => /^supabase\/migrations\/.*\.sql$/.test(name))) {
      const sql = read(file);
      if (!/cron\.schedule/i.test(sql)) continue;
      for (const match of sql.matchAll(/functions\/v1\/([a-z0-9-]+)/g)) scheduled.push(match[1]);
    }
    expect(scheduled).toEqual(["send-scheduled-emails"]);
    expect(scheduled.filter((name) => !existing.includes(name))).toEqual([]);
  });

  it("the premium feature list in both languages promises no alerts from news", async () => {
    const { translations } = await import("../src/i18n/translations.ts");
    for (const locale of ["en", "pt"]) {
      expect(Object.keys(translations[locale])).not.toContain("alerts");
      expect(Object.keys(translations[locale].premium.features)).not.toContain("alerts");
      expect(Object.keys(translations[locale].nav)).not.toContain("products");
      expect(Object.keys(translations[locale].nav)).not.toContain("news");
      expect(translations[locale].paywall.description).not.toMatch(/alert/i);
    }
  });

  it("the entry that replaced the expert chat in the risk offer has its texts in both languages", async () => {
    const { translations } = await import("../src/i18n/translations.ts");
    expect(translations.en.riskOffer).toEqual({ redFolderTitle: "Red Folder", redFolderSubtitle: "Printable offline PDF" });
    expect(translations.pt.riskOffer).toEqual({ redFolderTitle: "Red Folder", redFolderSubtitle: "PDF offline imprimível" });
    const modal = read("src/components/RiskOfferModal.tsx");
    expect(modal.match(/t\.riskOffer\.redFolderTitle/g)).toHaveLength(2);
    expect(modal).not.toMatch(/Printable offline PDF|PDF offline imprimível/);
  });
});
