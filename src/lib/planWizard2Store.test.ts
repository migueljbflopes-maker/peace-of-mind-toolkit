/**
 * Plan store — Zero-Knowledge envelope shape.
 * Validates that when an `encrypt` helper is supplied, plan_*_json is
 * never persisted as plaintext on the (mocked) cloud layer.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createWrappedMasterKey, encryptData, decryptData, type EncryptedBlob } from "@/utils/crypto";

// Capture the payloads passed to supabase.from('premium_plans').insert/update.
const captured: { insert: any[]; update: any[] } = { insert: [], update: [] };

vi.mock("@/integrations/supabase/client", () => {
  const builder = () => {
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: { id: "row-1" }, error: null }),
      insert: vi.fn((row: any) => {
        captured.insert.push(row);
        return {
          select: () => ({ single: () => Promise.resolve({ data: { id: "new-row", ...row }, error: null }) }),
        };
      }),
      update: vi.fn((row: any) => {
        captured.update.push(row);
        return {
          eq: () => ({
            select: () => ({ single: () => Promise.resolve({ data: { id: "row-1", ...row }, error: null }) }),
          }),
        };
      }),
    };
    return chain;
  };
  return { supabase: { from: vi.fn(builder) } };
});

import { savePlanToCloud } from "./planWizard2Store";
import type { GeneratedPlanA, GeneratedPlanB } from "./planWizard2Types";

const samplePlanA = {
  version: 1,
  scenarios: [{ id: "fire", steps: ["evac", "regroup"] }],
  summary: "TOP_SECRET_PLAN_A_SUMMARY",
} as unknown as GeneratedPlanA;

const samplePlanB = {
  version: 1,
  fallback: "shelter-in-place",
  summary: "TOP_SECRET_PLAN_B_SUMMARY",
} as unknown as GeneratedPlanB;

beforeEach(() => {
  captured.insert.length = 0;
  captured.update.length = 0;
});

describe("planWizard2Store: zero-knowledge persistence", () => {
  it("WITHOUT crypto helper → uploads plaintext (legacy path)", async () => {
    await savePlanToCloud("user-123", {
      plan_a_json: samplePlanA,
      plan_b_json: samplePlanB,
    });

    expect(captured.insert).toHaveLength(1);
    const row = captured.insert[0];
    expect(JSON.stringify(row.plan_a_json)).toContain("TOP_SECRET_PLAN_A_SUMMARY");
    expect(JSON.stringify(row.plan_b_json)).toContain("TOP_SECRET_PLAN_B_SUMMARY");
  });

  it("WITH crypto helper → uploads only an encrypted envelope", async () => {
    const { masterKey } = await createWrappedMasterKey("master-pw-12-chars-min");
    const encrypt = (data: unknown) => encryptData(data, masterKey);
    const decrypt = <T,>(b: EncryptedBlob) => decryptData<T>(b, masterKey);

    await savePlanToCloud(
      "user-123",
      { plan_a_json: samplePlanA, plan_b_json: samplePlanB },
      { encrypt, decrypt }
    );

    expect(captured.insert).toHaveLength(1);
    const row = captured.insert[0];

    // Plaintext markers MUST NOT appear anywhere on the row.
    const serialised = JSON.stringify(row);
    expect(serialised).not.toContain("TOP_SECRET_PLAN_A_SUMMARY");
    expect(serialised).not.toContain("TOP_SECRET_PLAN_B_SUMMARY");

    // Envelope shape
    for (const key of ["plan_a_json", "plan_b_json"] as const) {
      const env = row[key];
      expect(env).toBeDefined();
      expect(typeof env.ciphertext).toBe("string");
      expect(typeof env.iv).toBe("string");
      expect(typeof env.version).toBe("number");
    }

    // Round-trip: an attacker (server) sees only the envelope; only the holder
    // of the Master Key can recover the plan.
    const recoveredA = await decrypt<typeof samplePlanA>(row.plan_a_json);
    expect(recoveredA).toEqual(samplePlanA);
  });

  it("null plan values are stored as null, not encrypted", async () => {
    const { masterKey } = await createWrappedMasterKey("master-pw-12-chars-min");
    const encrypt = (data: unknown) => encryptData(data, masterKey);
    const decrypt = <T,>(b: EncryptedBlob) => decryptData<T>(b, masterKey);

    await savePlanToCloud(
      "user-123",
      { plan_a_json: null, plan_b_json: null },
      { encrypt, decrypt }
    );
    const row = captured.insert[0];
    expect(row.plan_a_json).toBeNull();
    expect(row.plan_b_json).toBeNull();
  });
});
