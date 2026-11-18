import type { Page } from "@playwright/test";
import { test as base, expect } from "./fixtures";
import {
  FUNNEL_URL,
  TEXT,
  type Answers,
  answerFirstHalf,
  answerHome,
  answerHousehold,
  answerLocation,
  answerKit,
  euroAmounts,
  heading,
  nextButton,
  readResult,
  toggle,
  walkToResult,
} from "./helpers/riskFunnel";

// Backlog F-06: the one-time purchase funnel (/riskfunnel) as a signed-out
// visitor on a phone, from the first question to the hand-over to Stripe.
//
// Why this file is not in e2e/backend: up to the hand-over the funnel is
// client-side. The only things it sends are analytics rows (page_views,
// feature_usage) and one call to an edge function that needs a real Stripe
// secret. Both are answered here at the network edge, so the test runs on any
// machine, and what it asserts is the REQUEST the app makes: that is the
// app's half of the contract. e2e/backend/risk-funnel.spec.ts checks, against
// the local stack, what the analytics rows look like once stored.
//
// The boundary, plainly:
//  - Stripe.js (js.stripe.com) is replaced by a stub that records what the app
//    asks of it. No real Stripe code runs.
//  - create-guest-checkout and create-payment-intent are answered by the
//    test. The functions themselves, and Stripe, are NOT covered (F-09).
//  - "The payment screen" is Stripe's hosted Checkout page, or the phone's
//    Apple Pay / Google Pay sheet. Neither is ours. The furthest point the
//    app itself reaches is: the browser is sent to the URL the function
//    returned (Checkout), or the wallet sheet is asked to open with an amount
//    (express pay). Those two points are what is asserted.

// ── Fixtures ────────────────────────────────────────────────────────────────

interface Tracked {
  table: string;
  row: Record<string, unknown>;
}
interface FunctionCall {
  name: string;
  body: unknown;
}
interface Net {
  /** Rows the app posted to the analytics tables, in order. */
  tracked: Tracked[];
  /** Edge function calls the app made, in order. */
  functionCalls: FunctionCall[];
  /** Any other request to the Supabase API (auth, other tables). */
  otherSupabase: string[];
  /**
   * Requests to any other machine than this one. Aborted unless a test answers
   * them: this is `blockedRequests` of e2e/fixtures.ts, the same list.
   */
  thirdParty: string[];
  /** Raw bodies of every request that had one, to search for leaked answers. */
  bodies: string[];
}

interface StripeStubState {
  keys: string[];
  paymentRequests: Array<{
    country: string;
    currency: string;
    total: { label: string; amount: number };
    requestPayerName?: boolean;
    requestPayerEmail?: boolean;
  }>;
  shown: number;
  confirmCalls: unknown[][];
  completed: string | null;
}

type Wallet = null | { applePay?: boolean; googlePay?: boolean };

const SUPABASE_PATH = /^\/(rest|auth|functions|realtime|storage)\/v1\//;
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
};

// A stand-in for Stripe.js. It records what the page asks for and lets the
// test play the wallet's part. `window.__wallet` is what canMakePayment()
// answers: null means "this phone has no Apple Pay or Google Pay".
const STRIPE_STUB = `
(() => {
  const state = (window.__stripeStub = {
    keys: [], paymentRequests: [], shown: 0, confirmCalls: [], completed: null, handlers: {},
  });
  window.Stripe = function (key) {
    state.keys.push(key);
    return {
      _registerWrapper() {},
      registerAppInfo() {},
      paymentRequest(options) {
        state.paymentRequests.push(options);
        return {
          on(event, handler) { state.handlers[event] = handler; },
          canMakePayment: async () => window.__wallet ?? null,
          show() { state.shown += 1; },
        };
      },
      confirmCardPayment: async (...args) => {
        state.confirmCalls.push(args);
        return { paymentIntent: { status: "succeeded" } };
      },
    };
  };
  window.Stripe.version = 3;
})();
`;

