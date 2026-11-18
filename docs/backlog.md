# Backlog

The dependency graph for the project. A task is **unblocked** when every task
in its "Needs" column is `done`. Tasks with no dependency between them can run
in parallel.

Status values: `todo`, `doing`, `done`, `blocked` (say why in the notes).

Tags: `[HUMAN]` needs the owner to act (accounts, keys, a real phone).
`[DECISION]` needs the owner to choose. `[PRIVACY]` must pass the
privacy-reviewer.

Phases run in order A, F, P, B, S, U, but a task only waits for the tasks it
names. Owner priority (2026-11-10): prove the core features and the funnels
work, with tests, before wiring real payments, email and AI.

## Phase A: foundations

| ID | Task | Needs | Status |
|---|---|---|---|
| A-01 | Clean install, CI, browser test harness | none | done |
| A-02 | `[HUMAN]` Own Supabase project and hosting | none | todo |
| A-03 | `[DECISION]` Confirm scope: freeze non-core features | none | done |
| A-04 | Lint to zero errors, then gate CI on lint | A-01 | todo |
| A-05 | `[PRIVACY]` Edge function authorization audit | A-01 | todo |
| A-06 | Local Supabase test harness with a signed-in test user | A-01 | done |
| A-07 | Remove frozen features from the build | A-03 | todo |
| A-08 | The magic-link sign-up test does not flake | A-06 | todo |

**A-02.** Create a Supabase project the owner controls, apply every migration
to it, set the function secrets, deploy the functions, and point `.env` at it.
Choose hosting for the web app.
Project created on 2026-11-10 (ref in `supabase/config.toml`, EU region).
Migrations and functions are deployed by the `Supabase deploy` workflow.
The hourly email job reads `app.settings.supabase_url` and
`app.settings.service_role_key`, which must be set on the new database.
Hosting requirements that come from the service worker (B-01): serve `sw.js`
and `index.html` with `Cache-Control: no-cache`, or users stay on an old
version; answer app routes (for example `/panic`) with `index.html`, or a first
visit to a deep link fails; keep serving real files such as `robots.txt` and
`/.well-known/*` as themselves.
Accepted when: `supabase db push` succeeds on the empty project; a new user can
sign up and sign in on the deployed app.

**A-03.** Decided by the owner on 2026-11-10.
Keep: vault, plans A and B, Red Folder PDF, panic button, check-in.
Freeze for now: news ingestion (six sources), weekly briefing, expert chat
(depends on the Lovable AI gateway), Amazon products, the duplicate
subscription funnel `RiskFunnel1`.

**A-04.** `npx eslint .` reports 36 errors today.
Accepted when: it reports zero errors and CI runs it as a required step.

**A-05.** There are 31 edge functions. `supabase/config.toml` sets
`verify_jwt = false` on 24 of them, `true` on one, and does not list six.
Accepted when: `docs/edge-functions.md` lists every function with who may call
it and how the function enforces that; each function that should require a user
has a test proving an unauthenticated call is rejected.
Found while reviewing F-08 (2026-11-18), to be fixed here, each with a test:
- `checkin-cron` (lines 114-126): no caller check, service role. Anyone can
  POST to it and advance `missed_count` for every overdue session, which
  sends emergency emails to contacts. **This must be closed before
  `RESEND_API_KEY` is set on the hosted project** (see the owner checklist).
- `send-scheduled-emails`: not in `config.toml`, no caller check, service
  role, sends the queued emails.
- The six `ingest-*` functions: no caller check, service-role writes.
- `set-guest-email` (lines 35-80): unauthenticated; anyone holding a claim
  code can overwrite `payer_email` on a purchase in `created` or `paid`.
- `generate-plan-wizard` (lines 108-133) and `generate-risk-insights` (lines
  84-91): sign-in is optional, so anonymous callers skip the rate limit and
  reach OpenAI.
For S-01 (logs and plaintext flows): `checkin-cron` logs recipients, names
and the first 200 characters of the email when no Resend key is set, and
sends contact name and email and the user's name to Resend;
`checkin-respond:59` logs the check-in token; `set-guest-email`,
`complete-guest-purchase`, `complete-express-purchase`, `stripe-webhook` and
`admin-manage-user` log email addresses; `generate-plan-wizard:218` logs the
raw model response. For S-04: no function that calls an AI provider checks
consent.

**A-08.** `e2e/backend/signup-master-password.spec.ts:524` (magic-link
sign-up) failed once and passed on retry in CI run 44281457084:
`toHaveURL(/\/dashboard$/)` timed out after 5 seconds on the way through
`/auth/callback`. A test that sometimes fails gets ignored.
Accepted when: the cause is found (slow callback, or a real race in
`AuthCallback.tsx`) and fixed where it lies; the test passes 20 times in a
row in CI with retries off.

