#!/usr/bin/env node
// Backlog A-06. Seeds the LOCAL Supabase stack with the users the browser
// tests sign in as. It is not a migration and is not under supabase/, so the
// "Supabase deploy" workflow can never carry it to the hosted project, and it
// refuses to run against any URL that is not on this machine.
//
//   node scripts/with-local-supabase.mjs node scripts/seed-local.mjs
//
// Safe to run again: existing users are updated, not duplicated.

import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { assertLocalUrl, stackFromEnv } from "./local-supabase.mjs";
import { PREMIUM_USER } from "./test-users.mjs";

/** A service-role client for the local stack. Bypasses row level security. */
export function createAdminClient({ url, serviceRoleKey }) {
  assertLocalUrl(url, "the Supabase URL given to the seed");
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** The auth user with this email on the local stack, or null. */
export async function findUserByEmail(admin, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const found = data.users.find((user) => user.email === email);
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * Creates (or resets) one confirmed user and the rows the app expects:
 *  - auth user with a confirmed email and a known password;
 *  - user_profiles, which the app otherwise creates on first sign-in;
 *  - premium_entitlements, the only source of truth for premium
 *    (src/contexts/EntitlementsContext.tsx and the SQL function is_premium()).
 * No vault key is created: a seeded user has never set a master password.
 */
export async function ensureUser(admin, { email, password, premium = false, locale = "en" }) {
  let user = await findUserByEmail(admin, email);
  if (user) {
    const { data, error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (error) throw new Error(`updateUser(${email}) failed: ${error.message}`);
    user = data.user;
  } else {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(`createUser(${email}) failed: ${error.message}`);
    user = data.user;
  }

  const profile = await admin.from("user_profiles").upsert({ user_id: user.id, locale }, { onConflict: "user_id" });
  if (profile.error) throw new Error(`user_profiles(${email}) failed: ${profile.error.message}`);

  const entitlement = await admin
    .from("premium_entitlements")
    .upsert({ user_id: user.id, is_premium: premium }, { onConflict: "user_id" });
  if (entitlement.error) throw new Error(`premium_entitlements(${email}) failed: ${entitlement.error.message}`);

  return { id: user.id, email, password, premium };
}

/** Seeds every fixed test user. Returns them with their ids. */
export async function seed(stack) {
  const admin = createAdminClient(stack);
  return { premium: await ensureUser(admin, PREMIUM_USER) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const stack = stackFromEnv();
    const users = await seed(stack);
    for (const user of Object.values(users)) {
      console.log(`[seed] ${user.email} (${user.premium ? "premium" : "free"}) ${user.id} on ${stack.url}`);
    }
  } catch (error) {
    console.error(`[seed] ${error.message}`);
    process.exit(1);
  }
}
