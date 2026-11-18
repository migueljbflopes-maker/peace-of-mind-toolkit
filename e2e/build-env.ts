// Backlog A-13: what the build under test is made for.
//
// The committed .env points at the hosted Supabase project, which is
// production. A browser test must never write to it, so the build the tests
// run against does not carry its address at all:
//
//  - the backend run (E2E_BACKEND=1) gets the address and key of the local
//    stack from scripts/with-local-supabase.mjs, through the environment;
//  - every other run is built with the address below, where the local stack
//    would be if it were running. Tests that need no backend answer the
//    Supabase API themselves (they match on the path, `**/rest/v1/...`), and
//    a request no test answers is refused by this machine.
//
// A variable in the environment wins over .env when Vite builds.

/** Where a build made for tests without a backend sends its Supabase calls. */
export const NO_BACKEND_SUPABASE_URL = "http://127.0.0.1:54321";

/** Extra environment for the build that playwright.config.ts starts. */
export function buildEnvFor(env: Record<string, string | undefined>): Record<string, string> {
  // The backend run already carries the local stack's values.
  if (env.E2E_BACKEND === "1") return {};
  return {
    VITE_SUPABASE_URL: NO_BACKEND_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: "e2e-no-backend-not-a-real-key",
    VITE_SUPABASE_PROJECT_ID: "local",
    // The committed .env carries the live Stripe key. Tests never use it.
    VITE_STRIPE_PUBLISHABLE_KEY: "pk_test_e2e_dummy_not_a_real_key",
  };
}

/**
 * Addresses of hosted Supabase projects found in the scripts of a build, and
 * the hosted project's reference if it appears on its own. Empty when the
 * build can be tested.
 */
export function hostedSupabaseIn(bundle: string, hostedRef?: string): string[] {
  const found = new Set(bundle.match(/\b(?:https?|wss?):\/\/[a-z0-9][a-z0-9.-]*\.supabase\.(?:co|in)\b(?![\w.-])/gi) ?? []);
  if (hostedRef && bundle.includes(hostedRef)) found.add(hostedRef);
  return [...found];
}
