/**
 * VaultKeyContext: the Recovery Kit rules (backlog F-10).
 *
 *  - Nothing is written to the server before the user confirms the kit.
 *  - The words given to the user open the key the server holds.
 *  - A new kit, and a recovery, make the old words useless.
 *
 * Supabase is an in-memory table; WebCrypto is real.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@/integrations/supabase/client", async () => (await import("@/test/fakeVaultKeysBackend")).supabaseClientModule);
vi.mock("@/hooks/useAuth", async () => (await import("@/test/fakeVaultKeysBackend")).useAuthModule);

import { backend as h } from "@/test/fakeVaultKeysBackend";
import {
  VaultKeyProvider,
  useVaultKey,
  type PendingRecoveryKit,
  type VaultKeyFailure,
} from "./VaultKeyContext";

const wrapper = ({ children }: { children: ReactNode }) => <VaultKeyProvider>{children}</VaultKeyProvider>;

async function mount() {
  const view = renderHook(() => useVaultKey(), { wrapper });
  await waitFor(() => expect(view.result.current.status).not.toBe("loading"));
  return view;
}

const PASSWORD = "first-master-password";
const snapshot = () => h.snapshot();

beforeEach(() => h.reset());

/** Runs the first half of a kit operation and insists that it worked. */
async function begin(start: () => Promise<PendingRecoveryKit | VaultKeyFailure>): Promise<PendingRecoveryKit> {
  let result: PendingRecoveryKit | VaultKeyFailure | undefined;
  await act(async () => {
    result = await start();
  });
  if (!result || result.ok !== true) throw new Error(result ? (result as VaultKeyFailure).error : "no result");
  return result;
}

/** Creates the master password and confirms the kit; returns the words. */
async function setUp(view: Awaited<ReturnType<typeof mount>>, password = PASSWORD) {
  const begun = await begin(() => view.result.current.beginSetup(password));
  await act(async () => {
    expect(await begun.commit()).toEqual({ ok: true });
  });
  return begun.recoveryPhrase;
}

