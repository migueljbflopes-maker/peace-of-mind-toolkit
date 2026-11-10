import { test, expect } from "./fixtures";

// Backlog A-06: edge functions are served by the local stack
// (`supabase functions serve`) and can be called from a test. This is the
// pattern for edge function tests; it uses checkin-start because, up to the
// point exercised here, it touches only the local database.

// The first call to a function compiles it and fetches its imports.
test.setTimeout(120_000);

test("an edge function runs locally and authenticates its caller against the local stack", async ({
  request,
  stack,
  admin,
  createUser,
  clientFor,
}) => {
  const url = `${stack.url}/functions/v1/checkin-start`;

  // No caller: refused by the function itself.
  const anonymous = await request.post(url, { data: {} });
  expect(anonymous.status()).toBe(401);

  // A token the local auth server did not issue: refused.
  const forged = await request.post(url, { data: {}, headers: { Authorization: "Bearer not-a-token" } });
  expect(forged.status()).toBe(401);

  // A premium user of this test's own, so that check-in tests on the shared
  // seeded user cannot affect the "nothing was written" assertion below.
  // The function accepts the caller, reads the
  // entitlement with its service-role key, and gets as far as validating the
  // body. A user without premium would get 403 here.
  const user = await createUser({ premium: true });
  const client = await clientFor(user);
  const { data } = await client.auth.getSession();
  const accepted = await request.post(url, {
    data: {},
    headers: { Authorization: `Bearer ${data.session?.access_token}` },
  });
  expect(await accepted.json()).toEqual({ error: "scenario_type required" });
  expect(accepted.status()).toBe(400);

  // Nothing was written.
  const sessions = await admin.from("checkin_sessions").select("id").eq("user_id", user.id);
  expect(sessions.error).toBeNull();
  expect(sessions.data).toEqual([]);
});
