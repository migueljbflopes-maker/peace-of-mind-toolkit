import { test, expect } from "@playwright/test";

// Backlog F-11: signed out, the routes behind the master password gate offer
// sign-in instead of an empty page. Needs no backend: nobody signs in here.
// Returning to the route after a real sign-in is in
// e2e/backend/signup-master-password.spec.ts.

const GATED_ROUTES = [
  "/premium/vault",
  "/premium/plans",
  "/premium/plans/wizard?plan=B&from=pricing",
  "/premium/red-folder",
  "/premium/backup",
];

for (const route of GATED_ROUTES) {
  test(`signed out, ${route} shows the navigation and a way to sign in that remembers the address`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto(route);

    // The normal page chrome: the bar with the phone menu, and in it "Log in".
    await expect(page.getByRole("button", { name: "Toggle menu" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sign in to continue" })).toBeVisible();
    await expect(page.getByText("This page is part of your account. Sign in to open it.")).toBeVisible();
    const signIn = page.getByRole("button", { name: "Log in / Create account" });
    await expect(signIn).toBeVisible();

    // Nothing of the page behind the gate, and no master password screen.
    await expect(page.getByText("Create your Master Password")).toHaveCount(0);
    await expect(page.getByText("Unlock the Vault")).toHaveCount(0);
    await expect(page.getByText("Step 1 of 7", { exact: true })).toHaveCount(0);

    await signIn.click();
    await expect(page).toHaveURL(new RegExp(`/login\\?return_url=${escapeRegExp(encodeURIComponent(route))}$`));
    // The sign-in page knows where to return to: its way back is that address.
    await expect(page.getByRole("link", { name: "Back to where I was" })).toHaveAttribute("href", route);

    expect(errors).toEqual([]);
  });
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
