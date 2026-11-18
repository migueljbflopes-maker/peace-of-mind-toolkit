// Backlog A-07. The step that deletes removed edge functions from the hosted
// project deletes exactly the deployed functions that have no directory in
// the repository, and nothing at all when it cannot be sure of the list.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { listProtected, plan, prune } from "./prune-deployed-functions.mjs";
import { listFunctions } from "./smoke-deployed-functions.mjs";

const REF = "abcdefghijklmnopqrst";
const LOCAL = ["checkin-cron", "panic-trigger", "stripe-webhook"];
const deployed = (...slugs) => slugs.map((slug) => ({ id: slug, slug, name: slug, status: "ACTIVE" }));

/** A stand-in for the Management API that records every call. */
function fakeApi(initial, { listStatus = 200, deleteStatus = 200, listBody, secondList, deleteTakesEffect = true } = {}) {
  let current = [...initial];
  let lists = 0;
  const calls = [];
  const fetchImpl = async (url, { method, headers }) => {
    calls.push(`${method} ${new URL(url).pathname}`);
    expect(new URL(url).origin).toBe("https://api.supabase.com");
    expect(headers.Authorization).toBe("Bearer token");
    if (method === "GET") {
      lists++;
      // secondList: what the list after the deletes answers, when it differs.
      if (lists > 1 && secondList) {
        if (secondList.throws) throw new Error(secondList.throws);
        return { status: secondList.status ?? 200, text: async () => secondList.body ?? JSON.stringify(current) };
      }
      return { status: listStatus, text: async () => listBody ?? JSON.stringify(current) };
    }
    if (deleteStatus === 200 && deleteTakesEffect) {
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
    protectedNames: LOCAL,
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

describe("plan: directories without an index.ts, and names in upper case", () => {
  it("never deletes a function whose directory exists without an index.ts", () => {
    // Deployed: a and b. Repository: a/index.ts and b/main.ts.
    expect(plan(deployed("a", "b"), ["a"], ["a", "b"])).toEqual({ remove: [] });
    expect(plan(deployed("a", "b", "c"), ["a"], ["a", "b"])).toEqual({ remove: ["c"] });
  });

  it("does not require a directory without an index.ts to be deployed", () => {
    expect(plan(deployed("a", "c"), ["a"], ["a", "b"])).toEqual({ remove: ["c"] });
  });

  it("refuses when the directories could not be listed", () => {
    expect(plan(deployed("a", "c"), ["a"], null).refuse).toMatch(/could not be listed/);
    expect(plan(deployed("a", "c"), ["a"], "a").refuse).toMatch(/could not be listed/);
  });

  it("accepts the slugs the API accepts, upper case included, and compares exactly", () => {
    expect(plan(deployed(...LOCAL, "OldThing", "Old_thing-2"), LOCAL)).toEqual({
      remove: ["OldThing", "Old_thing-2"],
    });
    expect(plan(deployed("Panic", "other"), ["Panic"], ["Panic"])).toEqual({ remove: ["other"] });
  });

  it("refuses when a deployed name differs from a directory only by case", () => {
    const decision = plan(deployed(...LOCAL, "Panic-Trigger"), LOCAL);
    expect(decision.remove).toBeUndefined();
    expect(decision.refuse).toMatch(/Panic-Trigger differ only by case from panic-trigger/);
    // Also against a directory that has no index.ts.
    expect(plan(deployed("a", "B"), ["a"], ["a", "b"]).refuse).toMatch(/differ only by case/);
  });
});

describe("listProtected: what the repository protects", () => {
  it("is every directory but the shared code, with or without an index.ts", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prune-"));
    try {
      fs.mkdirSync(path.join(dir, "a"));
      fs.writeFileSync(path.join(dir, "a", "index.ts"), "");
      fs.mkdirSync(path.join(dir, "b"));
      fs.writeFileSync(path.join(dir, "b", "main.ts"), "");
      fs.mkdirSync(path.join(dir, "empty"));
      fs.mkdirSync(path.join(dir, "_shared"));
      fs.writeFileSync(path.join(dir, "notes.md"), "");

      expect(listProtected(dir)).toEqual(["a", "b", "empty"]);
      // The deploy and the boot check go by index.ts; the protection does not.
      expect(listFunctions(dir)).toEqual(["a"]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("covers every function of this repository", () => {
    const names = listProtected();
    expect(names).toContain("panic-trigger");
    expect(names).not.toContain("_shared");
    expect(listFunctions().filter((name) => !names.includes(name))).toEqual([]);
  });
});

describe("prune: directories without an index.ts, the exit code, the dry run", () => {
  it("a/index.ts and b/main.ts both deployed: b is not deleted", async () => {
    const api = fakeApi(deployed("a", "b", "c"));
    const { code, output } = await run(api, { local: ["a"], protectedNames: ["a", "b"] });
    expect(code).toBe(0);
    expect(api.deletes()).toEqual([`DELETE /v1/projects/${REF}/functions/c`]);
    expect(output).not.toContain("deleting  b");
  });

  it("reads the directories itself when it is not given them", async () => {
    // No protectedNames passed: the real supabase/functions protects its own.
    const api = fakeApi(deployed(...listFunctions(), "old-news"));
    const lines = [];
    const code = await prune({
      ref: REF,
      token: "token",
      dryRun: true,
      fetchImpl: api.fetchImpl,
      log: (line) => lines.push(line),
    });
    expect(code).toBe(0);
    expect(lines.filter((line) => line.startsWith("would delete"))).toEqual(["would delete  old-news"]);
  });

  it("fails when a delete is refused, even if the function is gone afterwards", async () => {
    // The delete answers 500 and the second list no longer shows the function.
    const api = fakeApi(deployed(...LOCAL, "old-news"), {
      deleteStatus: 500,
      secondList: { body: JSON.stringify(deployed(...LOCAL)) },
    });
    const { code, output } = await run(api);
    expect(output).toContain("FAILED    old-news: 500");
    expect(output).toContain("exactly the 3 functions of the repository");
    expect(code).toBe(1);
  });

  it("fails when a delete throws, even if the function is gone afterwards", async () => {
    const inner = fakeApi(deployed(...LOCAL, "old-news"), {
      secondList: { body: JSON.stringify(deployed(...LOCAL)) },
    });
    const api = {
      ...inner,
      fetchImpl: async (url, init) => {
        if (init.method === "DELETE") throw new Error("socket hang up");
        return inner.fetchImpl(url, init);
      },
    };
    const { code, output } = await run(api);
    expect(output).toContain("FAILED    old-news: socket hang up");
    expect(code).toBe(1);
  });

  it("fails when the list after the deletes can no longer be trusted", async () => {
    // Every delete answered 200, then the project lacks functions of the repository.
    const api = fakeApi(deployed(...LOCAL, "old-news"), {
      secondList: { body: JSON.stringify(deployed("panic-trigger")) },
    });
    const { code, output } = await run(api);
    expect(output).toContain("deleted   old-news");
    expect(output).toContain("after deleting: the deployed list lacks 2 function(s)");
    expect(code).toBe(1);
  });

  it("fails when the list after the deletes cannot be read", async () => {
    for (const secondList of [{ status: 500 }, { body: "not json" }, { throws: "network down" }]) {
      const api = fakeApi(deployed(...LOCAL, "old-news"), { secondList });
      const { code, output } = await run(api);
      expect(output).toContain("deleted   old-news");
      expect(output).toContain("could not read the deployed functions again");
      expect(code).toBe(1);
    }
  });

  it("fails when every delete answered 200 and the function is still deployed", async () => {
    const api = fakeApi(deployed(...LOCAL, "old-news"), { deleteTakesEffect: false });
    const { code, output } = await run(api);
    expect(output).toContain("deleted   old-news");
    expect(output).toContain("still deployed and not in the repository: old-news");
    expect(code).toBe(1);
  });

  it("a dry run sends one GET and nothing else", async () => {
    const api = fakeApi(deployed(...LOCAL, "old-news", "old-chat"));
    const { code, output } = await run(api, { dryRun: true });
    expect(code).toBe(0);
    expect(api.calls).toEqual([`GET /v1/projects/${REF}/functions`]);
    expect(output).toContain("would delete  old-chat");
    expect(output).toContain("would delete  old-news");
    expect(output).not.toMatch(/deleting|deleted/);
  });

  it("in a dry run every request goes through a sender that refuses anything but GET", () => {
    // Belt and braces, checked in the source: the dry run returns before the
    // deletes, and the sender it was given cannot send one anyway.
    const source = fs.readFileSync(path.resolve("scripts/prune-deployed-functions.mjs"), "utf8");
    const body = source.slice(source.indexOf("export async function prune("));
    expect(body).toMatch(/const send = dryRun\s*\?[\s\S]+?init\?\.method !== "GET"\) throw new Error/);
    expect(body).toMatch(/if \(dryRun\) return 0;[\s\S]+api\("DELETE"/);
    // After `send` is made, the injected fetch is not used directly again.
    const afterSend = body.slice(body.indexOf(": fetchImpl;") + ": fetchImpl;".length);
    expect(body).toContain(": fetchImpl;");
    expect(afterSend).not.toContain("fetchImpl");
    expect(afterSend.match(/token, send\)/g)).toHaveLength(3);
  });

  it("a dry run reports the same refusals as a real run and still deletes nothing", async () => {
    const api = fakeApi(deployed("panic-trigger", "old-news"));
    const { code, output } = await run(api, { dryRun: true });
    expect(code).toBe(1);
    expect(output).toContain("nothing deleted");
    expect(api.calls).toEqual([`GET /v1/projects/${REF}/functions`]);
  });
});
