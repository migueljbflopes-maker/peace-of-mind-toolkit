// The users the local test stack is seeded with (backlog A-06).
// These credentials exist only on a local Supabase stack: scripts/seed-local.mjs
// refuses to create them anywhere else.

/** Confirmed account with a premium entitlement. The default signed-in user. */
export const PREMIUM_USER = {
  email: "premium@e2e.amiready.test",
  password: "e2e-premium-password",
  premium: true,
};