const test = base.extend<{
  net: Net;
  pageErrors: string[];
  /** Makes Stripe.js load (as the stub) and says which wallet the phone has. */
  stripeLoads: (wallet: Wallet) => Promise<void>;
  /** Answers one edge function. Returns nothing; calls are in net.functionCalls. */
  mockFunction: (name: string, status: number, body: unknown) => Promise<void>;
}>({
  pageErrors: [
    async ({ page }, provide) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await provide(errors);
    },
    { auto: true },
  ],

  net: [
    // `blockedRequests` first: its route is then the one asked after this one.
    async ({ context, blockedRequests }, provide) => {
      const net: Net = {
        tracked: [],
        functionCalls: [],
        otherSupabase: [],
        thirdParty: blockedRequests,
        bodies: [],
      };

      await context.route(
        (url) => /^https?:$/.test(url.protocol),
        async (route) => {
          const request = route.request();
          const url = new URL(request.url());
          const body = request.postData();
          if (body) net.bodies.push(body);

          if (SUPABASE_PATH.test(url.pathname)) {
            if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });

            const table = /^\/rest\/v1\/(page_views|feature_usage)$/.exec(url.pathname)?.[1];
            if (table && request.method() === "POST") {
              const parsed = JSON.parse(body ?? "null");
              for (const row of Array.isArray(parsed) ? parsed : [parsed]) net.tracked.push({ table, row });
              return route.fulfill({ status: 201, headers: CORS, body: "" });
            }

            const fn = /^\/functions\/v1\/([^/?]+)/.exec(url.pathname)?.[1];
            if (fn) {
              // A function no test has answered: recorded, and refused.
              net.functionCalls.push({ name: fn, body: body ? JSON.parse(body) : null });
              return route.fulfill({
                status: 500,
                headers: CORS,
                contentType: "application/json",
                body: JSON.stringify({ error: "not mocked in this test" }),
              });
            }

            net.otherSupabase.push(`${request.method()} ${url.pathname}`);
            return route.fulfill({ status: 500, headers: CORS, contentType: "application/json", body: "{}" });
          }

          // This machine's own files go through; anything for another machine
          // is aborted and recorded by the guard every browser test has.
          return route.fallback();
        },
      );

      await provide(net);
    },
    { auto: true },
  ],

  stripeLoads: async ({ context }, provide) => {
    await provide(async (wallet) => {
      await context.addInitScript((w) => {
        (window as unknown as { __wallet: unknown }).__wallet = w;
      }, wallet);
      await context.route("https://js.stripe.com/**", (route) =>
        route.fulfill({ status: 200, contentType: "text/javascript", body: STRIPE_STUB }),
      );
    });
  },

  mockFunction: async ({ context, net }, provide) => {
    await provide(async (name, status, responseBody) => {
      await context.route(`**/functions/v1/${name}`, async (route) => {
        const request = route.request();
        if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
        const body = request.postData();
        if (body) net.bodies.push(body);
        net.functionCalls.push({ name, body: body ? JSON.parse(body) : null });
        return route.fulfill({
          status,
          headers: CORS,
          contentType: "application/json",
          body: JSON.stringify(responseBody),
        });
      });
    });
  },
});

// Signed out, and an English phone unless a test says otherwise.
test.use({ storageState: { cookies: [], origins: [] }, locale: "en-US" });

const stripeStub = (page: Page) =>
  page.evaluate(() => {
    const { handlers: _handlers, ...rest } = (window as unknown as { __stripeStub: Record<string, unknown> })
      .__stripeStub;
    return rest;
  }) as unknown as Promise<StripeStubState>;

// A Checkout page of our own at the address the function "returned", so the
// test can see that the browser was really sent there.
const CHECKOUT_URL = "https://checkout.stripe.com/c/pay/cs_test_e2e_riskfunnel";
async function standInForStripeCheckout(page: Page) {
  await page.context().route("https://checkout.stripe.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Stripe Checkout (stand-in)</title><h1>Stripe Checkout (stand-in)</h1>",
    }),
  );
}

const openOffer = async (page: Page, lang: "en" | "pt" = "en") => {
  await page.getByRole("button", { name: TEXT[lang].viewResults }).click();
  const offer = page.getByRole("dialog");
  await expect(offer.getByRole("heading", { name: TEXT[lang].offerTitle })).toBeVisible();
  return offer;
};

// ── Answer sets, and what the scoring rules give for each ──────────────────
//
// The expected numbers are worked out here by hand from the rules in
// src/pages/riskFunnel/shared.tsx (calculateScore, getRiskLevel,
// buildReasons). The app's functions are deliberately not imported: a test
// that asks the code what the code will say proves nothing.
//
// The rules, as written there:
//   exposure  = 35 + 10 (every visitor, whatever the country or city)
//               + home: apartment 12 (floor 3 or 4: +5, floor 5+: +8), house 8
//               + household: kids 8, elderly 10, medical 12, pets 5, alone 6
//               capped at 70
//   gap       = kit: no 12, partly 6
//               + no water 8, no power backup 6, no emergency contacts 4
//               + never been through an emergency 4
//               + evacuation plan: no 8, somewhat 4
//               capped at 40
//   score     = exposure + gap;  up to 40 Low, up to 65 Moderate, above High
//   reasons   = first three, in this order: the city, high floor (5+),
//               elderly, medical, kids, alone, no kit, no water, no contacts

interface Case {
  name: string;
  answers: Answers;
  score: number;
  level: "Low" | "Moderate" | "High";
  reasons: string[];
}

// The best answers the funnel accepts.
const PREPARED_HOUSE: Answers = {
  country: "Portugal",
  city: "Évora",
  home: "house",
  household: [],
  experience: "multiple",
  kit: "yes",
  water: true,
  power: true,
  contacts: true,
  plan: "yes",
};

