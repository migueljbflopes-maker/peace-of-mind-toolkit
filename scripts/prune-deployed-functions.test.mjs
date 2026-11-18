// Backlog A-07. The step that deletes removed edge functions from the hosted
// project deletes exactly the deployed functions that have no directory in
// the repository, and nothing at all when it cannot be sure of the list.

import { describe, expect, it } from "vitest";
import { plan, prune } from "./prune-deployed-functions.mjs";

const REF = "abcdefghijklmnopqrst";
const LOCAL = ["checkin-cron", "panic-trigger", "stripe-webhook"];
const deployed = (...slugs) => slugs.map((slug) => ({ id: slug, slug, name: slug, status: "ACTIVE" }));

/** A stand-in for the Management API that records every call. */
function fakeApi(initial, { listStatus = 200, deleteStatus = 200, listBody } = {}) {
  let current = [...initial];
  const calls = [];
  const fetchImpl = async (url, { method, headers }) => {
    calls.push(`${method} ${new URL(url).pathname}`);
    expect(new URL(url).origin).toBe("https://api.supabase.com");
    expect(headers.Authorization).toBe("Bearer token");
    if (method === "GET") {
      return { status: listStatus, text: async () => listBody ?? JSON.stringify(current) };
    }
    if (deleteStatus === 200) {
      const slug = url.split("/").pop();
      current = current.filter((entry) => entry.slug !== slug);
    }
    return { status: deleteStatus, text: async () => "{}" };
  };
  return { fetchImpl, calls, deletes: () => calls.filter((call) => call.startsWith("DELETE")) };
}

async function run(api, options = {}) {
  const lines = [];
  const code = await prune({
    ref: REF,
    token: "token",
    local: LOCAL,
    fetchImpl: api.fetchImpl,
    log: (line) => lines.push(line),
    ...options,
  });
  return { code, output: lines.join("\n") };
}

describe("plan: which deployed functions to delete", () => {
  it("is the deployed functions that have no directory, and only those", () => {
    expect(plan(deployed(...LOCAL, "old-news", "old-chat"), LOCAL)).toEqual({
      remove: ["old-chat", "old-news"],
    });
  });

  it("is nothing when the project has exactly the functions of the repository", () => {
    expect(plan(deployed(...LOCAL), LOCAL)).toEqual({ remove: [] });
  });

  it("never contains a function of the repository", () => {
    const { remove } = plan(deployed(...LOCAL, ...LOCAL, "old-one"), LOCAL);
    expect(remove).toEqual(["old-one"]);
    expect(remove.filter((slug) => LOCAL.includes(slug))).toEqual([]);
  });

  it("refuses when the repository has no functions", () => {
    expect(plan(deployed("a", "b"), []).refuse).toMatch(/refusing/);
    expect(plan(deployed("a", "b"), undefined).refuse).toMatch(/refusing/);
  });

  it("refuses when a function of the repository is not deployed: wrong project or partial list", () => {
    expect(plan(deployed("panic-trigger", "old-news"), LOCAL).refuse).toMatch(/checkin-cron, stripe-webhook/);
    expect(plan([], LOCAL).refuse).toMatch(/lacks 3/);
  });

  it("refuses an answer that is not a list of functions", () => {
    expect(plan({ message: "Unauthorized" }, LOCAL).refuse).toMatch(/not a list/);
    expect(plan([...deployed(...LOCAL), { name: "no slug" }], LOCAL).refuse).toMatch(/no usable slug/);
    expect(plan([...deployed(...LOCAL), { slug: "--project-ref" }], LOCAL).refuse).toMatch(/no usable slug/);
    expect(plan([...deployed(...LOCAL), { slug: "../x" }], LOCAL).refuse).toMatch(/no usable slug/);
    expect(plan([...deployed(...LOCAL), null], LOCAL).refuse).toMatch(/no usable slug/);
  });

  it("leaves alone a function the platform already marks as removed", () => {
    expect(plan([...deployed(...LOCAL), { slug: "gone", status: "REMOVED" }], LOCAL)).toEqual({ remove: [] });
  });
});

describe("prune: against the Management API", () => {
  it("deletes the functions that are not in the repository, says which, and checks the project afterwards", async () => {
    const api = fakeApi(deployed(...LOCAL, "old-news", "old-chat"));
    const { code, output } = await run(api);
    expect(code).toBe(0);
    expect(api.calls).toEqual([
      `GET /v1/projects/${REF}/functions`,
      `DELETE /v1/projects/${REF}/functions/old-chat`,
      `DELETE /v1/projects/${REF}/functions/old-news`,
      `GET /v1/projects/${REF}/functions`,
    ]);
    expect(output).toContain("deleting  old-chat");
    expect(output).toContain("deleted   old-news");
    expect(output).toContain("exactly the 3 functions of the repository");
  });

  it("deletes nothing when there is nothing to delete", async () => {
    const api = fakeApi(deployed(...LOCAL));
    const { code } = await run(api);
    expect(code).toBe(0);
    expect(api.deletes()).toEqual([]);
  });

  it("with --dry-run says what it would delete and deletes nothing", async () => {
    const api = fakeApi(deployed(...LOCAL, "old-news"));
    const { code, output } = await run(api, { dryRun: true });
    expect(code).toBe(0);
    expect(output).toContain("would delete  old-news");
    expect(api.deletes()).toEqual([]);
  });

  it("deletes nothing and fails when the list cannot be read", async () => {
    for (const api of [
      fakeApi(deployed(...LOCAL, "old-news"), { listStatus: 401 }),
      fakeApi(deployed(...LOCAL, "old-news"), { listStatus: 500 }),
      fakeApi([], { listBody: "<html>bad gateway</html>" }),
      fakeApi([], { listBody: '{"message":"not found"}' }),
      { fetchImpl: async () => { throw new Error("network down"); }, deletes: () => [] },
    ]) {
      const { code, output } = await run(api);
      expect(code).toBe(1);
      expect(output).toContain("nothing deleted");
      expect(api.deletes()).toEqual([]);
    }
  });

  it("deletes nothing and fails when the project lacks a function of the repository", async () => {
    const api = fakeApi(deployed("panic-trigger", "old-news"));
    const { code, output } = await run(api);
    expect(code).toBe(1);
    expect(output).toContain("nothing deleted");
    expect(api.deletes()).toEqual([]);
  });

  it("deletes nothing when supabase/functions is empty", async () => {
    const api = fakeApi(deployed(...LOCAL));
    const { code } = await run(api, { local: [] });
    expect(code).toBe(1);
    expect(api.deletes()).toEqual([]);
  });

  it("fails when a delete is refused or the function is still there afterwards", async () => {
    const api = fakeApi(deployed(...LOCAL, "old-news"), { deleteStatus: 403 });
    const { code, output } = await run(api);
    expect(code).toBe(1);
    expect(output).toContain("FAILED    old-news: 403");
    expect(output).toContain("still deployed and not in the repository: old-news");
  });

  it("does not call the API without a token or with something that is not a project ref", async () => {
    const api = fakeApi(deployed(...LOCAL, "old-news"));
    expect((await run(api, { token: "" })).code).toBe(2);
    expect((await run(api, { ref: "--help" })).code).toBe(2);
    expect(api.calls).toEqual([]);
  });
});
