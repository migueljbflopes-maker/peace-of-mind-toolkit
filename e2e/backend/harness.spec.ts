import { test, expect, signInThroughUi } from "./fixtures";

// Backlog A-06: the parts of the harness that later tests lean on.

test.describe("a user created for one test", () => {
  // Start signed out instead of as the seeded premium user.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a user without a purchase signs in and is shown the paywall on the dashboard", async ({
    page,
    createUser,
    admin,
    pageErrors,
  }) => {
    const user = await createUser({ premium: false });
    await signInThroughUi(page, user);

    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Premium Feature")).toHaveCount(2);
    await expect(page.getByRole("link", { name: /Unlock for/ })).toHaveCount(2);
    await expect(page.getByText("Hold 3s to activate")).toHaveCount(0);
    expect(pageErrors).toEqual([]);

    // The service-role client reads rows that row level security hides from
    // other users: this is how a test asserts on what was stored.
    const { data, error } = await admin.from("premium_entitlements").select("is_premium").eq("user_id", user.id);
    expect(error).toBeNull();
    expect(data).toEqual([{ is_premium: false }]);
  });
});

test("a page under test cannot reach anything outside this machine", async ({ page, blockedRequests }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

  const outcome = await page.evaluate(() =>
    fetch("https://api.stripe.com/v1/tokens", { method: "POST" }).then(
      () => "reached",
      () => "blocked",
    ),
  );
  expect(outcome).toBe("blocked");
  expect(blockedRequests).toContain("https://api.stripe.com/v1/tokens");
  expect(blockedRequests.filter((url) => /supabase\.co/.test(url))).toEqual([]);
});

test("a test can stand in for an external service with page.route", async ({ page, blockedRequests }) => {
  await page.route("https://api.openai.com/**", (route) =>
    route.fulfill({ json: { mocked: true }, headers: { "access-control-allow-origin": "*" } }),
  );
  await page.goto("/dashboard");

  const body = await page.evaluate(() => fetch("https://api.openai.com/v1/models").then((r) => r.json()));
  expect(body).toEqual({ mocked: true });
  expect(blockedRequests).not.toContain("https://api.openai.com/v1/models");
});