describe("creating a master password", () => {
  it("writes nothing and unlocks nothing until the kit is confirmed", async () => {
    const view = await mount();
    expect(view.result.current.status).toBe("needs-setup");

    const begun = await begin(() => view.result.current.beginSetup(PASSWORD));
    expect(begun.recoveryPhrase.split(" ")).toHaveLength(24);
    expect(h.writes).toEqual([]);
    expect(h.rows).toEqual([]);
    expect(view.result.current.status).toBe("needs-setup");
    expect(view.result.current.isUnlocked).toBe(false);

    await act(async () => {
      expect(await begun.commit()).toEqual({ ok: true });
    });
    expect(h.rows).toHaveLength(1);
    expect(h.rows[0].recovery_encrypted_master_key).toBeTruthy();
    expect(view.result.current.isUnlocked).toBe(true);
    expect(JSON.stringify(h.rows)).not.toContain(begun.recoveryPhrase);
  });

  it("abandoning the kit step leaves the account as if nothing happened", async () => {
    const first = await mount();
    await act(async () => {
      await first.result.current.beginSetup(PASSWORD);
    });
    first.unmount();

    const second = await mount();
    expect(h.rows).toEqual([]);
    expect(second.result.current.status).toBe("needs-setup");
  });

  it("a failed save says so, stays locked, and can be retried with the same words", async () => {
    const view = await mount();
    const begun = await begin(() => view.result.current.beginSetup(PASSWORD));

    h.failNextWrite = { message: "network down" };
    await act(async () => {
      expect(await begun.commit()).toMatchObject({ ok: false, code: "not-saved" });
    });
    expect(view.result.current.isUnlocked).toBe(false);
    expect(h.rows).toEqual([]);

    await act(async () => {
      expect(await begun.commit()).toEqual({ ok: true });
    });
    expect(view.result.current.isUnlocked).toBe(true);
  });

  it("a save that reached the server but whose answer was lost is found by reading back, and counts as saved", async () => {
    const view = await mount();
    const begun = await begin(() => view.result.current.beginSetup(PASSWORD));

    h.failNextWrite = { message: "connection reset", applyAnyway: true };
    await act(async () => {
      expect(await begun.commit()).toEqual({ ok: true });
    });
    expect(h.rows).toHaveLength(1);
    expect(h.writes).toHaveLength(1);
    expect(view.result.current.isUnlocked).toBe(true);
  });

  it("when the answer is lost and the row cannot be read either, it claims neither outcome, and a retry settles it", async () => {
    const view = await mount();
    const begun = await begin(() => view.result.current.beginSetup(PASSWORD));

    h.failNextWrite = { message: "connection reset", applyAnyway: true };
    h.failReads = 1;
    await act(async () => {
      expect(await begun.commit()).toMatchObject({ ok: false, code: "outcome-unknown" });
    });
    expect(view.result.current.isUnlocked).toBe(false);
    // It did reach the server. The retry finds its own row and opens.
    expect(h.rows).toHaveLength(1);
    await act(async () => {
      expect(await begun.commit()).toEqual({ ok: true });
    });
    expect(h.rows).toHaveLength(1);
    expect(view.result.current.isUnlocked).toBe(true);
  });

  it("when nothing reached the server and the row cannot be read, it still claims neither outcome", async () => {
    const view = await mount();
    const begun = await begin(() => view.result.current.beginSetup(PASSWORD));

    h.failNextWrite = { message: "offline" };
    h.failReads = 1;
    await act(async () => {
      expect(await begun.commit()).toMatchObject({ ok: false, code: "outcome-unknown" });
    });
    expect(h.rows).toEqual([]);
    expect(view.result.current.isUnlocked).toBe(false);
  });

  it("refuses the kit when another device created a master password meanwhile", async () => {
    const view = await mount();
    const begun = await begin(() => view.result.current.beginSetup(PASSWORD));

    h.rows.push({ user_id: h.user!.id, encrypted_master_key: "other", iv: "x", salt: "y" });
    const before = snapshot();
    await act(async () => {
      expect(await begun.commit()).toMatchObject({ ok: false, code: "already-set-up" });
    });
    expect(h.rows).toEqual(before);
    expect(view.result.current.isUnlocked).toBe(false);
    expect(view.result.current.status).toBe("needs-unlock");
  });
});

describe("the session", () => {
  it("a refreshed session for the same account neither locks the vault nor disturbs a kit step", async () => {
    const view = await mount();
    await setUp(view);
    expect(view.result.current.isUnlocked).toBe(true);

    // Supabase hands out a new user object on every token refresh and when
    // the tab regains focus, which is exactly when a user comes back from
    // saving their words.
    h.user = { id: h.user!.id };
    view.rerender();
    expect(view.result.current.status).toBe("unlocked");
    expect(view.result.current.isUnlocked).toBe(true);
  });

  it("a different account starts locked, and a kit prepared for the first cannot be stored", async () => {
    const view = await mount();
    const begun = await begin(() => view.result.current.beginSetup(PASSWORD));

    h.user = { id: "00000000-0000-0000-0000-0000000000f2" };
    view.rerender();
    await waitFor(() => expect(view.result.current.status).toBe("needs-setup"));
    await act(async () => {
      expect(await begun.commit()).toMatchObject({ ok: false, code: "not-authenticated" });
    });
    expect(h.rows).toEqual([]);
    expect(view.result.current.isUnlocked).toBe(false);
  });
});

