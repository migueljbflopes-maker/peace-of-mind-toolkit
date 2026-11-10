import { describe, expect, it } from "vitest";
import { canApplyUpdateNow } from "./updatePolicy";

describe("canApplyUpdateNow", () => {
  it("applies a waiting update when the app is in the background", () => {
    expect(canApplyUpdateNow({ visibility: "hidden", pathname: "/dashboard" })).toBe(true);
    expect(canApplyUpdateNow({ visibility: "hidden", pathname: "/" })).toBe(true);
  });

  it("never reloads the app while the user is looking at it", () => {
    expect(canApplyUpdateNow({ visibility: "visible", pathname: "/dashboard" })).toBe(false);
    expect(canApplyUpdateNow({ visibility: "visible", pathname: "/premium/vault" })).toBe(false);
  });

  it("never reloads a panic screen, even in the background", () => {
    // The phone may lock or switch to the SMS composer during an activation.
    expect(canApplyUpdateNow({ visibility: "hidden", pathname: "/panic" })).toBe(false);
    expect(canApplyUpdateNow({ visibility: "hidden", pathname: "/panic/test" })).toBe(false);
    expect(canApplyUpdateNow({ visibility: "hidden", pathname: "/panic/" })).toBe(false);
  });

  it("does not treat a route that merely starts with the same letters as panic", () => {
    expect(canApplyUpdateNow({ visibility: "hidden", pathname: "/panicky" })).toBe(true);
  });
});
