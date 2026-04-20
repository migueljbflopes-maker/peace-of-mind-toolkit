/**
 * Zero-Knowledge crypto engine — round-trip & invariants.
 * Validates wrap/unwrap of the Master Key and generic encrypt/decrypt.
 */
import { describe, it, expect } from "vitest";
import {
  createWrappedMasterKey,
  openWrappedMasterKey,
  encryptData,
  decryptData,
  rewrapMasterKey,
  generateRecoveryPassphrase,
  CRYPTO_VERSION,
} from "./crypto";

describe("crypto: wrap/unwrap master key", () => {
  it("creates a wrapped key with the expected envelope shape", async () => {
    const { wrapped, masterKey } = await createWrappedMasterKey("correct horse battery staple");
    expect(wrapped.encrypted_master_key).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(wrapped.iv).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(wrapped.salt).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(wrapped.kdf_iterations).toBeGreaterThanOrEqual(250_000);
    expect(wrapped.version).toBe(CRYPTO_VERSION);
    expect(masterKey).toBeDefined();
  });

  it("unlocks with the correct password", async () => {
    const { wrapped } = await createWrappedMasterKey("hunter2-hunter2-hunter2");
    const reopened = await openWrappedMasterKey(wrapped, "hunter2-hunter2-hunter2");
    expect(reopened).toBeDefined();
  });

  it("FAILS to unlock with the wrong password", async () => {
    const { wrapped } = await createWrappedMasterKey("right-password-is-long-enough");
    await expect(
      openWrappedMasterKey(wrapped, "wrong-password-is-also-long")
    ).rejects.toBeDefined();
  });

  it("rewrap with new password preserves data decryption", async () => {
    const { wrapped, masterKey } = await createWrappedMasterKey("old-password-very-long");
    // encrypt something with the original master key
    const blob = await encryptData({ secret: "treasure" }, masterKey);

    // re-wrap with a new password
    const rewrapped = await rewrapMasterKey(masterKey, "brand-new-password-here");
    const reopened = await openWrappedMasterKey(rewrapped, "brand-new-password-here");

    // the rewrapped/reopened key MUST still decrypt the old ciphertext
    const recovered = await decryptData<{ secret: string }>(blob, reopened);
    expect(recovered.secret).toBe("treasure");
  });
});

describe("crypto: encrypt/decrypt round-trip", () => {
  it("round-trips a complex JSON payload (Plan-shaped)", async () => {
    const { masterKey } = await createWrappedMasterKey("master-pw-12-chars-min");
    const plan = {
      version: 1,
      summary: "Plan A: Stay & Shelter",
      steps: [
        { id: 1, title: "Secure water", duration: "5m" },
        { id: 2, title: "Lock down doors", duration: "2m" },
      ],
      meta: { generated_at: "2026-04-20T10:00:00Z", model: "openai/gpt-5" },
    };

    const blob = await encryptData(plan, masterKey);
    expect(blob.ciphertext).toBeTruthy();
    expect(blob.iv).toBeTruthy();
    expect(blob.version).toBe(CRYPTO_VERSION);
    // ciphertext MUST NOT contain the plaintext
    expect(blob.ciphertext).not.toContain("Stay & Shelter");
    expect(blob.ciphertext).not.toContain("Secure water");

    const recovered = await decryptData<typeof plan>(blob, masterKey);
    expect(recovered).toEqual(plan);
  });

  it("produces different ciphertext on each call (fresh IV)", async () => {
    const { masterKey } = await createWrappedMasterKey("master-pw-12-chars-min");
    const data = { x: 1 };
    const a = await encryptData(data, masterKey);
    const b = await encryptData(data, masterKey);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("decrypt FAILS on tampered ciphertext (AES-GCM auth tag)", async () => {
    const { masterKey } = await createWrappedMasterKey("master-pw-12-chars-min");
    const blob = await encryptData({ x: 1 }, masterKey);
    const tampered = {
      ...blob,
      // flip a character in the middle of the base64 ciphertext
      ciphertext:
        blob.ciphertext.slice(0, 4) +
        (blob.ciphertext[4] === "A" ? "B" : "A") +
        blob.ciphertext.slice(5),
    };
    await expect(decryptData(tampered, masterKey)).rejects.toBeDefined();
  });
});

describe("crypto: recovery", () => {
  it("generates a high-entropy recovery passphrase", () => {
    const pw = generateRecoveryPassphrase();
    expect(pw.length).toBeGreaterThanOrEqual(40);
    const a = generateRecoveryPassphrase();
    const b = generateRecoveryPassphrase();
    expect(a).not.toBe(b);
  });
});