describe("a new Recovery Kit from an unlocked vault", () => {
  it("needs the master password, changes nothing until confirmed, then kills the old words", async () => {
    const view = await mount();
    const oldPhrase = await setUp(view);
    const secret = await act(async () => view.result.current.encrypt({ note: "kept" }));
    const afterSetup = snapshot();

    await act(async () => {
      expect(await view.result.current.beginRecoveryKitRenewal("not-the-password")).toMatchObject({
        ok: false,
        code: "wrong-password",
      });
    });
    expect(h.rows).toEqual(afterSetup);

    const renewal = await begin(() => view.result.current.beginRecoveryKitRenewal(PASSWORD));
    expect(renewal.recoveryPhrase).not.toBe(oldPhrase);
    // Not confirmed yet: the old kit is still the one on the server.
    expect(h.rows).toEqual(afterSetup);

    await act(async () => {
      expect(await renewal.commit()).toEqual({ ok: true });
    });
    // Only the recovery columns changed.
    expect(h.rows[0].encrypted_master_key).toBe(afterSetup[0].encrypted_master_key);
    expect(h.rows[0].salt).toBe(afterSetup[0].salt);
    expect(h.rows[0].recovery_encrypted_master_key).not.toBe(afterSetup[0].recovery_encrypted_master_key);
    expect(h.rows[0].recovery_salt).not.toBe(afterSetup[0].recovery_salt);
    expect(JSON.stringify(h.rows)).not.toContain(renewal.recoveryPhrase);

    // Old words: refused. New words: accepted, and the data is still readable.
    view.unmount();
    const later = await mount();
    expect(later.result.current.status).toBe("needs-unlock");
    await act(async () => {
      expect(await later.result.current.beginRecovery(oldPhrase, "second-master-password")).toMatchObject({
        ok: false,
        code: "wrong-phrase",
      });
    });
    const recovery = await begin(() => later.result.current.beginRecovery(renewal.recoveryPhrase, "second-master-password"));
    await act(async () => {
      expect(await recovery.commit()).toEqual({ ok: true });
    });
    expect(await later.result.current.decrypt(secret)).toEqual({ note: "kept" });
  });
});

