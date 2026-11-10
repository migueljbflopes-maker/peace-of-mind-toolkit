import fs from "node:fs";
import path from "node:path";
import { STORAGE_STATE } from "./paths";
import { seed } from "../../scripts/seed-local.mjs";
import { test as setup, signInThroughUi } from "./fixtures";

// Seeds the local stack (scripts/seed-local.mjs, safe to repeat), then signs
// in once as the premium user, through the real sign-in page, and saves the
// browser state. Every test of the "backend" project starts
// from that state, so it is already signed in.
setup("sign in as the seeded premium user", async ({ page, stack }) => {
  const users = await seed(stack);
  await signInThroughUi(page, users.premium);

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE });
});
