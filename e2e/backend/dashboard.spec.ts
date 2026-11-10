import { test, expect } from "./fixtures";

// Backlog A-06, the acceptance test of the harness: the seeded user, signed in
// through the sign-in page (auth.setup.ts), reaches the dashboard.

test("the seeded premium user is signed in and reaches the dashboard", async ({ page, pageErrors }) => {
  await page.goto("/dashboard");

  // Signed in: the dashboard itself, not the redirect to /login.
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Premium: the working panic card, and no paywall card anywhere.
  await expect(page.getByText("Hold 3s to activate")).toBeVisible();
  await expect(page.getByRole("link", { name: "Setup" })).toHaveAttribute("href", "/panic/setup");
  await expect(page.getByText("Premium Feature")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Unlock for/ })).toHaveCount(0);

  // The dashboard does not sit behind the master password: only the vault,
  // plans, Red Folder and backup routes do (MasterKeyGate in src/App.tsx).
  // The seeded user has never set one; that flow is backlog F-01.

  expect(pageErrors).toEqual([]);
});

test("the dashboard reads the seeded user's own rows from the local stack", async ({ page, stack, premiumUser }) => {
  const failed: string[] = [];
  page.on("response", (response) => {
    if (response.url().startsWith(stack.url) && response.status() >= 400) {
      failed.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  const entitlements = page.waitForResponse(
    (response) => response.url().startsWith(`${stack.url}/rest/v1/premium_entitlements`) && response.status() === 200,
  );
  await page.goto("/dashboard");

  const body = await (await entitlements).json();
  expect(Array.isArray(body) ? body[0] : body).toMatchObject({ is_premium: true });

  const session = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
    return key ? JSON.parse(localStorage.getItem(key) ?? "null") : null;
  });
  expect(session?.user?.id).toBe(premiumUser.id);

  // Every table the dashboard reads exists on the local stack and lets this
  // user read it: no request to the stack was refused.
  await expect(page.getByText("Hold 3s to activate")).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(failed).toEqual([]);
});
