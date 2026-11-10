import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { prepareFunctionsWorkdir, withoutTypeDeclarations } from "./local-functions.mjs";

describe("withoutTypeDeclarations", () => {
  it("adds ?no-dts to esm.sh imports, with either quote", () => {
    expect(withoutTypeDeclarations(`import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";`)).toBe(
      `import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?no-dts";`,
    );
    expect(withoutTypeDeclarations(`import Stripe from 'https://esm.sh/stripe@18.5.0';`)).toBe(
      `import Stripe from 'https://esm.sh/stripe@18.5.0?no-dts';`,
    );
  });

  it("leaves everything else alone", () => {
    const untouched = [
      `import { serve } from "https://deno.land/std@0.190.0/http/server.ts";`,
      `import x from "https://esm.sh/pkg@1?target=deno";`,
      `import { a } from "../_shared/rateLimit.ts";`,
      `const url = "https://api.openai.com/v1/chat/completions";`,
    ].join("\n");
    expect(withoutTypeDeclarations(untouched)).toBe(untouched);
  });
});

describe("prepareFunctionsWorkdir", () => {
  const target = path.join(os.tmpdir(), `amiready-functions-test-${process.pid}`);
  afterEach(() => fs.rmSync(target, { recursive: true, force: true }));

  it("copies every function and the config, and does not touch supabase/", () => {
    const source = path.resolve("supabase/functions/checkin-start/index.ts");
    const before = fs.readFileSync(source, "utf8");

    prepareFunctionsWorkdir(process.cwd(), target);

    const names = (dir) => fs.readdirSync(dir).sort();
    expect(names(path.join(target, "supabase/functions"))).toEqual(names("supabase/functions"));
    expect(fs.readFileSync(path.join(target, "supabase/config.toml"), "utf8")).toBe(
      fs.readFileSync("supabase/config.toml", "utf8"),
    );
    const copy = fs.readFileSync(path.join(target, "supabase/functions/checkin-start/index.ts"), "utf8");
    expect(copy).toBe(withoutTypeDeclarations(before));
    expect(copy).toContain("?no-dts");
    expect(fs.readFileSync(source, "utf8")).toBe(before);
    // No migrations are copied: the copy can serve functions and nothing else.
    expect(fs.existsSync(path.join(target, "supabase/migrations"))).toBe(false);
  });
});
