import { describe, expect, it } from "vitest";
import { classify, listFunctions } from "./smoke-deployed-functions.mjs";

describe("classify", () => {
  it("accepts the function's own preflight answer", () => {
    expect(classify(200, "ok")).toBe("booted");
    expect(classify(204, "")).toBe("booted");
  });
  it("fails a function the platform answered for", () => {
    expect(classify(503, '{"code":"BOOT_ERROR","message":"Function failed to start"}')).toBe("failed");
    expect(classify(500, '{"code":"WORKER_ERROR"}')).toBe("failed");
    expect(classify(546, '{"code":"WORKER_LIMIT"}')).toBe("failed");
    expect(classify(502, "")).toBe("failed");
  });
  it("fails on a boot error even behind a success status", () => {
    expect(classify(200, "BOOT_ERROR")).toBe("failed");
  });
  it("does not claim a function booted when the gateway refused the call", () => {
    expect(classify(401, '{"message":"Missing authorization header"}')).toBe("unknown");
  });
  it("fails on anything else, such as a function that was never deployed", () => {
    expect(classify(404, '{"code":"NOT_FOUND"}')).toBe("failed");
    expect(classify(0, "no answer")).toBe("failed");
  });
});

describe("listFunctions", () => {
  it("reads the functions from the directory and skips shared code", () => {
    const names = listFunctions();
    expect(names).toContain("panic-trigger");
    expect(names).toContain("checkin-cron");
    expect(names).not.toContain("_shared");
  });
});
