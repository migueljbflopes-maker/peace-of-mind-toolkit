import { test, expect } from "./fixtures";
import { TEXT, type Answers, readResult, walkToResult } from "../helpers/riskFunnel";

// Backlog F-06, the part that needs a real backend. The funnel itself is
// tested in e2e/risk-funnel.spec.ts with the network answered by the test;
// here the same walk runs against the local Supabase stack, to see what a
// signed-out visitor's walk leaves in the database, and what the visitor is
// told when the checkout function cannot reach Stripe (the local functions
// have a dummy Stripe key: see e2e/backend/functions.env).

test.use({ storageState: { cookies: [], origins: [] } });

// The first call to a function compiles it.
test.setTimeout(120_000);

const ANSWERS: Answers = {
  country: "Portugal",
  city: "Lisboa",
  postalCode: "1100-148",
  home: "apartment",
  floor: "5+",
  household: ["elderly", "medical"],
  experience: "never",
  kit: "no",
  water: false,
  power: false,
  contacts: false,
  plan: "no",
};

test("a visitor's walk through the funnel stores which steps were seen, and none of the answers", async ({
  page,
  admin,
  pageErrors,
}) => {
  // Stripe.js is not reachable here (the fixtures abort it), so the click on
  // "START NOW" ends in the error message (backlog F-21) and no function is
  // called. The analytics rows are written all the same.
  await walkToResult(page, ANSWERS);
  const shown = await readResult(page);
  await page.getByRole("button", { name: TEXT.en.viewResults }).click();
  const offer = page.getByRole("dialog");
  await offer.getByRole("button", { name: TEXT.en.offerCta }).click();
  await expect(page.getByText(TEXT.en.checkoutError)).toBeVisible();

  const sessionId = await page.evaluate(() => sessionStorage.getItem("analytics_session_id"));
  expect(sessionId).toMatch(/^[0-9a-f-]{36}$/);

  // 10 steps seen + 9 completed + the click on the offer.
  await expect
    .poll(async () => {
      const { count } = await admin
        .from("feature_usage")
        .select("id", { count: "exact", head: true })
        .eq("session_id", sessionId);
      return count;
    })
    .toBe(20);

  const usage = await admin.from("feature_usage").select("*").eq("session_id", sessionId);
  expect(usage.error).toBeNull();
  for (const row of usage.data ?? []) {
    expect(row.feature_name).toBe("risk_funnel");
    expect(row.user_id).toBeNull();
  }
  const click = (usage.data ?? []).filter((row) => row.action === "checkout_click");
  // The result stored is the result the visitor was shown, whatever it is.
  expect(shown.level).toBe("High");
  expect(click.map((row) => row.metadata)).toEqual([
    { funnel: "riskfunnel", risk_level: shown.level.toLowerCase(), score: shown.score },
  ]);

  const views = await admin.from("page_views").select("*").eq("session_id", sessionId);
  expect(views.error).toBeNull();
  expect((views.data ?? []).map((row) => row.path)).toEqual(["/riskfunnel"]);
  expect(views.data?.[0].user_id).toBeNull();

  // The answers are in none of the rows.
  const stored = JSON.stringify([usage.data, views.data]);
  for (const answer of ["Lisboa", "1100-148", "medical", "elderly", "apartment"]) {
    expect(stored).not.toContain(answer);
  }

  // Nothing about a purchase exists yet.
  const purchases = await admin.from("guest_purchases").select("id").eq("guest_session_id", sessionId);
  expect(purchases.data ?? []).toEqual([]);
  expect(pageErrors).toEqual([]);

  await admin.from("feature_usage").delete().eq("session_id", sessionId);
  await admin.from("page_views").delete().eq("session_id", sessionId);
});

test("the real checkout function, refused by Stripe, gives the visitor an error and not a dead button", async ({
  page,
  context,
  blockedRequests,
}) => {
  // Stripe.js is stood in for by the smallest thing that loads and reports
  // "no wallet", so that the app goes on to the real create-guest-checkout
  // on the local stack. That function then calls Stripe with a dummy key and
  // is refused, which is as far as a test can go without F-09.
  await context.route("https://js.stripe.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: `window.Stripe = function () { return {
        _registerWrapper() {},
        paymentRequest() { return { on() {}, canMakePayment: async () => null, show() {} }; },
      }; }; window.Stripe.version = 3;`,
    }),
  );

  await walkToResult(page, ANSWERS, { interstitials: "skip" });
  await page.getByRole("button", { name: TEXT.en.viewResults }).click();
  const offer = page.getByRole("dialog");

  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/functions/v1/create-guest-checkout") && r.request().method() === "POST",
      { timeout: 90_000 },
    ),
    offer.getByRole("button", { name: TEXT.en.offerCta }).click(),
  ]);
  expect(response.request().postDataJSON()).toEqual({ source: "riskfunnel" });
  expect(response.status()).toBe(500);

  await expect(page.getByText(TEXT.en.checkoutError)).toBeVisible();
  await expect(page).toHaveURL(/\/riskfunnel$/);
  await expect(offer.getByRole("button", { name: TEXT.en.offerCta })).toBeEnabled();
  // The browser itself never tried to reach Stripe's payment pages.
  expect(blockedRequests.filter((url) => /checkout\.stripe\.com|api\.stripe\.com/.test(url))).toEqual([]);
});
