import fs from "node:fs";
import path from "node:path";
import { STORAGE_STATE } from "./paths";
import { PREMIUM_USER } from "../../scripts/test-users.mjs";
import { test as setup, signInThroughUi } from "./fixtures";

// Signs in once as the seeded premium user, through the real sign-in page,
// and saves the browser state. Every test of the "backend" project starts
// from that state, so it is already signed in.
setup("sign in as the seeded premium user", async ({ page }) => {
  await signInThroughUi(page, PREMIUM_USER);

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE });
});