// The worst answers the funnel accepts.
const WORST_CASE: Answers = {
  country: "Portugal",
  city: "Lisboa",
  postalCode: "1100-148",
  home: "apartment",
  floor: "5+",
  household: ["kids", "elderly", "medical", "alone"],
  experience: "never",
  kit: "no",
  water: false,
  power: false,
  contacts: false,
  plan: "no",
};

const CASES: Case[] = [
  {
    name: "a well prepared household in a house",
    answers: PREPARED_HOUSE,
    // exposure 35 + 10 + 8 = 53; gap 0
    score: 53,
    level: "Moderate",
    reasons: ["Location in Évora presents specific risks"],
  },
  {
    name: "a family with children, on the upper edge of Moderate",
    answers: {
      country: "Spain",
      city: "Sevilla",
      home: "house",
      household: ["kids"],
      experience: "never",
      kit: "yes",
      water: true,
      power: true,
      contacts: true,
      plan: "yes",
    },
    // exposure 35 + 10 + 8 + 8 = 61; gap 4 (never) = 4; 65 is still Moderate
    score: 65,
    level: "Moderate",
    reasons: ["Location in Sevilla presents specific risks", "Children need specialized emergency planning"],
  },
  {
    name: "a third-floor flat with gaps in its preparation",
    answers: {
      country: "Germany",
      city: "Hamburg",
      postalCode: "20095",
      home: "apartment",
      floor: "3",
      household: ["pets"],
      experience: "once",
      kit: "partly",
      water: false,
      power: true,
      contacts: true,
      plan: "somewhat",
    },
    // exposure 35 + 10 + 12 + 5 (floor 3) + 5 (pets) = 67
    // gap 6 (kit partly) + 8 (no water) + 4 (plan somewhat) = 18
    score: 85,
    level: "High",
    reasons: ["Location in Hamburg presents specific risks", "Water supply for 3+ days is essential"],
  },
];

// ── 1. The whole funnel, and a result that matches the answers ─────────────

test.describe("the funnel, question by question", () => {
  for (const c of CASES) {
    test(`${c.name}: the result shown is the one the answers give`, async ({ page, pageErrors }) => {
      await walkToResult(page, c.answers);

      const shown = await readResult(page);
      expect(shown).toEqual({ level: c.level, score: c.score, outOf: 100, reasons: c.reasons });

      // The offer names the visitor's city.
      const offer = await openOffer(page);
      await expect(offer.getByText(`Built for ${c.answers.city}. Instant access after payment.`)).toBeVisible();
      expect(pageErrors).toEqual([]);
    });
  }

  test("the worst answers: High, and only the first three reasons are listed", async ({ page }) => {
    await walkToResult(page, WORST_CASE, { interstitials: "skip" });
    const shown = await readResult(page);
    expect(shown.level).toBe("High");
    // Nine reasons apply; the list stops at three, in the order of the code.
    expect(shown.reasons).toEqual([
      "Location in Lisboa presents specific risks",
      "High-rise living may complicate evacuation",
      "Elderly household members need extra planning",
    ]);
  });

  test(
    "the score never goes above the 100 it is shown out of",
    async ({ page }) => {
      test.fail(true, "Backlog F-20: the funnel does not do this yet.");
      // F-20. exposure 35+10+12+8+8+10+12+6 = 101, capped at 70; gap
      // 12+8+6+4+4+8 = 42, capped at 40; the sum, 110, is not capped.
      await walkToResult(page, WORST_CASE, { interstitials: "skip" });
      const shown = await readResult(page);
      expect(shown.outOf).toBe(100);
      expect(shown.score).toBeLessThanOrEqual(shown.outOf);
    },
  );

  test(
    "the best answers the funnel accepts are rated Low",
    async ({ page }) => {
      test.fail(true, "Backlog F-20: the funnel does not do this yet.");
      // F-20. Nobody can score under 53 (35 + 10 for everyone + 8 for the
      // safer home), and Low ends at 40: the Low category cannot be reached.
      await walkToResult(page, PREPARED_HOUSE, { interstitials: "skip" });
      expect((await readResult(page)).level).toBe("Low");
    },
  );

  test("a required answer is required: the way forward stays shut until it is given", async ({ page }) => {
    const a = CASES[2].answers;
    await page.goto(FUNNEL_URL);

    // 1/6: country and city are both needed; the postal code is not.
    await expect(heading(page, TEXT.en.q1)).toBeVisible();
    await expect(page.getByText("1/6")).toBeVisible();
    await expect(nextButton(page)).toBeDisabled();
    await page.getByPlaceholder(TEXT.en.cityPlaceholder).fill(a.city);
    await expect(nextButton(page)).toBeDisabled();
    await page.getByPlaceholder(TEXT.en.cityPlaceholder).fill("");
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: a.country, exact: true }).click();
    await expect(nextButton(page)).toBeDisabled();
    await page.getByPlaceholder(TEXT.en.cityPlaceholder).fill(a.city);
    await expect(nextButton(page)).toBeEnabled();
    await nextButton(page).click();

    // 2/6: a home type is needed; the floor is offered for a flat only and is optional.
    await expect(page.getByText("2/6")).toBeVisible();
    await expect(nextButton(page)).toBeDisabled();
    await expect(page.getByText("Floor level (optional)")).toHaveCount(0);
    await page.getByRole("button", { name: "Apartment" }).click();
    await expect(page.getByText("Floor level (optional)")).toBeVisible();
    await expect(nextButton(page)).toBeEnabled();
    await nextButton(page).click();

    // 3/6: "select all that apply", none is a valid answer.
    await expect(heading(page, TEXT.en.q3)).toBeVisible();
    await expect(nextButton(page)).toBeEnabled();
    await nextButton(page).click();

    // 4/6
    await expect(heading(page, TEXT.en.q4)).toBeVisible();
    await expect(nextButton(page)).toBeDisabled();
    await page.getByRole("button", { name: "Yes, once" }).click();
    await nextButton(page).click();
    await page.getByRole("button", { name: "Skip" }).click();

    // 5/6: the kit answer is needed; the three switches start off.
    await expect(heading(page, TEXT.en.q6)).toBeVisible();
    await expect(page.getByText("5/6")).toBeVisible();
    await expect(nextButton(page)).toBeDisabled();
    for (const label of [TEXT.en.water, TEXT.en.power, TEXT.en.contacts]) {
      await expect(toggle(page, label)).toHaveAttribute("aria-checked", "false");
    }
    await page.getByRole("button", { name: /Partly$/ }).click();
    await nextButton(page).click();

    // 6/6
    await expect(heading(page, TEXT.en.q7)).toBeVisible();
    await expect(page.getByText("6/6")).toBeVisible();
    await expect(nextButton(page)).toBeDisabled();
    await page.getByRole("button", { name: "Somewhat" }).click();
    await expect(nextButton(page)).toBeEnabled();
  });
});