describe("a write whose answer is lost", () => {
  const NEW_PASSWORD = "second-master-password";

  /** An account with a kit, locked again, and the recovery prepared. */
  async function preparedRecovery() {
    const first = await mount();
    const phrase = await setUp(first);
    const secret = await act(async () => first.result.current.encrypt({ note: "kept" }));
    first.unmount();
    const view = await mount();
    const recovery = await begin(() => view.result.current.beginRecovery(phrase, NEW_PASSWORD));
    return { view, phrase, secret, recovery, before: h.snapshot() };
  }

  /** What a later visit finds: which password and which words open the account. */
  async function laterVisit() {
    const later = await mount();
    const tryPassword = async (password: string) => {
      let result: { ok: boolean } | undefined;
      await act(async () => {
        result = await later.result.current.unlock(password);
      });
      act(() => later.result.current.lock());
      return result!.ok;
    };
    const tryWords = async (words: string) => {
      let result: { ok: boolean; code?: string } | undefined;
      await act(async () => {
        result = await later.result.current.beginRecovery(words, "third-master-password");
      });
      return result!.ok;
    };
    return { later, tryPassword, tryWords };
  }

  it("recovery: the update landed, so it is reported as saved and the vault opens", async () => {
    const { view, phrase, secret, recovery } = await preparedRecovery();

    h.failNextWrite = { message: "connection reset", applyAnyway: true };
    await act(async () => {
      expect(await recovery.commit()).toEqual({ ok: true });
    });
    expect(view.result.current.isUnlocked).toBe(true);
    expect(await view.result.current.decrypt(secret)).toEqual({ note: "kept" });
    view.unmount();

    // And that is the truth: the used words are dead, the new ones and the new password live.
    const { tryPassword, tryWords } = await laterVisit();
    expect(await tryPassword(PASSWORD)).toBe(false);
    expect(await tryPassword(NEW_PASSWORD)).toBe(true);
    expect(await tryWords(phrase)).toBe(false);
    expect(await tryWords(recovery.recoveryPhrase)).toBe(true);
  });

  it("recovery: the update landed but nothing can be read, so neither outcome is claimed; a retry opens the vault", async () => {
    const { view, recovery, before } = await preparedRecovery();

    h.failNextWrite = { message: "connection reset", applyAnyway: true };
    h.failReads = 1;
    await act(async () => {
      expect(await recovery.commit()).toMatchObject({ ok: false, code: "outcome-unknown" });
    });
    expect(view.result.current.isUnlocked).toBe(false);
    expect(h.rows[0].encrypted_master_key).not.toBe(before[0].encrypted_master_key);

    await act(async () => {
      expect(await recovery.commit()).toEqual({ ok: true });
    });
    expect(view.result.current.isUnlocked).toBe(true);
  });

  it("recovery: the update did not land, which reading back confirms, so 'not saved' is true", async () => {
    const { view, phrase, recovery, before } = await preparedRecovery();

    h.failNextWrite = { message: "offline" };
    await act(async () => {
      expect(await recovery.commit()).toMatchObject({ ok: false, code: "not-saved" });
    });
    expect(view.result.current.isUnlocked).toBe(false);
    expect(h.rows).toEqual(before);
    view.unmount();

    const { tryPassword, tryWords } = await laterVisit();
    expect(await tryPassword(PASSWORD)).toBe(true);
    expect(await tryWords(recovery.recoveryPhrase)).toBe(false);
    expect(await tryWords(phrase)).toBe(true);
  });

  it("a new kit: the update landed, so it is reported as saved, and the old words are dead", async () => {
    const view = await mount();
    const oldPhrase = await setUp(view);
    const renewal = await begin(() => view.result.current.beginRecoveryKitRenewal(PASSWORD));

    h.failNextWrite = { message: "connection reset", applyAnyway: true };
    await act(async () => {
      expect(await renewal.commit()).toEqual({ ok: true });
    });
    view.unmount();

    const { tryWords } = await laterVisit();
    expect(await tryWords(oldPhrase)).toBe(false);
    expect(await tryWords(renewal.recoveryPhrase)).toBe(true);
  });

  it("a new kit: the update landed but nothing can be read, so neither outcome is claimed; a retry confirms it", async () => {
    const view = await mount();
    await setUp(view);
    const before = h.snapshot();
    const renewal = await begin(() => view.result.current.beginRecoveryKitRenewal(PASSWORD));

    h.failNextWrite = { message: "connection reset", applyAnyway: true };
    h.failReads = 1;
    await act(async () => {
      expect(await renewal.commit()).toMatchObject({ ok: false, code: "outcome-unknown" });
    });
    expect(h.rows[0].recovery_encrypted_master_key).not.toBe(before[0].recovery_encrypted_master_key);
    await act(async () => {
      expect(await renewal.commit()).toEqual({ ok: true });
    });
  });

  it("a new kit: the update did not land, which reading back confirms, so the old kit really is still the kit", async () => {
    const view = await mount();
    const oldPhrase = await setUp(view);
    const before = h.snapshot();
    const renewal = await begin(() => view.result.current.beginRecoveryKitRenewal(PASSWORD));

    h.failNextWrite = { message: "offline" };
    await act(async () => {
      expect(await renewal.commit()).toMatchObject({ ok: false, code: "not-saved" });
    });
    expect(h.rows).toEqual(before);
    view.unmount();

    const { tryWords } = await laterVisit();
    expect(await tryWords(renewal.recoveryPhrase)).toBe(false);
    expect(await tryWords(oldPhrase)).toBe(true);
  });
});

