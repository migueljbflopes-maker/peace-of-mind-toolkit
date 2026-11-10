import { test as base, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { stackFromEnv } from "../../scripts/local-supabase.mjs";
import { createAdminClient, ensureUser, findUserByEmail } from "../../scripts/seed-local.mjs";
import { PREMIUM_USER } from "../../scripts/test-users.mjs";

// Fixtures for browser tests that need a backend (backlog A-06, phase F).
// Import `test` and `expect` from this file, not from @playwright/test.
//
// A test in e2e/backend starts already signed in as the seeded premium user
// (the session saved by auth.setup.ts). To start signed out:
//   test.use({ storageState: { cookies: [], origins: [] } });

export interface TestUser {
  id: string;
  email: string;
  password: string;
  premium: boolean;
}

export interface Stack {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

interface WorkerFixtures {
  /** The local Supabase stack. Throws if it is not on this machine. */
  stack: Stack;
  /**
   * Service-role client for the local database: bypasses row level security.
   * Use it to arrange data and to assert on rows,
   * e.g. `admin.from("vault_items").select("*").eq("user_id", user.id)`.
   */
  admin: SupabaseClient;
  /** The seeded premium user every test is signed in as by default. */
  premiumUser: TestUser;
}

interface TestFixtures {
  /** Uncaught exceptions of the page, collected from the start of the test. */
  pageErrors: string[];
  /**
   * Requests the page tried to make to anything but this machine. They are
   * aborted, so a browser test cannot reach Stripe, OpenAI, Google or the
   * hosted Supabase project. A test that needs such a response mocks it with
   * `page.route(...)`, which takes precedence over this guard.
   */
  blockedRequests: string[];
  /**
   * Creates a fresh confirmed user for this test and deletes it afterwards
   * (every table references auth.users with ON DELETE CASCADE).
   */
  createUser: (options?: { premium?: boolean }) => Promise<TestUser>;
  /**
   * A supabase-js client signed in as the given user, as the app would be:
   * subject to row level security, and able to call edge functions with
   * `client.functions.invoke(name, { body })`.
   */
  clientFor: (user: Pick<TestUser, "email" | "password">) => Promise<SupabaseClient>;
}

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

export const test = base.extend<TestFixtures, WorkerFixtures>({
  stack: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, provide) => {
      await provide(stackFromEnv());
    },
    { scope: "worker" },
  ],

  admin: [
    async ({ stack }, provide) => {
      await provide(createAdminClient(stack));
    },
    { scope: "worker" },
  ],

  premiumUser: [
    async ({ admin }, provide) => {
      const user = await findUserByEmail(admin, PREMIUM_USER.email);
      if (!user) throw new Error(`${PREMIUM_USER.email} is not on the local stack: the seed has not run.`);
      await provide({ ...PREMIUM_USER, id: user.id });
    },
    { scope: "worker" },
  ],

  pageErrors: [
    async ({ page }, provide) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await provide(errors);
    },
    { auto: true },
  ],

  blockedRequests: [
    async ({ context }, provide) => {
      const blocked: string[] = [];
      await context.route(
        (url) => /^https?:$/.test(url.protocol) && !LOCAL_HOSTS.has(url.hostname),
        async (route) => {
          blocked.push(route.request().url());
          await route.abort("blockedbyclient");
        },
      );
      await provide(blocked);
    },
    { auto: true },
  ],

  createUser: async ({ admin }, provide, testInfo) => {
    const created: TestUser[] = [];
    await provide(async ({ premium = false } = {}) => {
      const unique = `${testInfo.workerIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const user = await ensureUser(admin, {
        email: `user-${unique}@e2e.amiready.test`,
        password: `pw-${unique}`,
        premium,
      });
      created.push(user);
      return user;
    });
    for (const user of created) {
      await admin.auth.admin.deleteUser(user.id);
    }
  },

  clientFor: async ({ stack }, provide) => {
    await provide(async ({ email, password }) => {
      const client = createClient(stack.url, stack.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw new Error(`Could not sign in as ${email} on the local stack: ${error.message}`);
      return client;
    });
  },
});

export { expect };

/**
 * Signs in through the real sign-in page, as a user does: the Password tab of
 * /login. Fails with the server's answer if the local stack refuses.
 */
export async function signInThroughUi(page: Page, user: Pick<TestUser, "email" | "password">) {
  await page.goto("/login");
  await page.getByRole("tab", { name: "Password" }).click();
  await page.locator("#password-email").fill(user.email);
  await page.locator("#password").fill(user.password);

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/auth/v1/token") && r.request().method() === "POST"),
    page.locator("form").filter({ has: page.locator("#password") }).locator('button[type="submit"]').click(),
  ]);
  if (!response.ok()) {
    throw new Error(
      `Sign-in as ${user.email} was refused by the local stack: ${response.status()} ${await response.text()}`,
    );
  }
  await expect(page).toHaveURL(/\/dashboard$/);
}