**A-06.** Unblocks all of phase F. Run Supabase locally (CLI) in CI, seed a premium test user, and give
Playwright a signed-in fixture. Add a way to run edge function tests.
Accepted when: a browser test signs in as the seeded user and reaches the
dashboard, in CI.
Done. CI starts a local Supabase stack (CLI pinned to 3.1.0), checks that
every migration is applied, serves the edge functions with dummy provider keys
(`e2e/backend/functions.env`), builds the app against the local stack and runs
two Playwright projects: `mobile-chrome` (no backend, runs everywhere) and
`backend` (`e2e/backend`, only with `E2E_BACKEND=1`, which
`npm run test:e2e:backend` sets). How to run it and how it is put together:
README, "Backend tests". What to import in a test: `e2e/backend/fixtures.ts`.
All 26 migrations apply to the local stack unchanged, including the `pg_cron`
job, whose `app.settings.*` values are only read when the job runs.
The hosted project cannot be reached by the harness: the stack URL comes from
`supabase status` and anything that is not on this machine is refused
(`scripts/local-supabase.mjs`, unit-tested); the seed is a script outside
`supabase/`, so the deploy workflow cannot carry it; a backend run fails
before the first test if the build contains a hosted URL; and a page under
test cannot reach any host but this machine.
The dashboard is not behind the master password, so the seeded user has none;
setting one is F-01.
Limits. Function calls to Stripe, Resend and OpenAI are not intercepted: with
the dummy keys the provider refuses them, and browser tests mock the function's
response instead (F-09 for tests that need the function itself to run). The
functions served were a copy with rewritten imports until F-08; they are now
`supabase/functions` itself. Locally the backend
project needs Docker; without it `npm run verify` runs `mobile-chrome` only
and says so, and the backend tests are verified by CI.
Not verified: running the stack on a developer machine (brought up in CI
only); sign-up and magic link on the local stack, where email confirmation is
off by default and mail goes to Mailpit, which F-01 must check against the
hosted project's settings.

**A-07.** Remove routes, navigation entries, edge functions and cron jobs of
every feature marked freeze in A-03. Keep the code recoverable from git history.
Accepted when: the build contains no frozen route; no reference to
`ai.gateway.lovable.dev` or `LOVABLE_API_KEY` remains; `npm run verify` passes.

## Phase F: the core features and funnels work

One end-to-end browser test per core feature, walking the app as a user does,
against a local Supabase (A-06). External services are stood in for: Stripe and
OpenAI responses are mocked at the network edge, and email is asserted as
"would be sent" without sending. A test here that cannot pass because the
feature is broken is the point of the phase: record the bug as a new F task,
fix it in its own change, and never bend the test around it.

| ID | Task | Needs | Status |
|---|---|---|---|
| F-01 | Sign up, sign in, set the master password | A-06 | done |
| F-02 | Vault: save, lock, unlock, read | F-01 | todo |
| F-03 | Plans A and B through the wizard | F-01 | todo |
| F-04 | Red Folder PDF from the user's real data | F-02, F-03 | todo |
| F-05 | Panic setup, test mode, and a check-in session | F-01 | todo |
| F-06 | Risk funnel up to the payment screen | A-01 | doing |
| F-07 | After purchase: premium unlock, claim, onboarding | A-06 | todo |
| F-08 | Edge functions boot on the local runtime as written | A-06 | done |
| F-09 | Tests can stand in for Stripe, Resend and OpenAI inside edge functions | A-06 | todo |
| F-10 | The Recovery Kit is shown after the master password is created | F-01 | todo |
| F-11 | Signed out, the routes behind the master password gate offer sign-in | F-01 | todo |
| F-12 | Edge functions are type-checked in CI | F-08 | todo |
| F-13 | One way to start a function: `Deno.serve`, no `deno.land` imports | F-08 | todo |
| F-20 | The funnel's score stays within 0 to 100 and every risk category can be reached | F-06 | todo |
| F-21 | Checkout opens from the funnel when Stripe.js has not loaded | F-06 | todo |
| F-22 | The funnel resumes where the visitor left off | F-06 | todo |
| F-23 | The visitor can go back one question in the funnel | F-06 | todo |
| F-24 | The price has one source, and the price charged is checked against it | F-09 | todo |
| F-25 | [DECISION] The funnel's sales claims: keep only what is true | F-06 | todo |

**F-01.** Accepted when: a browser test creates an account, lands signed in,
sets a master password, signs out, signs in again and unlocks with that
password; a wrong master password is refused with a clear message.

Tested by `e2e/backend/signup-master-password.spec.ts`: sign-up with email and
password and with a magic link read from Mailpit, the master password set at
the vault, sign-out, sign-in, unlock, a wrong master password, a reload. The
stored `user_vault_keys` row is checked column by column and opened outside
the app with the right password only. A purchase is stood in for by setting
`premium_entitlements` (buying is F-07). Two tests in that file are marked
`test.fail` for the bugs it found: F-10 and F-11. Green in CI run 42827717384
(24 passed, the two known failures among them).
Not covered: sign-up on a project with email confirmation switched on (the
local stack confirms at once); OAuth, which the app does not offer.

**F-02.** Accepted when: a browser test saves data in at least two vault
sections, locks the vault, unlocks it, reads the same data back, reloads the
page and reads it again; the database rows for that user hold ciphertext only.

**F-03.** `generate-plan-wizard` calls OpenAI; mock its response.
Accepted when: a browser test completes every wizard step, receives plans A and
B, edits one section, reloads and finds the edit saved; a failed generation
shows an error the user can act on and loses none of the answers given.

**F-04.** Accepted when: a browser test generates the PDF for a user with vault
data and plans, and the downloaded file is a valid PDF containing a value typed
into the vault and a line from each plan.