// ── 2 and 3. The offer, the price, and the hand-over to Stripe ─────────────

test.describe("the offer and the hand-over to payment", () => {
  test("no wallet on the phone: €49 is offered and the browser is sent to the Checkout page the server returned", async ({
    page,
    net,
    stripeLoads,
    mockFunction,
    pageErrors,
  }) => {
    await stripeLoads(null);
    await mockFunction("create-guest-checkout", 200, { url: CHECKOUT_URL });
    await standInForStripeCheckout(page);

    await walkToResult(page, CASES[2].answers, { interstitials: "skip" });

    // The result page itself names no price.
    expect(euroAmounts(await page.locator("body").innerText())).toEqual([]);

    // The offer: a crossed-out €120 and the price, €49, twice. Nothing else.
    const offer = await openOffer(page);
    await expect(offer.getByText("One-time €120 €49 · No subscriptions")).toBeVisible();
    await expect(offer.getByText("€120")).toHaveCSS("text-decoration-line", "line-through");
    expect(euroAmounts(await offer.innerText())).toEqual([49, 120, 49]);
    await expect(offer.getByText(/Discount expires in \d\d:\d\d/)).toBeVisible();

    // The app asked Stripe.js about a wallet payment of the same amount.
    const stripe = await stripeStub(page);
    expect(stripe.paymentRequests).toHaveLength(1);
    expect(stripe.paymentRequests[0].total.amount).toBe(49 * 100);
    expect(stripe.paymentRequests[0].currency).toBe("eur");

    await offer.getByRole("button", { name: TEXT.en.offerCta }).click();
    await expect(page).toHaveURL(CHECKOUT_URL);
    await expect(page.getByRole("heading", { name: "Stripe Checkout (stand-in)" })).toBeVisible();

    // The app's whole request for a Checkout session. It carries no amount,
    // no currency, no email and no return address: the amount charged on
    // Stripe's page is whatever the price behind the server's
    // STRIPE_PRICE_ID_PREMIUM says, and the return addresses come from the
    // server's APP_URL. Nothing in this repository ties that price to €49.
    expect(net.functionCalls).toEqual([{ name: "create-guest-checkout", body: { source: "riskfunnel" } }]);
    expect(pageErrors).toEqual([]);
  });

  test("Google Pay on the phone: the wallet sheet is asked for €49 in euros, and a payment goes on to the purchase page with its claim code", async ({
    page,
    net,
    stripeLoads,
    mockFunction,
    pageErrors,
  }) => {
    await stripeLoads({ googlePay: true });
    const claimCode = "e2e0claim0code0000000000000000000000000000000000";
    await mockFunction("create-payment-intent", 200, {
      clientSecret: "pi_e2e_secret_e2e",
      paymentIntentId: "pi_e2e",
      claimCode,
    });

    await walkToResult(page, CASES[2].answers, { interstitials: "skip" });
    const offer = await openOffer(page);
    const shownPrice = euroAmounts(await offer.getByText(/^One-time €/).innerText()).at(-1);
    expect(shownPrice).toBe(49);

    await offer.getByRole("button", { name: TEXT.en.offerCta }).click();

    // The furthest point of this path: the wallet sheet is asked to open.
    await expect.poll(async () => (await stripeStub(page)).shown).toBe(1);
    const stripe = await stripeStub(page);
    expect(stripe.paymentRequests).toEqual([
      {
        country: "PT",
        currency: "eur",
        total: { label: "Resilient Plan", amount: shownPrice! * 100 },
        requestPayerName: true,
        requestPayerEmail: true,
      },
    ]);
    // Nothing was asked of the server yet, and no Checkout session either.
    expect(net.functionCalls).toEqual([]);
    await expect(offer.getByRole("button", { name: "Preparing secure payment…" })).toBeDisabled();

    // The visitor approves in the wallet sheet (played by the test).
    await page.evaluate(() => {
      const stub = (window as unknown as {
        __stripeStub: { handlers: Record<string, (ev: unknown) => void>; completed: string | null };
      }).__stripeStub;
      stub.handlers.paymentmethod({
        paymentMethod: { id: "pm_e2e" },
        payerEmail: "wallet-visitor@e2e.amiready.test",
        complete: (status: string) => {
          stub.completed = status;
        },
      });
    });

    await expect(page).toHaveURL(new RegExp(`/purchase-success\\?claim_code=${claimCode}&source=express$`));

    // The request for a payment: an anonymous id made on this device, and
    // nothing else. The amount (4900) and currency are fixed inside the
    // function, not sent by the app.
    const guestSessionId = await page.evaluate(() => localStorage.getItem("resilient_guest_session_id"));
    expect(guestSessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(net.functionCalls[0]).toEqual({ name: "create-payment-intent", body: { guestSessionId } });
    expect(await page.evaluate(() => localStorage.getItem("resilient_claim_code_last"))).toBe(claimCode);
    // The email the wallet gave was not sent anywhere by the funnel.
    expect(net.bodies.join("\n")).not.toContain("wallet-visitor@e2e.amiready.test");
    expect(pageErrors).toEqual([]);
  });

  test("the wallet payment is cancelled: the offer is usable again", async ({ page, stripeLoads }) => {
    await stripeLoads({ applePay: true });
    await walkToResult(page, PREPARED_HOUSE, { interstitials: "skip" });
    const offer = await openOffer(page);
    await offer.getByRole("button", { name: TEXT.en.offerCta }).click();
    await expect.poll(async () => (await stripeStub(page)).shown).toBe(1);
    await page.evaluate(() =>
      (window as unknown as { __stripeStub: { handlers: Record<string, () => void> } }).__stripeStub.handlers.cancel(),
    );
    await expect(offer.getByRole("button", { name: TEXT.en.offerCta })).toBeEnabled();
  });

  test("the server cannot open a checkout: an error is shown, the offer stays, and a second try works", async ({
    page,
    net,
    context,
    stripeLoads,
    mockFunction,
    pageErrors,
  }) => {
    await stripeLoads(null);
    await standInForStripeCheckout(page);
    await walkToResult(page, PREPARED_HOUSE, { interstitials: "skip" });
    const offer = await openOffer(page);

    // First try: the network is gone (the phone lost its connection).
    await context.route("**/functions/v1/create-guest-checkout", (route) => route.abort("internetdisconnected"));
    await offer.getByRole("button", { name: TEXT.en.offerCta }).click();
    await expect(page.getByText(TEXT.en.checkoutError)).toBeVisible();
    await expect(page).toHaveURL(/\/riskfunnel$/);
    await expect(offer.getByRole("button", { name: TEXT.en.offerCta })).toBeEnabled();

    // Second try: the function answers with an error.
    await context.unroute("**/functions/v1/create-guest-checkout");
    await mockFunction("create-guest-checkout", 500, { error: "STRIPE_SECRET_KEY is not configured" });
    await offer.getByRole("button", { name: TEXT.en.offerCta }).click();
    await expect(page.getByText(TEXT.en.checkoutError).first()).toBeVisible();
    await expect(offer.getByRole("button", { name: TEXT.en.offerCta })).toBeEnabled();
    // The server's own message is not shown to the visitor.
    await expect(page.getByText("STRIPE_SECRET_KEY")).toHaveCount(0);

    // Third try: it works.
    await context.unroute("**/functions/v1/create-guest-checkout");
    await mockFunction("create-guest-checkout", 200, { url: CHECKOUT_URL });
    await offer.getByRole("button", { name: TEXT.en.offerCta }).click();
    await expect(page).toHaveURL(CHECKOUT_URL);
    expect(net.functionCalls.filter((call) => call.name === "create-guest-checkout").length).toBeGreaterThanOrEqual(2);
    expect(pageErrors).toEqual([]);
  });

  test(
    "Stripe.js does not load (blocked or bad connection): the visitor can still go to Checkout",
    async ({ page, mockFunction }) => {
      test.fail(true, "Backlog F-21: the funnel does not do this yet.");
      // F-21. Checkout is a plain link to Stripe's page and needs no
      // Stripe.js, but the click waits on the Stripe.js that failed to load.
      // Stripe.js is not answered here, so the fixture aborts it.
      await mockFunction("create-guest-checkout", 200, { url: CHECKOUT_URL });
      await standInForStripeCheckout(page);
      await walkToResult(page, PREPARED_HOUSE, { interstitials: "skip" });
      const offer = await openOffer(page);
      await offer.getByRole("button", { name: TEXT.en.offerCta }).click();
      await expect(page).toHaveURL(CHECKOUT_URL, { timeout: 5_000 });
    },
  );

  test("closing the offer leaves the funnel for the home page", async ({ page }) => {
    // Recorded as it is (Phase U note): the result cannot be looked at again
    // without the offer on top of it.
    await walkToResult(page, PREPARED_HOUSE, { interstitials: "skip" });
    const offer = await openOffer(page);
    // Two "Close" buttons sit on top of each other in the corner; the upper
    // one, the dialog's own, is the one a finger reaches.
    await offer.getByRole("button", { name: "Close" }).last().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("h1").first()).toBeVisible();
  });
});

