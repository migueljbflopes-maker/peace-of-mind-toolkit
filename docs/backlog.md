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

## Owner decisions

Recorded as given. A task that a decision touches follows the decision; where
the task text disagrees, the decision wins and the task is updated when it is
next worked on.

**2026-11-18**
- **Sales paths.** Two, on purpose: the home page leads to the free calculator
  and the pricing page; `/riskfunnel` is the landing page for paid traffic
  (Google Ads). The funnel must therefore also meet the ad platform's rules on
  misrepresentation, and needs conversion measurement, which in turn needs a
  consent choice and a privacy page that says so (new work, not yet a task).
- **Price.** It must be changeable without a code change and shown from one
  source everywhere (F-24). What "dynamic" covers beyond that (per campaign,
  per country, tests) is still to be specified by the owner.
- **Funnel score (F-20).** Change it: never above 100, and good answers can
  be rated Low.
- **No real users or purchases exist in the old Lovable project.** Nothing to
  migrate; F-14 (accounts that never saw their kit) is closed as not needed.
- **Vault lock (F-16).** Accepted that the vault no longer locks on token
  refresh or tab focus; an inactivity lock replaces it, 10 minutes.
- **Recovery.** Words used in a recovery are retired and a new kit is issued
  (as built in F-10).
- **Kit file (F-17).** The kit can be downloaded only as part of finishing
  the step.
- **Master password (F-15).** 12 characters wherever one is created.
- **Clipboard (S-07).** Copying the words does not count as saved; download
  or writing down is required.
- **Gate order (Phase U).** The paywall comes before the master password.
**2026-11-19**
- **Funnel claims (F-25).** Remove the user counts, review counts and stars,
  the countdown, the crossed-out price and "works offline after purchase".
  They may return when real figures exist.
- **Price (F-24).** Confirmed that it is to be dynamic. The coordinator's
  reading, put back to the owner the same day: one source changeable without
  a code change first; built so that a price per campaign, per country or
  currency, and price tests can follow without the price shown and the price
  charged ever differing.
- **A public address to look at the product** was asked for. Needs a host
  (A-02); the owner was asked to choose one.

## Phase A: foundations

| ID | Task | Needs | Status |
|---|---|---|---|
| A-01 | Clean install, CI, browser test harness | none | done |
| A-02 | `[HUMAN]` Own Supabase project and hosting | none | todo |
| A-03 | `[DECISION]` Confirm scope: freeze non-core features | none | done |
| A-04 | Lint to zero errors, then gate CI on lint | A-01 | todo |
| A-05 | `[PRIVACY]` Edge function authorization audit | A-01 | todo |
| A-06 | Local Supabase test harness with a signed-in test user | A-01 | done |
| A-07 | Remove frozen features from the build | A-03 | done |
| A-08 | The magic-link sign-up test does not flake | A-06 | done |
| A-09 | Browser tests never run against another checkout's build | A-01 | done |
| A-10 | `[DECISION]` What is left of the frozen features in kept code and data | A-07 | todo |
| A-11 | Remove code that nothing renders | A-07 | todo |
| A-12 | The sign-in callback page: an expired link is reported as such, in the user's language | A-08 | todo |
| A-13 | No browser test reaches outside this machine; the "no frozen feature" page test does not time out on `networkidle` | A-07 | done |
| A-20 | `[DECISION]` The Inter font the design names is never loaded | A-13 | todo |
| A-21 | Browser tests: close the remaining ways out, and say exactly what is recorded | A-13 | todo |

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

**A-05.** There are 21 edge functions (31 before A-07 removed the ten of the
frozen features). `supabase/config.toml` sets `verify_jwt = false` on 17 of
them, `true` on one, and does not list three (`complete-express-purchase`,
`generate-risk-insights`, `send-scheduled-emails`).
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
- ~~The six `ingest-*` functions: no caller check, service-role writes.~~
  Removed by A-07, with `expert-chat` and the three subscription functions;
  they stay callable on the hosted project until the deploy that follows the
  merge of A-07 has deleted them (see A-07).
- `run-ai-job`: kept, because the onboarding step that drafts plans A and B
  calls it (`src/lib/aiPlanDraft.ts`). It has not been reviewed here; it
  calls OpenAI and belongs in this audit and in S-04.
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
Seen again on the F-10 branch: run 44284098061, first attempt, failed it
twice in a row (first try and retry) and passed when re-run; its Playwright
report is attached to that run for 7 days. Same symptom: the link is
followed, the tokens are taken from the address (it ends in a bare `#`), and
the page stays on `/auth/callback?return_url=%2Fdashboard` for more than
five seconds. `AuthCallback.tsx` uses nothing F-10 changed. Places to look,
noted there: `AuthCallback.tsx` reads the tokens from the address in a race
with the Supabase client, which reads and clears them itself, and its
ten-second "timed out" fallback covers only one of its three paths;
`LocaleProvider` awaits a database call inside `onAuthStateChange`, which
Supabase documents as a way to block the auth client; `AuthContext` already
carries a three-second timeout for `getSession()` hanging. What the user is
shown when it happens was not captured.
Accepted when: the cause is found (slow callback, or a real race in
`AuthCallback.tsx`) and fixed where it lies; the test passes 20 times in a
row in CI with retries off.
Done. The cause was neither a slow callback nor only a race: a deadlock in
the auth client that left a real visitor on "Signing you in..." for good.
- Trigger: `AuthCallback.tsx` read the tokens from the address and called
  `supabase.auth.setSession` with them, while the client was already
  consuming the same tokens (`detectSessionInUrl`). When the page mounted
  before the client had its answer from `GET /auth/v1/user`, that call ran.
