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
| A-06 | Local Supabase test harness with a signed-in test user | A-01 | todo |
| A-07 | Remove frozen features from the build | A-03 | todo |

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

**A-06.** Unblocks all of phase F. Run Supabase locally (CLI) in CI, seed a premium test user, and give
Playwright a signed-in fixture. Add a way to run edge function tests.
Accepted when: a browser test signs in as the seeded user and reaches the
dashboard, in CI.

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
| F-01 | Sign up, sign in, set the master password | A-06 | todo |
| F-02 | Vault: save, lock, unlock, read | F-01 | todo |
| F-03 | Plans A and B through the wizard | F-01 | todo |
| F-04 | Red Folder PDF from the user's real data | F-02, F-03 | todo |
| F-05 | Panic setup, test mode, and a check-in session | F-01 | todo |
| F-06 | Risk funnel up to the payment screen | A-01 | todo |
| F-07 | After purchase: premium unlock, claim, onboarding | A-06 | todo |

**F-01.** Accepted when: a browser test creates an account, lands signed in,
sets a master password, signs out, signs in again and unlocks with that
password; a wrong master password is refused with a clear message.

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

**F-07.** Start from a completed purchase created directly in the database.
Accepted when: a browser test for a guest purchase claims it into an account,
sees premium features unlocked, and completes the four onboarding steps; a user
without a purchase is shown the paywall on each premium route.

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

## Owner checklist

Things only the owner can do. Each unblocks the task named.

- [ ] Create the Supabase project and choose hosting (A-02)
- [ ] On the chosen host: `Cache-Control: no-cache` for `sw.js` and
      `index.html`, and app routes fall back to `index.html` (A-02)
- [x] Mark each feature keep or freeze (A-03)
- [ ] SMS provider account and key; verified email sending domain (P-02)
- [ ] Real-phone airplane mode test, iPhone and Android (B-05)
- [ ] Legal review of the privacy policy and of the panic button terms, which
      must say the app does not replace emergency services (S-05)