**F-05.** Delivery itself belongs to phase P; this covers the screens.
Accepted when: a browser test adds two contacts and a scenario, runs a test
activation to completion and sees it in the history; starts a check-in session,
responds to it, and stops it. No message is shown that claims an alert reached
anyone.

**F-06.** Mock Stripe. Covers the one-time funnel (`RiskFunnel`); the
subscription duplicate is frozen.
Accepted when: a browser test answers every funnel question, sees a result that
matches the answers given, and reaches the payment screen with the right
amount; leaving midway and returning resumes where the user left off.

Tested by `e2e/risk-funnel.spec.ts` (22 tests, no backend needed: everything
the funnel sends is answered at the network edge and the request is what is
asserted) and `e2e/backend/risk-funnel.spec.ts` (2 tests: the analytics rows
as stored on the local stack; the real `create-guest-checkout` refused by
Stripe). Status is `doing`, not done, because two acceptance points are open:

- "Resumes where the user left off" is not true: F-22. Three tests are marked
  `test.fail` for it. What does hold, and is tested: after a reload in the
  same tab the answers already given are still filled in.
- "The payment screen with the right amount" is proven only as far as the app
  goes. The payment screen is not ours: it is Stripe's hosted Checkout page,
  or the phone's Apple Pay / Google Pay sheet. Proven: the offer shows €49;
  the wallet sheet is asked for 4900 cents in EUR; with no wallet, the
  browser is sent to the URL `create-guest-checkout` returned, and the app's
  request for it is exactly `{ source: "riskfunnel" }`. Not proven by any
  test: the amount on Stripe's page, which is whatever the Stripe price
  behind the secret `STRIPE_PRICE_ID_PREMIUM` says (F-24).

Found on the way, each with its own `test.fail`: F-20 (a score of 110/100;
"Low" cannot be reached), F-21 (no checkout when Stripe.js does not load),
F-23 (Back leaves the funnel). Owner decision: F-25.

How the funnel relates to the rest: nothing in the app links to
`/riskfunnel`; it is reached only by a direct link (ads). The landing page
and every "risk check" link go to the free calculator, `/tools/risk`
(`RiskCalculator`, `src/components/riskWizard`), which shares no code with
the funnel, scores differently, and sells through `/pricing`.
`StripeGuestWalletModal.tsx` and `ProductPopup` in `RiskFunnel.tsx` are used
by nothing. The funnel has no email step: no address is asked for or sent
before payment.

What leaves the phone before payment (asserted in the last test of the
spec): one `page_views` row (path, referrer, user agent, a random session
id); twenty `feature_usage` rows saying which step was seen and completed;
and, when "START NOW" is pressed, the risk level and score. None of the
answers, and nothing to the AI function. Third parties contacted: Stripe.js
is fetched when the funnel opens, and four stock photos are loaded from
`images.unsplash.com` on every question. For phase S: the answers (city,
postal code, "medical needs") sit unencrypted in `sessionStorage` under
`resilient_risk_funnel` until the tab closes; `page_views` and
`feature_usage` are not in a data inventory; and step 1 says "your answers
stay private unless you choose to save", though there is nothing to save.

Not covered: the edge functions and Stripe themselves (F-09), the purchase
page after payment (F-07), 3-D Secure in the wallet path, a real phone
wallet.

**F-07.** Start from a completed purchase created directly in the database.
Accepted when: a browser test for a guest purchase claims it into an account,
sees premium features unlocked, and completes the four onboarding steps; a user
without a purchase is shown the paywall on each premium route.