- Deadlock: supabase-js 2.90.0 awaits its `SIGNED_IN` listeners while it
  holds the auth lock (`_setSession` → `_notifyAllSubscribers`, inside
  `_acquireLock`). The listener in `src/i18n/useLocale.ts` awaited a
  `user_profiles` query; every query first calls `getSession()`, which
  queues behind the lock holder. Neither ever returned. The package says so
  itself (`GoTrueClient.d.ts`, `onAuthStateChange`: "Avoid using an async
  function ... you might end up with a deadlock").
- Why it stayed: the page's ten-second timeout was armed on the third of its
  three paths only.
Fixed where it lay: the `useLocale` listener is synchronous and reads the
profile after it has returned; `AuthCallback.tsx` no longer calls
`setSession` and waits for the client instead (`getSession()`, which answers
once the client has read the address, plus the auth listener); its timeout is
armed before anything is waited for and ends in a message with "Try again"
(reloads the link) and "Go to sign-in", in both languages. Still handled:
error parameters in the query, tokens in the fragment, a visitor already signed in. A `?code=` link is NOT handled (correction from
verification: it times out as it did before, see A-12). Dropped: the page's own
`history.replaceState`; the client empties the fragment and the redirect
replaces the address. The other `onAuthStateChange` listeners in `src/`
(`AuthContext.tsx`, the one in `AuthCallback.tsx`) are synchronous and start
no Supabase call; `AuthContext` is unchanged.
Tests: `e2e/auth-callback.spec.ts` needs no backend (auth server and
database answered in the test, `GET /auth/v1/user` held back one second):
before the fix that test failed 8 of 8 times and the two timeout tests 3
of 3 each; after it all three passed 10 of 10; with only
`useLocale.ts` fixed the visitor already arrived (5 of 5), which is what
shows the listener to be the deadlock and `setSession` only its trigger.
`src/i18n/useLocale.test.tsx` shows the same with the real supabase-js
client. Acceptance: CI run 44359911711 ran the magic-link test of
`e2e/backend/signup-master-password.spec.ts` with `--repeat-each=20
--retries=0`: 20 of 20 passed, and it passed first time in the normal run of
the same job. That step was temporary and is not in the workflow: the test
without a backend keeps guarding the cause on every run, and twenty more
sign-ups per run would guard nothing further.
A second test that sometimes fails, recorded here and not fixed:
`e2e/frozen-features.spec.ts:101` ("the pages a visitor reads before buying
promise no frozen feature") timed out at 30 seconds in
`page.waitForLoadState("networkidle")` on the first attempt and passed on
retry in runs 44354322608, 44306180323 and 44305134959; in run 44307078392
it timed out on the retry as well and failed the run, and so it did in run
44362439246 on this branch (every other test passed there, the magic-link
test first time). The log does not say on which of its eight routes. It is not this deadlock: the visitor there is
signed out, nothing calls `setSession`, and with no session the old
`useLocale` listener returned before it awaited anything. Not established:
which request keeps the network busy. Candidates, all of them requests the
`mobile-chrome` project lets through to the outside: the Google Fonts
stylesheet imported by the CSS, Stripe.js on `/riskfunnel`, and the
`page_views` insert of `usePageTracking` on every route. The trace is in the
Playwright report of those runs for 7 days. It is A-13.

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
Done: the acceptance is met in CI run 44298847936, on the branch merged with
main as of F-11 (171 unit tests; 21 functions resolve from their lockfiles
and boot; 73 browser tests passed on both projects and one, the magic-link
sign-up of A-08, failed once and passed on retry). The commit after that run
changes only this file. One thing is left that
only the deploy following the merge can do and show, the deletion of the ten
functions from the hosted project: see "Hosted project" below for what that
run must print.
Removed. News ingestion and alerts: the six `ingest-*` functions, the alert
preferences and inbox components and hooks (nothing rendered them), the
`alerts` texts. Weekly briefing: `/news/weekly` (a "coming soon" page) and
its links. Expert chat: `/premium/expert`, the dashboard card and its locked
twin, the `expert-chat` function, the dummy gateway key of the test harness.
Amazon products: `/products`, the product links and "Amazon" buttons of the
supplies planner, `/admin/affiliates`. Subscription funnel: `/riskfunnel1`
and `create-subscription-checkout`, `create-subscription-setup`,
`complete-subscription-setup`. Ten functions, 31 down to 21.
Kept, having looked: `run-ai-job`, `ai_prompts` and `/admin/prompts` (the
onboarding step that drafts plans A and B calls `run-ai-job`; the plan wizard
and the risk insights read their prompts from `ai_prompts`);
`generate-plan-wizard` and `generate-risk-insights` (OpenAI, no news data, so
"insights" stays in the copy); `riskFunnel/shared.tsx` (every export is used
by the one-time funnel); Library and Tips (static content in `src/data`, no
backend); every Stripe function of the one-time funnel. No dependency in
`package.json` was used by the frozen features only.
Database: nothing dropped, no migration edited or added. The tables
`news_items`, `news_sources`, `news_domain_allowlist`, `weekly_briefings`,
`alert_preferences`, `expert_questions` and `affiliate_links` keep their
rows; nothing under `src/` reads them, and `admin-manage-user` still deletes
a user's rows from them. The only scheduled job is the hourly
`send-scheduled-emails`, which is kept; no job ever called a removed
function, and a test now fails if a migration schedules a function that does
not exist.
Claims changed with the code: the premium feature list and the paywall text
no longer promise alerts (English and Portuguese); "consult experts" is gone
from the offer shown after the risk check, where the Red Folder takes its
place (texts in `translations.ts`, both languages), and from the landing
page, where the whole line went: what was left of it, "Safe Triggers / Share
your plan automatically", is not something any code does (the missed
check-in email carries a name and a scenario; the panic functions send
nothing), and nothing schedules the check-in job yet (P-05), so no wording
of it could be backed today; the FAQ no longer lists weekly briefings as a
free feature; the privacy page no longer says the app fetches from GDACS,
USGS and ReliefWeb, and its date is now November 2026.
Hosted project: deleting a directory does not delete the deployed function,
and several of the ten have no caller check. The deploy workflow now has a
step that runs `scripts/prune-deployed-functions.mjs`: it lists the deployed
functions through the Management API, deletes exactly those with no
directory under `supabase/functions`, prints each, and lists again to check.
Its safeguards, each with a test:
- It runs from `main` only (`github.ref == 'refs/heads/main'`), after a full
  deploy whose functions booted, never with `only` set. A manual run checks
  out the branch it is started from; from a branch behind main the step would
  have deleted the functions main had since gained.
  `scripts/deploy-workflow.test.mjs` evaluates the `if:` of every step for
  every event, branch and input.
- Every directory under `supabase/functions` not starting with `_` is
  protected, with or without an `index.ts`.
- It deletes nothing and fails the run if the deployed list cannot be read,
  is not a list of functions, lacks a function the deploy just uploaded
  (wrong project, partial answer), or holds a name that differs from a
  directory only by case. Names are compared exactly; the API's upper-case
  slugs are accepted, because refusing them would leave the step unable to
  run for good on a project that has one.
- It fails if a delete is refused, or if the list read afterwards still
  shows the function or cannot be trusted.
Dry run: the workflow input `prune_dry_run` does only this: check out,
read the project ref, and run the script with `--dry-run`, which makes one
GET and prints what would be deleted. No link, migration, deploy or
deletion; it may run from any branch. Run it from the task branch before
merging: it must print `21 functions in supabase/functions, 10 deployed
function(s) not among them` and ten `would delete` lines, the ten functions
named in A-05 and above, and nothing else.
In the deploy run after the merge, expect `21 booted, 0 not shown, 0 failed`,
then the same count line, ten `deleted` lines and `the project now has
exactly the 21 functions of the repository`. If that step fails, the ten are
still callable: delete them in the Supabase dashboard (Edge Functions) or
re-run the workflow from main.
Tests: `scripts/frozen-features.test.mjs` (sources: routes, functions,
configuration, calls, tables, the gateway, cron), `e2e/frozen-features.spec.ts`
(the build: each removed address shows the not-found page, no page links to
one, no frozen name or claim is in the scripts),
`e2e/backend/frozen-features.spec.ts` (the signed-in dashboard),
`scripts/prune-deployed-functions.test.mjs` and
`scripts/deploy-workflow.test.mjs`. The lists
they read are in `scripts/frozen-features.mjs`. Main chunk 1,048 kB before,
1,020 kB after (gzip 301 to 293); precache 3,229 to 3,172 KiB.
Not verified: the Management API calls against the real project (address
and `Authorization: Bearer` header are those the CLI uses; the request and
response shapes are from the API reference); that the access token of the
workflow may delete functions. What is left over is A-10.

**A-09.** Found by A-07. Outside CI, Playwright reuses whatever answers on
port 4173 (`reuseExistingServer`). With two checkouts on one machine, a
`npm run verify` in one silently tested the preview server of the other and
reported its failures and passes. Nothing checks that the server under test
serves this checkout's `dist/`; only the backend run has such a check
(`e2e/global-setup.ts`). `CI=1` avoids it by refusing a taken port.
Accepted when: a browser run fails with a clear message when the server on
the port does not serve the build in this checkout's `dist/`, or picks a
free port; a test covers it.
Done 2026-11-18. It bit again, twice, while F-06 and F-30 were verified, and
`CI=1` turned out not to prevent it: Playwright saw the other checkout's
server answer before its own failed to bind, and ran tests against the wrong
build. Now each checkout serves on its own port outside CI, derived from its
path (`e2e/port.ts`; CI and the backend run stay on 4173, which the local
stack is configured with; `E2E_PORT` overrides), and a server that already
answers is never reused: the run stops with Playwright's "already used"
error. Tests: `scripts/playwright-port.test.mjs`.

**A-10.** `[DECISION]` Found by A-07. Left in place because kept code shares
it or because removing it destroys data; each needs the owner to say remove
or keep.
- `stripe-webhook` and `complete-guest-purchase` still handle subscription
  events and subscription checkouts (`customer.subscription.*`, status
  `subscription_active` and the like). No funnel creates a subscription any
  more. If a subscription was ever sold, these branches are what records its
  cancellation; if none was, they are dead code in the payment path. Also
  the Stripe price `price_1Sp2vlGudTqpziaHp7oKKuyY` named by the removed
  funnel: archive it in Stripe if unused.
- `/admin/analytics` has an A/B tab comparing `riskfunnel` with
  `riskfunnel1` from `feature_usage`. It only reads history now.
- The seven tables of the frozen features and their rows (listed in A-07),
  the `expert_chat_system` row of `ai_prompts` (still shown and editable in
  `/admin/prompts`) and the `expert_chat` row of `ai_rate_config`. Dropping
  is irreversible; S-01 must list them while they exist, and S-06 must
  delete from them.
- `LOVABLE_API_KEY` and any other secret of a removed feature still set on
  the hosted project: remove it in the Supabase dashboard.
- Jobs set up outside the migrations: check `cron.job` on the hosted
  database (`select jobname, schedule, command from cron.job`) for any job
  that calls a removed function, and unschedule it. The migrations schedule
  only `send-scheduled-emails`; the hosted database was not looked at.
- From the privacy review of A-07, data of the frozen features that users
  can no longer see or manage:
  - `expert_questions`: the questions and answers are plaintext free text
    with a category that can be medical. `user_id` has no foreign key, so
    the rows survive the deletion of the auth user, and there is no longer
    a screen where a user can see them. Decide: delete, export on request,
    or keep until the feature returns; S-06 must cover the table either way.
  - `alert_preferences` and `weekly_briefings`: how long they are kept.
  - The `expert_chat` rows in `ai_rate_limits` (per-user counters).
  - `guest_purchases` rows whose source is `riskfunnel1*`.
  - Two `localStorage` keys that nothing clears any more:
    `resilient_amazon_market` and `resilient_alerts_last`.

**A-11.** Found by A-07 while tracing what renders what. Nothing imports
these, on any route: `BugInOutSection`, `ConsoleLogOverlay`,
`FeaturesSection`, `NavLink`, `PremiumLockedCards`, `PricingTeaser`,
`QuickEntryStrip`, `StripeGuestWalletModal`, `SyncStatusIndicator`,
`TipsPreview`, `ValueSection`, `components/plans/*`, `hooks/use-mobile`,
`useDashboardReadiness`, `usePlansSync`, `lib/requireLogin`, `App.css`, four
images in `src/assets`; and the package `@hookform/resolvers`. Some carry
copy and calls to edge functions that no test sees
(`StripeGuestWalletModal` calls `set-guest-email`). `create-checkout-session`
is called from the Pricing page only.
Accepted when: each is deleted or wired to a route on purpose, and
`npm run verify` passes.

**A-12.** Found by A-08, in `src/pages/AuthCallback.tsx`.
- The page reads an error only from the query (`?error=`). Opened with the
  error in the fragment, as in
  `/auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`,
  it shows "Signing you in..." for ten seconds and then the timeout message,
  which blames the connection (seen in a browser; before A-08 it was the
  same wait and "Authentication timed out"). Not checked against the real
  auth server: whether an expired or already used link arrives with the
  error in the fragment only, or in the query as well.
- Every text of the page except the timeout message is English in the code
  ("Signing you in...", "Welcome!", "Something went wrong", "Try again"),
  and error messages from the auth server are shown as they come.
- After a failure, "Try again" and "Go to sign-in" lead to `/login` without
  the `return_url` the link carried.
- Regression introduced by A-08, measured by its verifier: when the auth
  server refuses the token (401 or 400: a link that expired or was already
  used, reopened from the address bar), the visitor now waits 10 seconds and
  is told the connection is slow, with the tokens left in the address. Before
  A-08 the page said at once "invalid JWT: token is expired". From reading
  the client, `supabase.auth.initialize()` resolves with that error, so the
  page can show it immediately (not yet tried).
- A `?code=` link times out, as it did before A-08: the client exchanges a
  code only when it holds a code verifier, which this app never writes.
- Opened directly while signed out, "Try again" reloads into the same message
  after another 10 seconds; only "Go to sign-in" leads anywhere.
Accepted when: a browser test follows an expired link on the local stack and
the visitor is told at once that the link has expired and how to get a new
one; every text of the page is in `translations.ts` in both languages; the
way back to sign-in keeps the return address.

**A-13.** Recorded by A-08; the runs and what was ruled out are at the end
of the A-08 paragraph. `e2e/frozen-features.spec.ts:101` waits for
`networkidle` on eight public routes and times out at 30 seconds in about
half of the CI runs looked at (5 of 10), usually on the first attempt only;
twice it failed both attempts and with them the run.
Accepted when: the request that keeps the network busy is named (the trace
of a failing run shows it); the test waits for what it reads instead of for
a quiet network, or that request is answered in the test; and the test
passes 20 times in a row in CI with retries off.
Widened by the coordinator on 2026-11-18 to the cause behind it: the tests
without a backend let every request through. Outside CI they ran against a
build made from the committed `.env`, so a run on a machine with internet
access inserted `page_views` and `feature_usage` rows into the hosted
project and loaded Stripe.js for real.
What was found. The four traces of the two failed runs (44307078392 and
44362439246, both attempts of each; read in CI run 44376958367, because the
report cannot be downloaded from the agent's machine) all stop on the last
of the eight routes, `/riskfunnel`. The seven other routes make no request
to another machine at all and are quiet in under a second. `/riskfunnel`
makes 24 to 26: four portraits from `images.unsplash.com`, and everything
else is Stripe.js, which the page loads when it opens: its script, two
frames (`js.stripe.com/v3/controller...`, `m.stripe.network/inner.html`),
`merchant-ui-api.stripe.com/elements/wallet-config` (refused, the key is a
dummy) and telemetry posted to `r.stripe.com/b` and `m.stripe.com/6`. The
same walk with nothing aborted, 60 times in CI (runs 44374789305 and
44376958367): quiet 2.2 to 2.7 seconds after `/riskfunnel` opened 54
times, after about 3.4 seconds twice, and 4 times only after 7.3 seconds, when Stripe.js had loaded one more script
at 5.7 seconds (`trusted-types-checker`) and posted one more
`POST https://r.stripe.com/b` a second later; never 30 seconds. In all four
failed traces every request up to and including that late script is there
and finished, and that last `POST https://r.stripe.com/b` is the one request
missing from the log, which only lists requests that ended. So the network
was held open by Stripe.js's own late telemetry, and the request is that
beacon. Not established: whether it was sent and never answered or its end
was not reported to Playwright, and why the timeout did not come back in 60
runs on 2026-11-18 when it had in 5 of 10 runs before. Ruled out: Google
Fonts (the stylesheet import never reaches the build, see A-20) and the
`page_views` insert (in CI it goes to the local stack and is answered in under 10 ms).
What changed. `e2e/fixtures.ts` is now where every spec takes `test` from
(the backend fixtures extend it). Its automatic fixture aborts every request
of the browser context to a host other than this machine, from any tab and
from the service worker, WebSockets included, and records it in
`blockedRequests` (attached to the test in the report); a route a spec adds
is asked first, which is how a spec stands in for a host.
`scripts/e2e-stays-local.test.mjs` fails the unit tests if a file under
`e2e/` takes anything but types and `expect` from `@playwright/test`, if a
spec does not import `test` from the fixtures, or if a spec without a
backend makes its own context or browser, calls `unrouteAll`, or sends
requests through Playwright's `request`. Behind the fixture
`playwright.config.ts` starts every browser with a proxy that does not exist
for all hosts but this machine, so a context the fixture never saw cannot
leave either. `e2e/stays-local.spec.ts` shows each of these in the browser
against a server on this machine's network address: before the change every
request arrived there, after it none does. The build under test no longer
names the hosted project: outside the backend run it is built for
`http://127.0.0.1:54321` with dummy Supabase and Stripe keys
(`e2e/build-env.ts`), and `e2e/global-setup.ts` now stops any browser run,
not only the backend one, whose `dist/` names a `*.supabase.co` address or
the project reference. The specs that answer Supabase themselves match on
the path and did not need to change.
The test itself is unchanged and still waits for `networkidle`: with
Stripe.js aborted nothing is left that could hold the network open, so
aborting was enough and the wait was not replaced. Acceptance: with retries
off and `--repeat-each=20` the test passed 20 of 20 on the agent's machine
and 20 of 20 in each of CI runs 44374789305 and 44376958367. Those steps
were temporary and are not in the workflow.
Limits. The guard is on what the browser sends; code a test runs in Node
(a `fetch` in the test process, a database client) is not covered, and the
unit test only refuses the Playwright ways of doing that.
`e2e/auth-callback.spec.ts` keeps its own list of unanswered backend
requests: it is about requests to the Supabase API on any host, this
machine included, which the guard lets through.

**A-20.** `[DECISION]` Found by A-13. `tailwind.config.ts` names Inter as the
app's font and `src/index.css` imports it from `fonts.googleapis.com`, but
the `@import` stands after the `@tailwind` lines, where CSS does not allow
it, and the build drops it: the built stylesheet has no such import, no
browser test ever sees a request to Google Fonts, and every visitor gets the
system font. Making the import work as written would send every visitor's
address to Google on every page and would not work offline, so it is a
decision, not a fix: ship Inter with the app (the service worker already
precaches `woff2`) or take Inter out of the design.
Accepted when: the owner has chosen; the font the design names is the font a
browser test finds computed on the landing page, online and offline, or
Inter is named nowhere; and no page asks another host for a font.

**A-21.** From the verification of A-13 (2026-11-19), which tried about 45
ways of getting a request out of a test and passed the change.
- One way out remains: WebRTC. An `RTCPeerConnection` with an outside ICE
  server sent UDP packets; neither a route nor an HTTP proxy stops UDP.
  Nothing in `src/` or `e2e/` uses it and third-party scripts are aborted, so
  no current test sends such a packet. The launch flag
  `--force-webrtc-ip-handling-policy=disable_non_proxied_udp` was tried and
  did not stop it; removing `RTCPeerConnection` in an init script is the
  other candidate.
- Stopped but NOT recorded in `blockedRequests` (the proxy stops them, the
  fixture never sees them): a SharedWorker's fetch, a WebSocket from a worker
  or the service worker, a local URL that redirects outside, a beacon sent on
  pagehide, and anything from a context the fixture did not create. A test
  that asserts on `blockedRequests` does not see these.
- `e2e/fixtures.ts`, `playwright.config.ts` and the README say "no way out at
  all" and "every request is recorded"; reword to what is true.
- The guard test misses: an import from `playwright/test` (the same module
  under its other name), `browser.newPage()`, a spec's own catch-all
  `route.continue()`, `context.unroute(...)` of the guard, and
  `launchOptions` with `--no-proxy-server`. The first four are still stopped
  by the proxy at run time.
- A `fetch` made by the Node test process itself is outside both layers.
Accepted when: a test in `e2e/stays-local.spec.ts` shows no UDP packet
arrives from an `RTCPeerConnection`; the guard test fails on each pattern
above; the three texts match the behaviour.

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
| F-10 | The Recovery Kit is shown after the master password is created | F-01 | done |
| F-11 | Signed out, the routes behind the master password gate offer sign-in | F-01 | done |
| F-12 | Edge functions are type-checked in CI | F-08 | todo |
| F-13 | One way to start a function: `Deno.serve`, no `deno.land` imports | F-08 | todo |
| F-14 | `[DECISION]` Accounts that never saw their Recovery Kit are led to create one | F-10 | done (not needed: no real users, owner 2026-11-18) |
| F-15 | One set of rules and words for the master password everywhere it is created | F-10 | todo |
| F-16 | The vault locks itself after a period of inactivity (required before launch) | F-10 | todo |
| F-17 | An abandoned Recovery Kit file cannot be mistaken for a real one | F-10 | todo |
| F-18 | Recovery Kit: small follow-ups from the second review of F-10 | F-10 | todo |
| F-20 | The funnel's score stays within 0 to 100 and every risk category can be reached | A-01 | todo |
| F-21 | Checkout opens from the funnel when Stripe.js has not loaded | A-01 | todo |
| F-22 | The funnel resumes where the visitor left off; part (b) is a `[DECISION]` | A-01 | todo |
| F-23 | The visitor can go back one question in the funnel | A-01 | todo |
| F-24 | The price has one source, and the price charged is checked against it | F-09 | todo |
| F-25 | `[DECISION]` The funnel's sales claims: keep only what is true | A-01 | todo |
| F-30 | The return address after sign-in cannot leave the site, and survives an encoded slash | F-11 | done |
| F-40 | Return addresses that are written but never read | F-30 | todo |
| F-41 | The claim code is encoded where it is put into an address | F-30 | todo |
| F-42 | The frozen-features page test does not wait for the network to go quiet | A-07 | todo |

**F-01.** Accepted when: a browser test creates an account, lands signed in,
sets a master password, signs out, signs in again and unlocks with that
password; a wrong master password is refused with a clear message.

Tested by `e2e/backend/signup-master-password.spec.ts`: sign-up with email and
password and with a magic link read from Mailpit, the master password set at
the vault, sign-out, sign-in, unlock, a wrong master password, a reload. The
stored `user_vault_keys` row is checked column by column and opened outside
the app with the right password only. A purchase is stood in for by setting
`premium_entitlements` (buying is F-07). Two tests in that file are marked
`test.fail` for the bugs it found: F-10 and F-11 (F-10 has since been fixed
and its test runs unmarked). Green in CI run 42828248986 (24 passed, the two
known failures among them).
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
Stripe). Green in CI run 44306180323, on commit 6d42831, the last one to
change a test (96 passed, the seven known failures among them; 2 flaky that
passed on retry, neither in these files: the magic-link test of A-08 and
`e2e/frozen-features.spec.ts:101`). Status stays `doing`, not done, and F-06 closes when F-22 (a) is done and (b) is decided; it is
done: F-22 does not wait for F-06, its tests are already here. Two
acceptance points are open:

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
`/riskfunnel`; it is reached only by a direct link. That is by design: the
owner decided on 2026-11-18 that it is the landing page for paid traffic
(Google Ads), see "Owner decisions". The landing page
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

Done. The rule now in the code (`src/contexts/VaultKeyContext.tsx`): the
server never holds a recovery wrap for words the user was not given and did
not confirm saving. Every step that makes new words prepares them in memory,
shows them with `RecoveryKitPanel`, and writes only when the user has copied
or downloaded the kit, ticked the box and pressed finish. Leaving, reloading
or losing the connection before that leaves the account exactly as it was.
- Creating a master password: no row in `user_vault_keys` until the kit is
  confirmed, and no protected page before. A reload during the step means
  there is no master password yet; the app asks for one again and shows new
  words. A save that fails says so, keeps the words on screen and can be
  retried. "Master Password created." is shown when the key is stored.
- "Forgot?": the kit's words and a new master password lead to a new kit.
  Both wraps are replaced in one update when that kit is confirmed, so the
  words just used stop working when the new password starts working. A
  refusal is shown in the form, where it stays.
- Backup page, "Recovery Kit": a new kit for an unlocked vault. The master
  password is asked again (the key in memory cannot be exported, and an
  unlocked screen should not be enough to replace the kit). The old words
  stop working when the new kit is confirmed, not before.
- Onboarding step 1 stores the key only after its own kit step (F-15 for
  the rest of that screen).
- The key state resets when the signed-in account changes, no longer on
  every session event for the same account (token refresh, the tab regaining
  focus), which would have dropped a kit step while the user was away saving
  the words. An unlocked vault therefore no longer re-locks on those events;
  it still locks on reload, sign-out and "Lock Vault". That accidental lock
  was the only automatic one: F-16 replaces it and is required before launch.
- A write whose answer is lost is never called "not saved" (found by the
  verifier: after a lost answer the new-kit screen offered "keep my current
  kit" when the old words were already dead). All three writes read the row
  back and compare it with what they prepared: stored is reported as stored,
  absent as not saved, and if the row cannot be read either the screen says
  the outcome is unknown, to keep everything and try again, and withdraws
  "nothing changes" and "keep my current kit" until a retry settles it.
- A key is put in memory only for the account it was prepared for: the
  signed-in account is checked again after every wait on the network, in the
  three writes and in unlock.
- When another device creates the master password first, the unlock screen
  carries a notice that the kit just shown is void until the user is in.
No change to `src/utils/crypto.ts`, `src/lib/crypto.ts` or `supabase/`.
Tested by `e2e/backend/signup-master-password.spec.ts` (the F-10 test,
unmarked; the journey now saves the kit) and `e2e/backend/recovery-kit.spec.ts`
(leaving and reloading during the step; a failed save; recovery end to end
with a vault section read back in the vault; the account from before the
fix; a new kit that makes the old words useless). Each asserts through
`admin` when the six wrap columns change, that the words open the stored key
outside the app, and that no words or master password are in any stored row
or any request, plain, base64 or hex. Unit tests:
`src/contexts/VaultKeyContext.test.tsx`,
`src/components/security/MasterKeyGate.test.tsx`,
`src/components/security/RecoveryKitPanel.test.tsx`,
`src/components/onboarding/OnboardingStep1Vault.test.tsx`. The lost answer
is also tested against the real database: the last test in
`recovery-kit.spec.ts` lets an update through and drops its answer.
Green in CI run 44290193711, first attempt, after the verifier's rework
(62 passed, the F-11 known failure among them, none on a retry); the commit
after it only edits this paragraph and the pull request text. Before the
rework: run 44286157560, second attempt, 61 passed; its first attempt ran
no test, because Docker on the runner could not start the database.
Limits. The vault section read back after recovery was put in `vault_items`
by the test, encrypted as the app encrypts it; saving through the vault
screens is F-02. The first CI run of this change passed the recovery test
only on a retry (an error toast covered the button; fixed by showing the
refusal in the form). The second run, 44284098061, failed in the magic-link
test of F-01, twice, and passed when re-run: A-08.
Not done here: existing accounts are told where to make a kit only on the
Backup page and the "Forgot?" screen (F-14). A kit file that was downloaded
and then abandoned stays on the user's device and looks like a real one; the
app refuses its words (F-17). What the privacy review noted and this change
did not take on is S-07. Portuguese texts were written, not read by a native
speaker on the screens.

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
Done. `MasterKeyGate` handles the visitor itself; `src/App.tsx` is unchanged.
While the session is being restored it shows a spinner; signed out, the
navigation bar, a card "Sign in to continue" (`LoginGateCard`, strings in
`signedOutGate`) and the footer; the card leads to
`/login?return_url=<path and query>` and the sign-in page returns there. A
card and not an immediate redirect, because that is what the five pages were
written to do. The page is not mounted for a signed-out visitor, so each
page's own `LoginGateCard` branch stays unreachable on these routes. Who is
signed in is read from auth, not from the key status, which follows auth one
render late. The order for a signed-in user is unchanged (master password
before the paywall, as noted in Phase U).
Tests: `src/components/security/MasterKeyGate.signedOut.test.tsx` (signed
out, loading, signing in); `e2e/signed-out-gate.spec.ts` (the five routes in
the real build, no backend); in `e2e/backend/signup-master-password.spec.ts`
the F-11 test, unmarked, over the five routes, and five tests that sign in
from the card and are returned to the route (the wizard with a query
string), asked to unlock, and let in. Green in CI run 44295362073, first
attempt (72 passed, none on a retry); the commit after it only edits this
file.
Not covered: the return after a magic-link sign-in; Portuguese not read by a
native speaker on the screen. Found on the way: F-30.

**F-30.** Found by F-11, by reading `sanitizeReturnUrl` in
`src/pages/Auth.tsx` and `src/pages/AuthCallback.tsx`; not walked in a test.
A return address that contains `%2F` after decoding is treated as a redirect
loop and replaced by `/dashboard`. An address whose own query string holds an
encoded slash (`/premium/plans/wizard?next=%2Fx`) is therefore lost at
sign-in. No route in the app builds such an address today.
**Open redirect, found by the verifier of F-11 and reproduced in the build
(2026-11-18). Fix this first; it is a security defect.** `sanitizeReturnUrl`
in `src/pages/Auth.tsx:25-39` only requires a leading `/`:
- `/login?return_url=//example.com` renders "Back to where I was" with
  `href="//example.com"`.
- `/login?return_url=/\example.com` does the same, and for a visitor who is
  already signed in the page navigates to `http://example.com/` by itself.
- `javascript:` and `https://` are refused. The copy of the function in
  `AuthCallback.tsx` blocks `//` but not `/\`.
A link to the real site can therefore send a signed-in user to a look-alike
page. There must be one function, used by both pages, that accepts only a
path on this origin (resolve against the origin and compare, rather than
matching prefixes).
Accepted when: one shared function with unit tests covering `//host`,
`/\host`, encoded forms of both, `javascript:`, absolute URLs, control
characters and a normal path with query; browser tests that
`/login?return_url=//example.com` and `/login?return_url=/\example.com`
never produce a link or a navigation off the site, signed out and signed in;
a test signs in from an address whose query holds an encoded slash and is
returned to it; the loop guard still stops `/login?return_url=/login...`;
and return after a magic-link sign-in is walked once (it has no test).
Implemented; not done, because the magic-link test is not reliably green
(below). `safeReturnPath` in `src/lib/returnUrl.ts` is the one function; the two
copies of `sanitizeReturnUrl` are gone and `Auth.tsx` and `AuthCallback.tsx`
(the only readers of `return_url`) call it. The rule: the value starts with
exactly one `/`; holds no backslash and no control character (browsers turn
`\` into `/` and delete tabs and newlines before reading an address);
resolved against the app's origin by the URL parser it stays on that origin
and its path does not begin with `//` (what `/.//host` becomes, and what the
router would then follow); its path is not `/login` or under `/auth`, in any
letter case; and all of that still holds after the path is percent-decoded
until it stops changing (undecodable, or more than five layers deep, is
refused). Anything else gives `/dashboard`. The query string and hash are
kept as given, which is what lets `?next=%2Fx` through. Each reader decodes
the value once (`URLSearchParams`); the magic-link callback is not a second
decode, because `signInWithMagicLink` encodes once more before it.
Tests: `src/lib/returnUrl.test.ts` (93 cases; 48 failed on the old
behaviour, among them `//host`, `/\host`, `/%5Chost`, the control characters
and the encoded slash in a query); `e2e/return-url.spec.ts`, signed out, no
backend (21 tests, 13 failed on the old pages): twelve hostile addresses give
no "back" link, no link the plain sign-in page does not have, and no request
or navigation to the other site; the encoded-slash address is kept from the
sign-in card to the way back; the sign-in page is never offered as the way
back; `e2e/backend/return-url.spec.ts` (33 tests): signed in, `/login` and
`/auth/callback` go to the dashboard for the same twelve addresses, with
nothing in `blockedRequests` for the other site; signing in by password on a
hostile address lands on the dashboard; signing in by password, and once by
a magic link read from Mailpit, returns to
`/premium/plans/wizard?next=%2Fx&plan=B`; the loop guard, signed in and
signing in. Green in CI run 44301375644 (127 passed; none of these on a
retry; the one flaky test was F-42); the commits after it merge main and edit
this file.
What keeps this open, and it is A-08: the magic-link test here
(`e2e/backend/return-url.spec.ts`, "a magic link asked for from a page
returns to that page") passed first time in runs 44301375644, failed once and
passed on retry in 44303170764, and failed twice in 44305134959, which is
therefore red. Each time the link was followed, the tokens were taken from
the address (it ends in a bare `#`), and the page was still on
`/auth/callback?return_url=…` after 20 seconds, so it is a hang and not
slowness: longer than the callback's own ten-second "timed out" fallback,
which changes the message and not the address. The return address in that
URL was the right one each time, and nothing F-30 changed runs before the
session exists. The test now prints what the page shows and its console when
this happens (`[A-08]` in the log). To close F-30: fix A-08, then re-run this
branch; A-08 should count this test as well as the sign-up one.
Closed 2026-11-18: A-08 landed first (the hang was a deadlock in the auth
client, triggered by the callback page and independent of F-30), main was
merged into this branch with one conflict in `AuthCallback.tsx` (A-08's
effect kept, with `safeReturnPath` in `arrive()`), and the verifier ran the
combination beforehand: about 130 hostile addresses, none left the site.
Not covered: the signed-in and magic-link tests were not seen failing on the
old pages (no Docker locally; the unit and signed-out tests were); only
Chromium was used. Other
redirect surfaces, read and left alone because none reads `return_url`: the
Stripe success and cancel addresses are built in the edge functions from
`APP_URL` (the client sends only `source`); `stripe.confirmPayment` and every
`emailRedirectTo` start from `window.location.origin`; `/claim` and
`/purchase-success` send their query parameters to edge functions and never
navigate to them. Found on the way: F-40, F-41, F-42.

**F-40.** Found by F-30. Three places name an address to come back to and
nothing reads it, so the user lands somewhere else:
`PreparednessJourney.tsx:327` sends to `/pricing?return_url=…` and the pricing
page never reads it; `panic/Test.tsx:41` and `panic/History.tsx:87` redirect
to `/login` with `state.returnUrl`, which the sign-in page ignores (it reads
only the query string), so signing in from there ends on the dashboard; a
password sign-up that needs email confirmation returns to `/`
(`AuthContext.tsx`, `emailRedirectTo`), not to the address in `return_url`.
Accepted when: each either returns the user to the address, through
`safeReturnPath` and nothing else, or stops naming one; a browser test for
each that is kept.

**F-41.** Found by F-30. The claim code from `/claim?claim=…` (or from
`localStorage`) is put into addresses without encoding:
`Claim.tsx:110` and `StripeGuestWalletModal.tsx:112,155,336,361`
(`${origin}/claim?claim=${claimCode}`), and
`/purchase-success?claim_code=${claimCode}` in the risk funnels. The origin
is fixed, so this cannot leave the site, but a code containing `&` or `#`
changes the address that is built. Accepted when: every such place uses
`encodeURIComponent`, with a unit test.

**F-42.** Seen in CI run 44301375644 on the F-30 branch:
`e2e/frozen-features.spec.ts:101` timed out at
`page.waitForLoadState("networkidle")` after 30 seconds and passed on retry.
Accepted when: the test waits for what it reads instead of for the network,
and passes 20 times in a row in CI with retries off.

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

**F-14.** Found by F-10. An account that set its master password before F-10
has a recovery wrap for words nobody was shown, and the app cannot tell such
an account from one whose kit was saved: `user_vault_keys` has no column that
says "the user confirmed this kit". F-10 gives those users a way out (Backup
page, "Create a new Recovery Kit") and says so on the Backup page and on the
"Forgot?" screen, but a user who visits neither is not told, and still
believes the app's old promise.
`[DECISION]` for the owner, in this order: (1) how many accounts on the
hosted project have a row in `user_vault_keys` created before the F-10
deploy; if none, close this task. (2) Otherwise choose: a new nullable column
`recovery_kit_confirmed_at`, set when a kit is confirmed, and a forced kit
step after the next unlock for rows where it is null (a migration); or an
email to those users; or both.
Accepted when: a browser test for a row without the confirmation unlocks with
its master password and cannot reach a protected page before saving a new
kit; a row with the confirmation is not asked again.

**F-15.** Found by F-10. A master password can be created in two places with
different rules. The vault gate (`MasterPasswordScreen`) asks for 12
characters, an acknowledgement, and a kit that must be copied or downloaded
before the tick box works. Onboarding step 1 (`OnboardingStep1Vault`, route
`/premium/onboarding`, which is not behind the gate) accepts 6 characters,
has its own kit screen with only a tick box, and downloads the bare words
without the account or the date. F-10 made it store the key only after the
tick, like the gate, and changed nothing else there. The vault texts also
still say "passphrase" and "if you forget your passphrase, we cannot recover
your data" (`vault.setup.warning`, `backup.safetyNote`,
`DataLossWarning.tsx`, `Privacy.tsx`) without a word about the Recovery Kit.
Accepted when: both places use the same form and the same `RecoveryKitPanel`;
a browser test sets a master password through onboarding and is held to the
12-character rule and the saved kit; every text that says what happens when
the master password is forgotten names the Recovery Kit.

**F-16.** Found by F-10. Required before launch. Until F-10 the vault locked
itself by accident: the key was dropped whenever Supabase handed out a new
session object, which by the code happens on a token refresh and when the
tab regains focus. That was the only automatic lock, and nobody had designed
it. F-10 removed it, because it also threw away a Recovery Kit step while the
user was in another app saving the words. Today an unlocked vault stays open
until the page is reloaded or closed, the user signs out, or presses "Lock
Vault": on a shared or lost device that is too long. Put a deliberate lock
in its place:
- A timeout that is stated to the user, in the vault and where the master
  password is created, as a length of time ("locks after N minutes without
  use"). Choose N and whether the user can change it; say which in the task
  notes.
- "Without use" is defined: no pointer, key or touch input in the app. A tab
  in the background counts as not in use.
- It never locks during a Recovery Kit step (setup, recovery, renewal),
  where locking would discard words the user may be saving elsewhere, nor
  while a vault or plan save is in flight; the lock waits for those to end.
- On return the user sees the unlock screen with a line saying the vault was
  locked for inactivity, on the route they were on, and unsaved text in an
  open editor is not silently lost: either it is kept for after the unlock
  or the user was warned before the lock.
- `vault.autoLock` ("Auto-lock in") exists in `src/i18n/translations.ts` and
  is used nowhere: make it true and use it, or remove it.
- The privacy page and any text that says when the vault locks match this.
Accepted when, each as a test named for its rule: the vault locks after the
stated time without input and not before; input resets the clock; a
background tab locks; it does not lock during each of the three kit steps;
it does not lock while a save is in flight and does lock once it ends; the
unlock screen after an automatic lock says why and returns to the same
route; the stated time on screen equals the time the code uses.

**F-17.** Found by F-10 (privacy review). The Recovery Kit can be downloaded
or copied before the step is finished, and has to be: saving it is the
condition for finishing. A user who downloads the file and then leaves is
left with a file that looks like a real kit and whose words will never work
(the app refuses them; nothing on the file says so). The same when another
device creates the master password first, and after a new kit replaces an
old one. Choose one and say why in the notes:
(a) the file is produced as part of finishing, after the server has
confirmed the kit, with a different confirmation of "saved" before that
(for example typing back three of the words); or
(b) the download stays where it is, and the file says in its first lines
that it is valid only once the app has shown "kit active", carries the time
to the minute and a short check code that the app also shows after
confirming, so a user holding two files can tell which one is live.
Either way the file name stops being identical for two kits made on the
same day.
Accepted when: a browser test abandons a kit step after saving the file and
shows, from the file alone or from the app, that the file is not a live kit;
and a file from a finished step is identifiable as the live one.

**F-18.** From the verifier's second review of F-10 (2026-11-18); none of it
blocked the merge.
- A write that is still in flight when the read-back happens is reported as
  "could not save" and then lands. It cannot be ruled out from the device.
  The notes are hedged for it, but renewing a kit still offers "Cancel and
  keep my current kit" in that case. Decide the wording or drop the offer
  after any failed save.
- `RecoveryKitPanel.tsx:98` clears the failure when a retry starts, so the
  "keeps working" note and a disabled cancel button show again while saving.
  Keep the unknown state until a save settles.
- The "could not confirm" message does not say what to do if the connection
  never comes back: keep both and check later.
- Renewal has no account re-check after its read-back (`VaultKeyContext.tsx`
  about line 527); add it for consistency.
- No test asserts that onboarding hides its note on a save error
  (`OnboardingStep1Vault.tsx:178`).
- The corrected `vault.setup.warning` in Portuguese uses "você" in a block
  that otherwise uses "tu"; all Portuguese strings of the kit screens need a
  read by a native speaker (the owner).
Accepted when: each point has a test or a recorded decision.

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
Owner decision, 2026-11-18: the score never goes above 100 and good answers
can be rated Low. Still to specify when this is worked on: which answers
count as good and where the thresholds sit; whether the country is used or
no longer asked; and that a switch left alone is not counted as "no".
Accepted when: `the score never goes above the 100 it is shown out of` and
`the best answers the funnel accepts are rated Low` in
`e2e/risk-funnel.spec.ts` pass without `test.fail`. The tests that change
with the fix, all in that file, and no others: those two; and, if the rules
change the numbers, the three `...: the result shown is the one the answers
give` tests and `on a Portuguese phone`, whose expected score, level and
reasons come from the `CASES` table and are to be worked out again by hand
from the new rules. `the connection drops before the analysing screen` reads
the same table. No other test names a score: the two that check the
analytics row compare what is sent with what is shown.

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
no "start over".
Two parts, so that the first needs no decision:
(a) Same tab: reload, and return from Stripe. Keeping the step next to the
answers in `sessionStorage` is enough and changes nothing about where data
lives.
Accepted when: `after a reload the visitor is on the question they had
reached` and `coming back from Stripe's page without paying returns to the
result, not to question 1` in `e2e/risk-funnel.spec.ts` pass without
`test.fail`. A fix for (a) that stores the step also changes `what the funnel keeps on
the device, and where` (`e2e/risk-funnel.spec.ts`), which lists the exact
keys and contents of `sessionStorage`: update that test with the fix, on
purpose, and keep its rule that nothing outlives the tab.
With (a) done, F-06 can be closed if the owner decides (b) as
"a new tab starts empty".
(b) `[DECISION]` A new tab. Where the answers are kept is for the owner and
the privacy review: either `sessionStorage` only, as now, and then a closed
tab starts empty and that is the intended behaviour; or storage that
outlives the tab, which keeps a city, a postal code and "medical needs" on
the device in plain text until removed. The two tests follow the decision:
with the first, `closing the tab and opening the funnel again resumes with
the answers` is rewritten to expect an empty start and loses its
`test.fail`; with the second it passes as written, and the last lines of
`what the funnel keeps on the device, and where`, which today require that
nothing of the answers is in `localStorage`, are rewritten to say what is
kept, for how long, and that "start over" removes it.
Accepted when: the decision is recorded here and both tests agree with it.

**F-23.** Found by F-06. There is no way back inside the funnel. A visitor
who tapped the wrong answer cannot return to it: the screens have no Back
button, and the browser's Back leaves the funnel for the page before it
(for a visitor arriving from an ad, out of the site).
Cause: the steps are not in the browser history and
`FunnelQuestionsLayout` (`shared.tsx:613`) offers no control for it.
Accepted when: `the browser's Back button returns to the previous question`
in `e2e/risk-funnel.spec.ts` passes without `test.fail`.

**F-24.** Found by F-06. The price is written out again and again, and no
test can say what a buyer is charged. On main after A-07,
`grep -rnE "€ ?49|49 ?€|4900|priceNow|priceWas" src supabase/functions`
gives 47 lines in 26 files (generated types left out; a handful are
comments or the crossed-out €120). The visitor sees "€49": `priceNow={49}`
in `RiskFunnel.tsx:307`, with the same default in `RiskOfferModal.tsx:44`
and as text at `:176-177`; `Pricing.tsx`; `translations.ts` as "49€" (lines
51-53 and 550-552); the FAQ, the Terms, the paywall and dashboard buttons,
the free calculator and the supplies planner; the admin email preview; and
three email templates under `supabase/functions`.
The wallet path charges `amount: 4900, currency: "eur"`, written once in the
browser (`RiskFunnel.tsx:134-135`, what the wallet sheet shows) and again in
`create-payment-intent/index.ts:55-56` (what is charged) and `:81-82` (what
is recorded). The Checkout path charges whatever the Stripe price named by
the secret `STRIPE_PRICE_ID_PREMIUM` says, in whatever currency it has, with
promotion codes allowed. Change any one of these and the others keep saying
€49. The purchase email says "€49" whatever was paid.
Owner decision, 2026-11-18: the price must be changeable without a code
change and shown from one source, so a constant in the code no longer meets
this task. The price lives in one place read at run time (the Stripe price,
or configuration the functions serve to the app), and the offer, the wallet
amount, the emails and the recorded `amount_cents` all read it. What
"dynamic" covers beyond that (per campaign, per country or currency, price
tests) is not yet specified by the owner; design so that the price shown and
the price charged cannot differ whichever is chosen.
Accepted when: the amount and currency have that single source and every
text and call reads it; with the Stripe stand-in of
F-09, a test fails if the amount or currency of the Checkout price differs
from the price shown on the offer.

**F-25.** `[DECISION]` Found by F-06. Decision pending as of 2026-11-18: the
owner asked why the claims should go and was answered the same day. The
verifier of F-06 confirmed each claim is a hard-coded literal with no source
in the code. Because the funnel is the landing page for Google Ads, the
claims must also meet the ad platform's misrepresentation rules. Measuring
conversions for those ads, the consent choice it needs and the privacy page
text have no task yet; when they get one, the "before payment" test's list
of third-party hosts and its analytics assertions change with it.
The funnel makes claims that only the owner can stand behind. Under every question: "Over 4,000 active users who
trust our preparedness guidance", "Excellent", five stars drawn in
Trustpilot's green, "Based on 56,334 reviews", and four stock photographs
from Unsplash as the users' faces (`shared.tsx:31-36, 309-332`). On the
offer: "Discount expires in 10:00", a countdown that restarts every time the
offer is opened and, at zero, disables the buy button (`RiskOfferModal.tsx`,
`disabled={loading || secondsLeft === 0}`) while the price stays €49; a
crossed-out "€120" that was never the price (`priceWas={120}`); "Works
offline after purchase", which phase B has not yet made true. The analysing screen shows "Checking location
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

**B-03.** Measured by the verifier of F-11 in a real build: offline with a
stored session whose access token has expired, a signed-in user gets the
sign-in card after 3 seconds and it stays (before F-11 it was a blank page);
offline with a valid token, the master password screen shows "Security error
TypeError: Failed to fetch". So today the vault cannot be unlocked offline at
all, and the auth loading timeout treats "could not refresh" as "signed out".
Also from that review: a unit test should pin that a signed-in user never
sees the sign-in card for one render, or the comment in `MasterKeyGate.tsx`
claiming it should go.
Accepted when: a browser test signs in online, goes offline, reopens
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
| S-07 | `[PRIVACY]` Recovery Kit and master key: what the F-10 review left open | F-10 | todo |

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
Found by the privacy review of A-07; all of it predates that change and
none was fixed there. In `src/pages/Privacy.tsx`:
- **Required before launch.** Lines 165-169 say "anonymized inputs" and "no
  personally identifiable information" go to "our AI provider". The plan
  wizard sends the neighbourhood, the medication list, mobility constraints
  and the safe locations; the risk insights call sends city and country;
  and OpenAI is not named.
- 195-196: Google Fonts is not listed among the third parties (see B-06).
- 191: "session tokens (essential cookies)", while the session is kept in
  `localStorage`.
- 128-130, and `Terms.tsx` 96-106: "personal passphrase" that "cannot be
  recovered", while the app has a master password and a Recovery Kit.
- 134-135: "explicit consent before the Vault", and no such screen exists.
- 160: Resend is said to send "emergency alerts"; no panic function sends
  anything (P-02).
- 221: "cloud backups: 90 days after account deletion"; no code was found
  that does this.
- 69: "password (optional)".
- The data table, 66-102, omits plans, check-in sessions, location
  snapshots, AI jobs and feature usage.
Elsewhere: `src/pages/panic/Setup.tsx:641`, "Your Panic Button will share
only what you select here", while no code shares plan content; and
`src/components/FAQ.tsx` lines 13 and 28 (every core feature offline;
"encrypted end-to-end").

**S-06.** Accepted when: a test deletes an account and finds no row for that
user in any table and no local data on the device.

**S-07.** Noted by the privacy review of F-10; none of it is changed there.
Each is a decision or a fix of its own; some need `src/utils/crypto.ts`, so
tests for the changed behaviour come first (CLAUDE.md).
- Copying the words counts as "backed up", and the clipboard is never
  cleared: the 24 words stay there for any app or clipboard history to read.
  Decide whether copy should count, and clear or warn.
- The master key stays extractable in memory after setup and after a
  recovery (it is created or unwrapped extractable so it can be wrapped, and
  kept as it is). After an ordinary unlock it is not. Re-import it as
  non-extractable once the wraps are made.
- Recovery and a new kit do not change the master key, only how it is
  wrapped. Whoever holds an old copy of the `user_vault_keys` row and the
  old words (or old password) can still open the data. Retiring words is
  therefore not a remedy for words that leaked together with a row; say so
  where the app talks about replacing a kit, or add a real key rotation that
  re-encrypts the vault.
- Master password fields use `autoComplete="current-password"` or
  `"new-password"`, so a browser offers to save the master password next to
  the account password, on the same device as the data it protects.
- Recovery accepts 12 or more words (`normaliseRecoveryPhrase`,
  `RecoveryForm`), though every kit has 24.
- The comment at `src/utils/crypto.ts:16` says the master key is
  non-extractable; it is created extractable (`generateMasterKey`). The
  comment or the code is wrong.
Accepted when: each item is either fixed with a test or closed with the
owner's decision written here.

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
- (By design since 2026-11-18: the funnel is for paid traffic.) The landing
  page never leads to this funnel, and the free calculator at
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
