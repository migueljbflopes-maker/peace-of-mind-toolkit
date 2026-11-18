/**
 * An in-memory stand-in for Supabase, for unit tests of the master password
 * and Recovery Kit flows (backlog F-10). It knows one table, user_vault_keys,
 * with the primary key on user_id, and just enough of the query builder for
 * VaultKeyContext. Use it from a hoisted mock:
 *
 *   vi.mock("@/integrations/supabase/client", async () =>
 *     (await import("@/test/fakeVaultKeysBackend")).supabaseClientModule);
 *   vi.mock("@/hooks/useAuth", async () =>
 *     (await import("@/test/fakeVaultKeysBackend")).useAuthModule);
 */

type Row = Record<string, unknown>;

export const FIRST_USER_ID = "00000000-0000-0000-0000-0000000000f1";

export const backend = {
  rows: [] as Row[],
  /** Every insert and update that was attempted, in order. */
  writes: [] as Array<{ op: string; payload: Row }>,
  /**
   * Makes the next write fail. With `applyAnyway` the write happens and only
   * its answer is lost, as when the connection drops after the request left.
   */
  failNextWrite: null as null | { code?: string; message: string; applyAnyway?: boolean },
  /** Makes the next reads fail, as when the connection is down: how many. */
  failReads: 0,
  /**
   * When set, every query waits for this before it answers (it has already
   * been applied): lets a test change who is signed in during a round trip.
   */
  hold: null as null | Promise<void>,
  user: { id: FIRST_USER_ID, email: "user@example.test" } as { id: string; email?: string } | null,
  /** True while the session is still being restored on page load. */
  authLoading: false,
  reset() {
    backend.rows = [];
    backend.writes = [];
    backend.failNextWrite = null;
    backend.failReads = 0;
    backend.hold = null;
    backend.user = { id: FIRST_USER_ID, email: "user@example.test" };
    backend.authLoading = false;
  },
  snapshot(): Row[] {
    return JSON.parse(JSON.stringify(backend.rows));
  },
};

function from(table: string) {
  if (table !== "user_vault_keys") throw new Error(`unexpected table ${table}`);
  const q = { op: "select", payload: {} as Row, filters: [] as Array<[string, unknown]>, returning: false };
  const matching = () => backend.rows.filter((r) => q.filters.every(([k, v]) => r[k] === v));
  const run = () => {
    if (q.op === "select") {
      if (backend.failReads > 0) {
        backend.failReads -= 1;
        return { data: null, error: { message: "Failed to fetch" } };
      }
      return { data: matching(), error: null };
    }
    backend.writes.push({ op: q.op, payload: q.payload });
    const failure = backend.failNextWrite;
    backend.failNextWrite = null;
    if (failure && !failure.applyAnyway) return { data: null, error: failure };
    if (q.op === "insert") {
      if (backend.rows.some((r) => r.user_id === q.payload.user_id)) {
        return { data: null, error: { code: "23505", message: "duplicate key value" } };
      }
      backend.rows.push({ ...q.payload });
      return failure ? { data: null, error: failure } : { data: null, error: null };
    }
    const hit = matching();
    for (const r of hit) Object.assign(r, q.payload);
    if (failure) return { data: null, error: failure };
    return { data: q.returning ? hit.map((r) => ({ user_id: r.user_id })) : null, error: null };
  };
  const builder = {
    select() {
      if (q.op !== "select") q.returning = true;
      return builder;
    },
    insert(payload: Row) {
      q.op = "insert";
      q.payload = payload;
      return builder;
    },
    update(payload: Row) {
      q.op = "update";
      q.payload = payload;
      return builder;
    },
    eq(col: string, value: unknown) {
      q.filters.push([col, value]);
      return builder;
    },
    maybeSingle() {
      const res = run();
      const answer = { data: (res.data as Row[] | null)?.[0] ?? null, error: res.error };
      return Promise.resolve(backend.hold).then(() => answer);
    },
    single() {
      return builder.maybeSingle();
    },
    then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
      const answer = run();
      return Promise.resolve(backend.hold)
        .then(() => answer)
        .then(resolve, reject);
    },
  };
  return builder;
}

export const supabaseClientModule = {
  supabase: {
    from,
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      getUser: async () => ({ data: { user: null } }),
    },
  },
};

export const useAuthModule = {
  useAuth: () => ({ user: backend.user, loading: backend.authLoading }),
};