**F-08.** Found by A-06. Every function imports from esm.sh by URL, and
`supabase-js@2.57.2` there depends on `storage-js@^2.10.4`, which floats. With
storage-js 2.99.1 the type declarations esm.sh attaches point at a file that
no longer exists, and on the local edge runtime (CLI 3.1.0, edge-runtime
1.78.1) every function fails to boot: `Module not found
".../storage-js@2.99.1/dist/module/StorageClient"`. The test harness works
around it by serving a copy with `?no-dts` imports
(`scripts/local-functions.mjs`). The deploy of 2026-11-10 succeeded, so the
hosted bundler did not trip on it then; whether the deployed functions boot,
and whether the next deploy will bundle, is not verified. A floating
dependency also means the deployed code can change on a redeploy of the
same commit. Pin the
dependencies (per-function `deno.json` with `npm:` specifiers, or one import
map) so that what is tested is what is deployed.
This must land before any other merge that touches `supabase/**`: such a
merge redeploys every function, and a redeploy re-resolves the floating
dependency. The functions deployed on 2026-11-10 were bundled about two and a
half hours before the local failure appeared, so they are probably working
frozen bundles.
Accepted when: `supabase functions serve` serves `supabase/functions` itself
in CI, `scripts/local-functions.mjs` and its copy step are deleted, and the
backend tests pass; and, after the deploy that follows the merge, a call to at
least one deployed function returns its expected answer rather than a 5xx.
`[HUMAN]` for that last check: nobody but the owner can reach the hosted
project. Give the owner the exact request to run and the answer to expect.
Doing; everything but the `[HUMAN]` check is finished. Each function has a
`deno.json` naming its packages at exact npm versions (`supabase-js` 2.57.2,
`stripe` 18.5.0, `resend` 4.0.0) and a `deno.lock` with every transitive
package; nothing is imported from esm.sh. The five functions that imported
`supabase-js@2` unpinned (`panic-trigger`, `panic-confirm`, `panic-cancel`,
`run-ai-job`, `admin-manage-user`) now run 2.57.2 like the rest. CI serves
`supabase/functions` itself, checks every lockfile with Deno
(`npm run functions:check-locks`) and calls every function once
(`e2e/backend/functions-boot.spec.ts`); the copy script is deleted. The deploy
workflow now uses the CLI version CI tests with and stops if Docker is
missing, because bundling on Supabase's side ignores the lockfiles. How it
works and how to change a version: README, "Edge function dependencies".
After each deploy the workflow now asks every deployed function for a CORS
preflight (`scripts/smoke-deployed-functions.mjs`, no side effects) and the
run fails if any does not boot; functions whose gateway requires a signed-in
caller are reported as "not shown" rather than counted as booted. The
workflow also takes a list of function names (`only`), to deploy a change to
one function before all of them.
Order for the first deploy: one function of a frozen feature through `only`,
from the branch; if its check passes, merge, which redeploys all 31 and checks
them all.
If a function does not boot: its body names `BOOT_ERROR` or `WORKER_ERROR`.
Reverting the merge commit on `main` redeploys the previous sources, but that
is not a sure way back, because those sources resolve their dependencies again
at that moment, which is the fault this task removes; Supabase keeps no
earlier version of a function to return to. The safer answer is the
function's log in the Supabase dashboard and a fix forward.
Optional checks the owner can run by hand, none of which writes, sends or
charges: `POST` with no `Authorization` header to `panic-trigger`,
`panic-confirm` and `panic-cancel` under
`https://fnzbetsgumaamshcopbd.supabase.co/functions/v1/` should answer 401
`{"error":"Unauthorized"}`, which shows the Supabase client is constructed.
Verified in CI: with a wrong integrity hash in one `deno.lock`, the runtime
that serves the functions refuses to boot that function (`failed reading
lockfile ... Integrity check failed`), so `functions serve` does resolve from
the lockfile. With the same fault in `panic-trigger` only (CI run 44280854825),
the readiness probe passed and `functions-boot.spec.ts` failed for that one
function with `panic-trigger answered 503: {"code":"BOOT_ERROR",...}` while
the other 30 passed: the boot test does catch a function that cannot start.
Deployed on 2026-11-18. First `ingest-news` alone (run 44282761765, bundle
860 kB against 102 kB before, so the npm packages are in it), then
`stripe-webhook` alone, which loads all three packages (run 44283562741, 2.8
MB), then all 31 on merge (run 44284113137): `31 booted, 0 not shown, 0
failed`. The seven functions whose gateway requires a signed-in caller
answered the preflight too.
Not verified: that the uploaded bundles hold exactly the locked transitive
versions (inferred from the shared runtime image and the bundle sizes); any
call beyond module load on the hosted project. The owner can still run the
three `POST` checks above.