describe("another account signs in while a request is on its way", () => {
  const OTHER_USER = { id: "00000000-0000-0000-0000-0000000000f2" };

  /** Starts `action`, switches account before the server answers, then lets it answer. */
  async function switchAccountDuring<T>(view: Awaited<ReturnType<typeof mount>>, action: () => Promise<T>) {
    let release!: () => void;
    h.hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    let pending!: Promise<T>;
    act(() => {
      pending = action();
    });
    // The request is with the server. Meanwhile the session changes hands.
    h.user = OTHER_USER;
    view.rerender();
    let result: T | undefined;
    await act(async () => {
      release();
      result = await pending;
    });
    h.hold = null;
    await waitFor(() => expect(view.result.current.status).not.toBe("loading"));
    return result!;
  }

  async function expectNoKeyInMemory(view: Awaited<ReturnType<typeof mount>>) {
    expect(view.result.current.isUnlocked).toBe(false);
    await expect(view.result.current.encrypt({ any: "thing" })).rejects.toThrow("Vault is locked");
  }

  it("creating: the first account's key is stored for it, but is not left open for the second", async () => {
    const view = await mount();
    const begun = await begin(() => view.result.current.beginSetup(PASSWORD));

    const result = await switchAccountDuring(view, () => begun.commit());
    expect(result).toMatchObject({ ok: false, code: "not-authenticated" });
    expect(view.result.current.status).toBe("needs-setup");
    await expectNoKeyInMemory(view);
  });

  it("recovering: the key is not left open for the second account", async () => {
    const first = await mount();
    const phrase = await setUp(first);
    first.unmount();
    const view = await mount();
    const recovery = await begin(() => view.result.current.beginRecovery(phrase, "second-master-password"));

    const result = await switchAccountDuring(view, () => recovery.commit());
    expect(result).toMatchObject({ ok: false, code: "not-authenticated" });
    await expectNoKeyInMemory(view);
  });

  it("unlocking: the key is not left open for the second account", async () => {
    const first = await mount();
    await setUp(first);
    first.unmount();
    const view = await mount();
    expect(view.result.current.status).toBe("needs-unlock");

    const result = await switchAccountDuring(view, () => view.result.current.unlock(PASSWORD));
    expect(result).toMatchObject({ ok: false });
    await expectNoKeyInMemory(view);
  });
});

describe("recovering with the kit", () => {
  it("changes nothing until the new kit is confirmed, then swaps password and words together", async () => {
    const first = await mount();
    const phrase = await setUp(first);
    const secret = await act(async () => first.result.current.encrypt({ iban: "PT50 0000" }));
    const afterSetup = snapshot();
    first.unmount();

    const view = await mount();
    const recovery = await begin(() => view.result.current.beginRecovery(`  ${phrase.toUpperCase()}  `, "second-master-password"));
    expect(recovery.recoveryPhrase.split(" ")).toHaveLength(24);
    expect(recovery.recoveryPhrase).not.toBe(phrase);
    expect(h.rows).toEqual(afterSetup);
    expect(view.result.current.isUnlocked).toBe(false);

    await act(async () => {
      expect(await recovery.commit()).toEqual({ ok: true });
    });
    expect(view.result.current.isUnlocked).toBe(true);
    expect(await view.result.current.decrypt(secret)).toEqual({ iban: "PT50 0000" });
    for (const column of [
      "encrypted_master_key",
      "iv",
      "salt",
      "recovery_encrypted_master_key",
      "recovery_iv",
      "recovery_salt",
    ]) {
      expect(h.rows[0][column], column).not.toBe(afterSetup[0][column]);
    }
    view.unmount();

    // The new password opens it, the old one does not, the used words are dead.
    const later = await mount();
    await act(async () => {
      expect(await later.result.current.unlock(PASSWORD)).toMatchObject({ ok: false });
      expect(await later.result.current.beginRecovery(phrase, "third-master-password")).toMatchObject({
        ok: false,
        code: "wrong-phrase",
      });
      expect(await later.result.current.unlock("second-master-password")).toEqual({ ok: true });
    });
    expect(await later.result.current.decrypt(secret)).toEqual({ iban: "PT50 0000" });
  });

  it("refuses words that are not the kit, and an account without a kit", async () => {
    const first = await mount();
    await setUp(first);
    const afterSetup = snapshot();
    first.unmount();

    const view = await mount();
    const wrong = Array(24).fill("abandon").join(" ");
    await act(async () => {
      expect(await view.result.current.beginRecovery(wrong, "second-master-password")).toMatchObject({
        ok: false,
        code: "wrong-phrase",
      });
      expect(await view.result.current.beginRecovery("not words at all", "second-master-password")).toMatchObject({
        ok: false,
        code: "invalid-phrase",
      });
    });
    expect(h.rows).toEqual(afterSetup);

    h.rows[0].recovery_encrypted_master_key = null;
    h.rows[0].recovery_iv = null;
    h.rows[0].recovery_salt = null;
    await act(async () => {
      expect(await view.result.current.beginRecovery(wrong, "second-master-password")).toMatchObject({
        ok: false,
        code: "no-recovery-kit",
      });
    });
  });
});