// ── 4. Leaving midway and coming back ───────────────────────────────────────

test.describe("leaving midway and returning", () => {
  const a = WORST_CASE;
  // How a chosen answer looks: the primary border, which the others only get on hover.
  const SELECTED = /(^|\s)border-primary(\s|$)/;

  test("after a reload the answers given so far are still filled in", async ({ page }) => {
    // Three questions answered, the third not yet confirmed.
    await page.goto(FUNNEL_URL);
    await answerLocation(page, a);
    await nextButton(page).click();
    await answerHome(page, a);
    await nextButton(page).click();
    await answerHousehold(page, a);

    await page.reload();

    // This test does not say on which question the visitor lands (that is
    // F-22): it starts from whichever of the three is shown and goes forward
    // from there, and on each one it meets the earlier answer must be there.
    const q1 = heading(page, TEXT.en.q1);
    const q2 = heading(page, TEXT.en.q2);
    const q3 = heading(page, TEXT.en.q3);
    await expect(q1.or(q2).or(q3)).toBeVisible();

    if (await q1.isVisible()) {
      await expect(page.getByRole("combobox")).toHaveText("Portugal");
      await expect(page.getByPlaceholder(TEXT.en.cityPlaceholder)).toHaveValue(a.city);
      await expect(page.getByPlaceholder(TEXT.en.postalPlaceholder)).toHaveValue(a.postalCode!);
      await nextButton(page).click();
      await expect(q2).toBeVisible();
    }
    if (await q2.isVisible()) {
      await expect(page.getByRole("button", { name: "Apartment" })).toHaveClass(SELECTED);
      await expect(page.getByRole("button", { name: "5+" })).toHaveClass(SELECTED);
      await expect(page.getByRole("button", { name: "House" })).not.toHaveClass(SELECTED);
      await nextButton(page).click();
    }
    await expect(q3).toBeVisible();
    for (const tag of ["Kids", "Elderly", "Medical needs", "Living alone"]) {
      await expect(page.getByRole("button", { name: tag })).toHaveClass(SELECTED);
    }
    await expect(page.getByRole("button", { name: "Pets" })).not.toHaveClass(SELECTED);
  });

  test("after a reload the visitor is on the question they had reached", async ({ page }) => {
    test.fail(true, "Backlog F-22: the funnel does not do this yet.");
    // F-22. The step is kept in memory only: a reload goes back to question 1.
    await page.goto(FUNNEL_URL);
    await answerLocation(page, a);
    await nextButton(page).click();
    await answerHome(page, a);
    await nextButton(page).click();
    await answerHousehold(page, a);
    await nextButton(page).click();
    await expect(heading(page, TEXT.en.q4)).toBeVisible();

    await page.reload();
    await expect(page.getByText("1/6").or(page.getByText("4/6"))).toBeVisible();
    await expect(heading(page, TEXT.en.q4)).toBeVisible({ timeout: 3_000 });
  });

  test("closing the tab and opening the funnel again resumes with the answers", async ({ page, context }) => {
    test.fail(true, "Backlog F-22: the funnel does not do this yet.");
    // F-22. The answers live in sessionStorage, which a new tab does not share.
    await page.goto(FUNNEL_URL);
    await answerLocation(page, a);
    await nextButton(page).click();
    await answerHome(page, a);
    await nextButton(page).click();
    await expect(heading(page, TEXT.en.q3)).toBeVisible();
    await page.close();

    const again = await context.newPage();
    await again.goto(FUNNEL_URL);
    await expect(again.getByText(/^\d\/6$/)).toBeVisible();
    await expect(heading(again, TEXT.en.q3)).toBeVisible({ timeout: 3_000 });
  });

  test(
    "coming back from Stripe's page without paying returns to the result, not to question 1",
    async ({ page, stripeLoads, mockFunction }) => {
      test.fail(true, "Backlog F-22: the funnel does not do this yet.");
      // F-22. create-guest-checkout sets Stripe's "back" address to
      // /riskfunnel?purchase=cancel, which the funnel does not recognise.
      await stripeLoads(null);
      await mockFunction("create-guest-checkout", 200, { url: CHECKOUT_URL });
      await standInForStripeCheckout(page);
      await walkToResult(page, PREPARED_HOUSE, { interstitials: "skip" });
      const offer = await openOffer(page);
      await offer.getByRole("button", { name: TEXT.en.offerCta }).click();
      await expect(page).toHaveURL(CHECKOUT_URL);

      await page.goto(`${FUNNEL_URL}?purchase=cancel`);
      await expect(page.getByText("1/6").or(heading(page, TEXT.en.resultTitle))).toBeVisible();
      await expect(heading(page, TEXT.en.resultTitle)).toBeVisible({ timeout: 3_000 });
    },
  );

  test("the browser's Back button returns to the previous question", async ({ page }) => {
    test.fail(true, "Backlog F-23: the funnel does not do this yet.");
    // F-23. The questions are not in the browser history and the funnel has
    // no Back of its own: Back leaves the funnel.
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible();
    await page.goto(FUNNEL_URL);
    await answerLocation(page, a);
    await nextButton(page).click();
    await answerHome(page, a);
    await nextButton(page).click();
    await expect(heading(page, TEXT.en.q3)).toBeVisible();

    await page.goBack();
    await expect(heading(page, TEXT.en.q2)).toBeVisible({ timeout: 3_000 });
  });

  test("what the funnel keeps on the device, and where", async ({ page }) => {
    await page.goto(FUNNEL_URL);
    await answerFirstHalf(page, a);
    await page.getByRole("button", { name: "Skip" }).click();
    await answerKit(page, a);

    const stored = await page.evaluate(() => ({
      session: Object.fromEntries(Object.entries(sessionStorage)),
      local: Object.fromEntries(Object.entries(localStorage)),
    }));

    // The answers: one sessionStorage entry, readable as it is (not
    // encrypted), gone when the tab closes. Noted for the privacy phase: it
    // holds a city, a postal code and "medical needs" in the household.
    expect(Object.keys(stored.session).sort()).toEqual(["analytics_session_id", "resilient_risk_funnel"]);
    expect(JSON.parse(stored.session.resilient_risk_funnel)).toEqual({
      country: "PT",
      city: "Lisboa",
      postalCode: "1100-148",
      homeType: "apartment",
      floorLevel: "5",
      householdTags: ["kids", "elderly", "medical", "alone"],
      emergencyExperience: "never",
      hasKit: "no",
      hasEvacuationPlan: "",
      hasWater3Days: false,
      hasPowerBackup: false,
      hasEmergencyContacts: false,
    });
    // Nothing of the answers outlives the tab.
    const lasting = JSON.stringify(stored.local);
    for (const answer of ["Lisboa", "1100-148", "medical", "elderly"]) expect(lasting).not.toContain(answer);
  });
});