**F-09.** Found by A-06. The functions call `api.stripe.com`,
`api.resend.com` and `api.openai.com` at fixed addresses, so a test that needs
the function itself to run (P-02 delivery, `stripe-verify-session`, the
webhook's receipt email) has no way to answer for the provider; today such a
call leaves CI and is refused for its dummy key. Read each provider's base URL
from the environment, defaulting to the real one, and add a stub server to the
harness that records what it was sent.
Accepted when: a backend test drives one function per provider against the
stub and asserts on the request the stub received; with the variable unset
the function uses the real address.

**F-10.** Found by F-01. The screen for creating a master password says "Step
1 of 2 — Next you will save the Recovery Kit", and the user ticks "if I lose
both the password and the Recovery Kit I permanently lose access". The
Recovery Kit screen never appears: the vault opens straight away. The 24-word
phrase is generated, used to wrap the key and stored
(`recovery_encrypted_master_key`), then thrown away unseen. So no user has a
Recovery Kit, the "Forgot?" link on the unlock screen asks for words nobody
was given, and a forgotten master password loses the vault for good while the
app has said otherwise.
Cause: `MasterKeyGate` renders its children as soon as the key is unlocked
(`src/components/security/MasterKeyGate.tsx:28`), and `setup()` unlocks the
moment the row is inserted (`src/contexts/VaultKeyContext.tsx:217`). That
unmounts `MasterPasswordScreen`, whose `generatedPhrase` state was to show
`RecoveryKitPanel` (`src/components/security/MasterPasswordScreen.tsx:70`).
Accounts that already have a master password have no kit either: the fix
needs a way for an unlocked user to create a new kit (new phrase, recovery
columns rewrapped), and should say so to those users.
Accepted when: "after creating a master password the Recovery Kit must be
saved before the vault opens" in `e2e/backend/signup-master-password.spec.ts`
passes with its `test.fail` removed; and a browser test for an account that
set its master password before the fix creates a kit from inside the app,
forgets the password, and gets back in with the "Forgot?" flow and that kit.

**F-11.** Found by F-01. A signed-out visitor who opens `/premium/vault`,
`/premium/plans`, `/premium/plans/wizard`, `/premium/red-folder` or
`/premium/backup` (an old bookmark, a link from the Pricing page, a session
that expired) gets a completely empty white page: no navigation, no message,
no way to sign in. Nothing protected is shown; it is a dead end.
Cause: for a signed-out user `MasterKeyGate` renders nothing
(`src/components/security/MasterKeyGate.tsx:31`) and its comment leaves the
redirect to "the parent route's auth gate". No route in `src/App.tsx` has
one. Each page has its own sign-in card (`LoginGateCard` in `Vault.tsx`), but
the gate is outside the page, so the card is never reached.
Accepted when: "signed out, the vault address offers a way to sign in instead
of an empty page" in `e2e/backend/signup-master-password.spec.ts` passes with
its `test.fail` removed, extended to the other four routes; after signing in
from there the user is returned to the route they asked for.

**F-12.** Found by F-08. Nothing type-checks the edge functions: CI resolves
their imports (`deno cache --frozen`) and boots them, but a call with the
wrong arguments is only found when that line runs. With the packages now
coming from npm with their types, `deno check` can run per function.
Accepted when: CI runs `deno check` on every function and fails on a type
error; the errors it finds on the first run are fixed or listed as new tasks.

**F-13.** Found by F-08. Seventeen functions start with `serve` from
`deno.land/std` 0.168.0 or 0.190.0, which Deno has retired in favour of the
built-in `Deno.serve` that the other fourteen use, and `generate-risk-insights`
loads an XMLHttpRequest polyfill from `deno.land/x` that drags in a 2021
standard library. They are exact versions and their hashes are locked, so
nothing floats, but a deploy of those functions depends on `deno.land`
answering while they are bundled. F-08 left them alone because
replacing them changes code, not only imports.
Accepted when: no file under `supabase/functions` imports by URL, the test in
`scripts/function-deps.test.mjs` forbids it, and the backend tests pass.

**F-20.** Found by F-06. The result of the risk funnel can be impossible. A
visitor in a high flat with children, an elderly relative and medical needs,
with nothing prepared, is shown "Score: 110/100". And no visitor can be shown
"Low": the best answers the funnel accepts give 53, "Moderate".
Cause: `calculateScore` in `src/pages/riskFunnel/shared.tsx:120-159` caps
exposure at 70 and the preparedness gap at 40 and adds them, so the total
reaches 110. Exposure starts at 35, adds 10 for every visitor whatever the
country or city (line 124) and at least 8 for the home, so the minimum is 53,
while `getRiskLevel` (line 161) ends "Low" at 40. The country is asked for
and never used. The three "quick checks (optional)" switches count as "no"
when left alone (lines 147-149), adding 18 points and the reason "Water
supply for 3+ days is essential" for a visitor who skipped them.
The owner chooses the scale; the tests only require it to be coherent.
Accepted when: `the score never goes above the 100 it is shown out of` and
`the best answers the funnel accepts are rated Low` in
`e2e/risk-funnel.spec.ts` pass without `test.fail`, and the expected scores
in that file's table are updated by hand to the new rules.

**F-21.** Found by F-06. When Stripe.js cannot be loaded (a content blocker,
a network that blocks `js.stripe.com`, a connection that drops), pressing
"START NOW" on the offer shows "Error opening checkout" every time, and the
visitor cannot buy. The checkout they would get is a plain link to Stripe's
page and needs no Stripe.js.
Cause: `handleCheckout` in `src/pages/riskFunnel/RiskFunnel.tsx:269` awaits
`stripePromise`, which rejects when the script fails to load; the rejection
lands in the `catch` at line 283 before `create-guest-checkout` is called.
Accepted when: `Stripe.js does not load (blocked or bad connection): the
visitor can still go to Checkout` in `e2e/risk-funnel.spec.ts` passes without
`test.fail`.

**F-22.** Found by F-06; it is the open acceptance point of F-06. A visitor
who leaves the funnel midway does not come back to where they were.
Reloading the page returns to question 1 (the answers are still filled in,
but every question has to be confirmed again and the waiting screens sat
through). Closing the tab and opening the funnel again starts empty. Going
to Stripe's page and pressing its back arrow returns to question 1, not to
the result and the offer.
Cause: the step is React state only (`RiskFunnel.tsx:82`); the answers are in
`sessionStorage` (lines 88 and 215), which a new tab does not share; and
`create-guest-checkout` sends Stripe the return address
`/riskfunnel?purchase=cancel`, which the funnel never reads. There is also
no "start over". Where the answers are kept is a privacy question too (see
F-06): decide it together with phase S.
Accepted when: `after a reload the visitor is on the question they had
reached`, `closing the tab and opening the funnel again resumes with the
answers` and `coming back from Stripe's page without paying returns to the
result, not to question 1` in `e2e/risk-funnel.spec.ts` pass without
`test.fail`; then F-06 can be closed.

**F-23.** Found by F-06. There is no way back inside the funnel. A visitor
who tapped the wrong answer cannot return to it: the screens have no Back
button, and the browser's Back leaves the funnel for the page before it
(for a visitor arriving from an ad, out of the site).
Cause: the steps are not in the browser history and
`FunnelQuestionsLayout` (`shared.tsx:613`) offers no control for it.
Accepted when: `the browser's Back button returns to the previous question`
in `e2e/risk-funnel.spec.ts` passes without `test.fail`.

**F-24.** Found by F-06. The price is written in about thirty places and no
test can say what a buyer is charged. The visitor sees "€49" (`priceNow={49}`
in `RiskFunnel.tsx:307`, and as text in `RiskOfferModal.tsx:176-177`,
`Pricing.tsx`, `translations.ts` as "49€", the FAQ, the Terms, the paywall
and dashboard buttons, three email templates under `supabase/functions`).
The wallet path charges `amount: 4900, currency: "eur"`, written once in the
browser (`RiskFunnel.tsx:134-135`, what the wallet sheet shows) and again in
`create-payment-intent/index.ts:55-56` (what is charged) and `:81-82` (what
is recorded). The Checkout path charges whatever the Stripe price named by
the secret `STRIPE_PRICE_ID_PREMIUM` says, in whatever currency it has, with
promotion codes allowed. Change any one of these and the others keep saying
€49. The purchase email says "€49" whatever was paid.
Accepted when: the amount and currency are defined once per side (app,
functions) and every text and call reads them; with the Stripe stand-in of
F-09, a test fails if the amount or currency of the Checkout price differs
from the price shown on the offer.

**F-25.** [DECISION] Found by F-06. The funnel makes claims that only the
owner can stand behind. Under every question: "Over 4,000 active users who
trust our preparedness guidance", "Excellent", five stars drawn in
Trustpilot's green, "Based on 56,334 reviews", and four stock photographs
from Unsplash as the users' faces (`shared.tsx:31-36, 309-332`). On the
offer: "Discount expires in 10:00", a countdown that restarts every time the
offer is opened and, at zero, disables the buy button (`RiskOfferModal.tsx`,
`disabled={loading || secondsLeft === 0}`) while the price stays €49; a
crossed-out "€120" that was never the price (`priceWas={120}`); "Works
offline after purchase", which phase B has not yet made true; "Consult
experts for guidance". The analysing screen shows "Checking location
context" while nothing is checked, and the first reason on every result is
"Location in <city> presents specific risks" whatever the city.
Needed from the owner: for each claim, the evidence, or the decision to
remove or reword it. The invariant "what the app says about privacy and
offline matches what the code does" covers the offline line; the rest is
consumer law (invented reviews and false urgency are unfair commercial
practices in the EU) and belongs with the legal review in the owner
checklist.
Accepted when: every claim on the funnel and the offer is either backed by
a source the owner names or gone, and a test asserts the removed texts are
absent.

## Phase P: a panic button that tells the truth

| ID | Task | Needs | Status |
|---|---|---|---|
| P-01 | Server-side confirmation of an activation | A-06 | todo |
| P-02 | `[HUMAN]` Real delivery by email and SMS | P-01 | todo |
| P-03 | Capture location on activation | A-06 | todo |
| P-04 | Honest status in the UI | P-02 | todo |
| P-05 | Check-in works end to end | P-02 | todo |
| P-06 | Test mode sends a real, labelled test message | P-02 | todo |

**P-01.** Today the 5 second cancel window is a timer in the browser
(`src/hooks/usePanicTrigger.ts`); if the app closes, nothing confirms. Move the
deadline to the server: an activation not cancelled by its deadline confirms
itself. Replace the "3 real activations per hour" limit with de-duplication so
a real activation is never refused.
Accepted when: a test triggers an activation, makes no further client call, and
sees it confirmed and its notifications dispatched after the window; a test
cancels inside the window and sees nothing dispatched.

**P-02.** `panic-confirm` only inserts `panic_notifications` rows and has a
`TODO` where sending should be. Send email through Resend from a verified
domain and SMS through a provider. Record per-notification `sent` or `failed`
with the provider's message id or error. Retry failures.
Owner provides: SMS provider account and key, verified sending domain.
Accepted when: with provider calls mocked, a confirmed activation produces one
send per contact per channel and the rows reflect each provider result; a
provider failure is recorded as `failed` and retried.

**P-03.** `startHold` is called without a location, so none is stored. Ask for
permission during panic setup, capture position at activation, and proceed
without it when it is unavailable.
Accepted when: a browser test with geolocation granted finds coordinates on the
activation; with it denied, the activation still completes.

**P-04.** The UI shows "Emergency alert sent to N contact(s)" from a count of
pending rows. Show real delivery state per contact and say so plainly when
something failed.
Accepted when: a browser test with one provider failure shows that contact as
not reached; no path shows "sent" before a provider accepted the message.

**P-05.** `checkin-cron` exists and emails through Resend from a test sender.
No migration schedules it: the only `cron.schedule` call is for
`send-scheduled-emails`, so today nothing ever runs the check-in job.
Accepted when: tests with controlled time show a missed check-in alerts the
contacts once, a response in time alerts nobody, and stopping a session cancels
it.

**P-06.** Accepted when: a test activation delivers a message marked as a test
to the user's own address or number and to no contact.

## Phase B: offline

| ID | Task | Needs | Status |
|---|---|---|---|
| B-01 | Service worker and manifest: the app opens offline | A-01 | done |
| B-02 | One source of truth for connectivity | A-01 | todo |
| B-03 | Vault unlocks and reads offline | B-01, A-06 | todo |
| B-04 | Red Folder PDF generates offline | B-03 | todo |
| B-05 | `[HUMAN]` Offline panic: SMS composer and queued alert | B-01, P-02, P-03 | todo |
| B-06 | Self-host the Inter font | B-01 | todo |
| B-07 | A screen whose code fails to load says so | B-01 | todo |

**B-01.** There is no service worker or manifest. Add them (for example with
`vite-plugin-pwa`), precache the app shell, and handle updates without
stranding users on an old version.
Accepted when: `e2e/offline.spec.ts` passes with its `test.fail()` removed.
Done with `vite-plugin-pwa` 1.3.0 (`vite.config.ts`, `src/pwa/serviceWorker.ts`).
The service worker precaches the built files of this origin only; it has no
runtime caching, so nothing from Supabase or Stripe is stored.
Updates: a new version downloads in the background (checked on each launch
and each return to the foreground) and waits. A running app is never
reloaded. The waiting version takes over at app start, before anything is
rendered, and only when no other tab of the app is open (Web Locks); without
that it waits until every tab is closed, which is the browser's own rule.
First visit: the service worker does not control the page that installed it.
A user who goes offline during that very first visit keeps the screens already
opened, but a screen not opened yet can fail to load until the app is reopened
or reloaded (which then works offline, once the download of about 3 MB has
finished).
Known limits: if activation at start takes longer than 4 seconds the current
version starts and the browser may activate the new one later under the
running app. The same happens when a second tab is opened while the first is
still applying an update at start, a window of about 2 seconds: that tab is
left on the old version under the new worker (reproduced by forcing it, 12 of
12). In both cases nothing is reloaded and the panic path is unaffected, since
it is in the main bundle, but a screen not opened yet can fail to load (B-07).
Not covered by a test: the reload-loop guard, and a regression that would
reload on a change of controlling worker.
Not verified: install prompt, offline launch and update on a real iPhone and
Android phone.

**B-02.** `navigator.onLine` is read 14 times across 11 files. Replace them with one hook
that also detects "connected but the server is unreachable".
Accepted when: no direct read of `navigator.onLine` remains outside the hook;
the hook has unit tests for online, offline and unreachable.

**B-03.** Accepted when: a browser test signs in online, goes offline, reopens
the app in a new tab, unlocks the vault with the password and reads a saved
section. An edit made offline syncs after reconnecting.

**B-04.** Accepted when: a browser test generates the PDF with the network off.

**B-05.** Offline, pressing the panic button stores the intent locally, opens
`sms:` to the contacts with the message and last known location, and sends the
server alert when the network returns. Contacts must be available on the device
while offline.
Owner does: test on a real iPhone and a real Android phone in airplane mode,
including several recipients, and record the result in this file.
Accepted when: an offline browser test sees the composer link with the right
recipients and body and, after reconnecting, exactly one server activation.

**B-06.** `src/index.css` imports Inter from `fonts.googleapis.com`. Offline
the request fails and the app falls back to the system font; online, every
visit makes a request to Google, which the privacy page should account for.
The build also warns that this `@import` comes after the `@tailwind` lines,
where CSS does not allow it (seen in every build log).
Ship the font files with the app so the service worker precaches them.
The `@import` also blocks rendering: on a network that is connected but cannot
reach Google, the shell is served from the cache at once and then waits for
the font request to fail before showing anything.
Accepted when: the build makes no request to `fonts.googleapis.com` or
`fonts.gstatic.com`; an offline browser test finds Inter loaded
(`document.fonts.check`).

**B-07.** Most routes are lazily loaded chunks. When a chunk cannot be loaded
(offline during the very first visit, or an old page running under a newer
service worker, see B-01) the route throws and the user gets a blank screen.
Catch the failed import, say that this screen could not be loaded, and offer a
reload, which is safe at that point because the user chooses it.
Accepted when: a browser test that blocks one route chunk sees the message and
the reload action instead of an empty `#root`.

## Phase S: privacy that matches the claims

| ID | Task | Needs | Status |
|---|---|---|---|
| S-01 | `[PRIVACY]` Data inventory | A-05 | todo |
| S-02 | `[PRIVACY]` Encrypt or keep local what is plaintext today | S-01, A-06 | todo |
| S-03 | `[PRIVACY]` Emergency contacts: minimise and get consent | S-01 | todo |
| S-04 | `[PRIVACY]` Consent before anything goes to an AI provider | S-01 | todo |
| S-05 | `[PRIVACY]` Privacy page and in-app claims match the inventory | S-02, S-03, S-04 | todo |
| S-06 | `[PRIVACY]` Account deletion removes everything | S-01, A-06 | todo |

**S-01.** Write `docs/data-inventory.md`: every table and every local store,
what it holds, plaintext or ciphertext, why, who can read it, how long it is
kept.
Accepted when: every table in `supabase/migrations` and every IndexedDB store
and `localStorage` key appears in it.

**S-02.** Plaintext on the server today: `risk_assessments` (country, city,
inputs), `supplies_plans` (inputs, plan), `premium_plans` (`wizard_inputs`,
`home_location`, `safe_locations`, and plan JSON when no encrypt function is
passed). Encrypt each with the master key or stop uploading it, and migrate
existing rows.
Accepted when: a test saves each of these and finds only ciphertext in the
database; existing plaintext rows are migrated or removed.

**S-03.** The server must hold contact email and phone to deliver alerts, so
they cannot be zero-knowledge. Store the minimum, tell the user exactly this,
and use the existing `verified` column: a contact confirms before receiving
real alerts.
Accepted when: the setup screen states what is stored and why; a contact who
has not confirmed receives no alert and the user is told so.

**S-04.** `generate-plan-wizard` and `generate-risk-insights` send user input
to OpenAI. Ask for consent per feature, send coarse data only (no street
address, no names), and offer a path that does not use AI.
Accepted when: a test proves no AI call happens without consent, and that the
payload contains no field listed as sensitive in the inventory.

**S-05.** The app says "Only ciphertext is stored. We cannot read your data."
Accepted when: every privacy and offline claim in `translations.ts`,
`Privacy.tsx` and the landing page is traceable to a line of the inventory.

**S-06.** Accepted when: a test deletes an account and finds no row for that
user in any table and no local data on the device.

## Phase U: usability

Planned after B and S, on a base that works. To be detailed then, starting from
a walkthrough of the app as a new user on a phone. Known items: the initial
bundle is 1 MB in a single chunk; all routes load eagerly;
`public/favicon.png` and several `src/assets/*.png` files contain JPEG data
under a `.png` name.

Noted by F-01 while walking sign-up and the master password on a phone
(not fixed there):

- Creating an account is hard to find. `/login` is titled "Sign in", opens on
  the Magic Link tab, and the only way to sign up with a password is the
  Password tab and then a small "Sign up" link under the form. Nothing says
  that a magic link also creates an account.
- After a password sign-up the toast says "Account created! Check your email
  to confirm." while the user is already signed in and on the dashboard
  (confirmation off). With confirmation on, that toast is all there is: the
  form stays as it was, with no lasting "check your inbox" state like the
  magic link has, and the confirmation link returns to `/`, not the dashboard.
- Two passwords within minutes, with different rules and three names: the
  account password (6 characters or more), the "Master Password" (12 or
  more), and "passphrase" in the vault texts (`vault.subtitle`,
  `vault.wrongPassphrase`). Nothing explains that they are different things.
- The master password screens have no navigation bar and no way back: on a
  phone the only exit is the browser's back button. The user also cannot see
  which account they are signed in as, or sign out, from there.
- The master password is asked for before the paywall. A user without a
  purchase who opens `/premium/vault` directly (the Pricing page links to it)
  is made to create a master password and only then told the vault is a paid
  feature. (Read from `src/App.tsx` and `Vault.tsx`; not walked in a test.)
- A wrong master password is reported only by a toast that disappears after a
  few seconds; nothing stays next to the field.
- Reloading the page, or opening a second tab, locks the vault again. The
  unlock screen says "for this session" and nothing more; a user who reloads
  mid-edit is not warned.
- The labels on the master password screens are not tied to their fields, the
  show/hide password buttons have no name, and the steps on the dashboard
  ("Vault Setup" and the others) are clickable `div`s: none of it works with
  a screen reader or a keyboard.
- The vault a new user lands in mixes languages with the app set to English:
  "Saltar por agora", "min restantes", the "why we ask" lines and the vault
  settings dialog are Portuguese.
- Signing out drops the user on the marketing home page with no word that
  they were signed out.

Noted by F-06 while walking the risk funnel on a phone (not fixed there;
the broken parts are F-20 to F-25):

- Closing the offer (the X, or a tap outside it) sends the visitor to the
  home page. The result behind it cannot be read again, and the only button
  on the result, "View Results & Get Ready", opens the offer, not results.
- The offer has two close buttons on top of each other in the same corner.
- Three waiting screens (2.5 s, 2.5 s and 4.3 s) pretend to work; the first
  two can be skipped, the "Analyzing your risk..." one cannot.
- The funnel has no language switch and no navigation: the language is the
  phone's. In English the postal code label reads "Postal Code (opcional)".
  In Portuguese the country list is in English ("Spain", "Germany"), the
  score line reads "Score:", and the price is written "€49" where the rest
  of the app writes "49€".
- A city made only of spaces is accepted; the result then reads "Location in
  presents specific risks".
- The three switches on the kit question have no accessible name, and the
  answer buttons do not say which one is selected (colour only).
- After "START NOW" with a wallet, the button stays on "Preparing secure
  payment…" until the wallet sheet answers; if the sheet never opens there
  is no way out but closing the offer, which leaves the funnel.
- The landing page never leads to this funnel, and the free calculator at
  `/tools/risk` asks different questions and gives a different score for
  the same household.

## Owner checklist

Things only the owner can do. Each unblocks the task named.

- [ ] Create the Supabase project and choose hosting (A-02)
- [ ] On the chosen host: `Cache-Control: no-cache` for `sw.js` and
      `index.html`, and app routes fall back to `index.html` (A-02)
- [x] Mark each feature keep or freeze (A-03)
- [ ] SMS provider account and key; verified email sending domain (P-02)
- [ ] Do not set `RESEND_API_KEY` on the hosted project until A-05 has
      closed `checkin-cron` and `send-scheduled-emails` to outside callers
- [ ] Real-phone airplane mode test, iPhone and Android (B-05)
- [ ] Legal review of the privacy policy and of the panic button terms, which
      must say the app does not replace emergency services (S-05)