// ── 5. With no network ──────────────────────────────────────────────────────

test("the connection drops before the analysing screen: the result still appears", async ({
  page,
  context,
  pageErrors,
}) => {
  const c = CASES[1];
  await page.goto(FUNNEL_URL);
  await answerFirstHalf(page, c.answers);
  await page.getByRole("button", { name: "Skip" }).click();
  await answerKit(page, c.answers);
  await nextButton(page).click();
  await page.getByRole("button", { name: TEXT.en.plan[c.answers.plan] }).click();

  await context.setOffline(true);
  await nextButton(page).click();

  await expect(heading(page, TEXT.en.analyzing)).toBeVisible({ timeout: 10_000 });
  await expect(heading(page, TEXT.en.resultTitle)).toBeVisible({ timeout: 15_000 });
  expect(await readResult(page)).toEqual({ level: c.level, score: c.score, outOf: 100, reasons: c.reasons });
  expect(pageErrors).toEqual([]);
});

// ── 5. In Portuguese ────────────────────────────────────────────────────────

test.describe("on a Portuguese phone", () => {
  // The funnel has no language switch: it follows the phone's language.
  test.use({ locale: "pt-PT" });

  test("the questions, the result and the offer are in Portuguese, and the price is the same €49", async ({
    page,
    stripeLoads,
    pageErrors,
  }) => {
    await stripeLoads(null);
    const c = CASES[2];
    // walkToResult checks each Portuguese heading on the way.
    await walkToResult(page, c.answers, { lang: "pt" });

    // Same answers, same score; the words are Portuguese.
    expect(await readResult(page, "pt")).toEqual({
      level: "Alto",
      score: c.score,
      outOf: 100,
      reasons: ["Localização em Hamburg apresenta riscos específicos", "Reserva de água para 3+ dias é essencial"],
    });

    const offer = await openOffer(page, "pt");
    await expect(offer.getByText("Feito para Hamburg. Acesso instantâneo após pagamento.")).toBeVisible();
    await expect(offer.getByText("Pagamento único €120 €49 · Sem subscrições")).toBeVisible();
    await expect(offer.getByText(/Desconto expira em \d\d:\d\d/)).toBeVisible();
    await expect(offer.getByRole("button", { name: "COMEÇAR AGORA" })).toBeEnabled();
    expect(euroAmounts(await offer.innerText())).toEqual([49, 120, 49]);
    expect((await stripeStub(page)).paymentRequests[0].total.amount).toBe(4900);

    // No English left on the offer.
    await expect(offer.getByText(/One-time|No subscriptions|Instant access|START NOW/)).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
});

// ── 6. What leaves the phone before payment ─────────────────────────────────

test("before payment: who is contacted, and what is sent", async ({ page, net, pageErrors }) => {
  const a = WORST_CASE;
  await walkToResult(page, a);
  const shown = await readResult(page);
  const offer = await openOffer(page);
  await offer.getByRole("button", { name: TEXT.en.offerCta }).click();
  await expect(page.getByText(TEXT.en.checkoutError)).toBeVisible();
  // Let the last analytics row leave.
  await expect.poll(() => net.tracked.some((t) => t.row.action === "checkout_click")).toBe(true);

  // Third parties. Stripe.js is fetched when the funnel opens, before any
  // question is answered; the four faces under "Over 4,000 active users" are
  // loaded from Unsplash on every question. Both learn the visitor's IP
  // address and that they are on this page. Nobody else is contacted.
  const hosts = [...new Set(net.thirdParty.map((url) => new URL(url).hostname))].sort();
  expect(hosts).toEqual(["images.unsplash.com", "js.stripe.com"]);

  // Our own server: analytics rows, and at the end one function call.
  expect(net.otherSupabase).toEqual([]);
  // (Stripe.js is not answered in this test, so because of F-21 not even
  // that call is made; once F-21 is fixed it is the only one allowed.)
  expect(net.functionCalls.map((call) => call.name).filter((name) => name !== "create-guest-checkout")).toEqual([]);
  // In particular nothing goes to the AI function (generate-risk-insights
  // calls OpenAI; it belongs to the paid risk assessment, not to this funnel).
  expect(net.functionCalls.map((call) => call.name)).not.toContain("generate-risk-insights");

  const sessionId = await page.evaluate(() => sessionStorage.getItem("analytics_session_id"));
  const pageViews = net.tracked.filter((t) => t.table === "page_views").map((t) => t.row);
  expect(pageViews).toHaveLength(1);
  expect(pageViews[0]).toEqual({
    path: "/riskfunnel",
    referrer: null,
    user_agent: await page.evaluate(() => navigator.userAgent),
    session_id: sessionId,
    user_id: null,
  });

  const usage = net.tracked.filter((t) => t.table === "feature_usage").map((t) => t.row);
  for (const row of usage) {
    expect(row.feature_name).toBe("risk_funnel");
    expect(row.session_id).toBe(sessionId);
    expect(row.user_id).toBeNull();
  }
  const names = ["location", "home_type", "household", "emergency_experience", "interstitial_1", "emergency_kit",
    "evacuation_plan", "interstitial_2", "analyzing", "results"];
  const step = (n: number) => ({ funnel: "riskfunnel", step: n, step_name: names[n - 1] });
  const of = (action: string) =>
    usage
      .filter((row) => row.action === action)
      .map((row) => row.metadata as { step: number })
      .sort((x, y) => x.step - y.step);
  // Which step was seen and which was completed: no answers.
  expect(of("step_view")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(step));
  expect(of("step_complete")).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map(step));
  // The one row derived from the answers: the result, when "START NOW" is
  // pressed. What is sent is what the visitor was shown, whatever that is.
  expect(shown.level).toBe("High");
  expect(usage.filter((row) => row.action === "checkout_click").map((row) => row.metadata)).toEqual([
    { funnel: "riskfunnel", risk_level: shown.level.toLowerCase(), score: shown.score },
  ]);
  expect(usage).toHaveLength(10 + 9 + 1);

  // None of the answers themselves is in anything that was sent.
  const sent = net.bodies.join("\n");
  for (const answer of [a.city, a.postalCode!, "medical", "elderly", "kids", "apartment", '"PT"']) {
    expect(sent).not.toContain(answer);
  }
  // And no email address: the funnel never asks for one.
  expect(sent).not.toMatch(/[^\s"@]+@[^\s"@]+\.[a-z]{2,}/i);
  expect(pageErrors).toEqual([]);
});
