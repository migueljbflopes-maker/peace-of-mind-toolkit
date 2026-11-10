# Backlog

The dependency graph for the project. A task is **unblocked** when every task
in its "Needs" column is `done`. Tasks with no dependency between them can run
in parallel.

Status values: `todo`, `doing`, `done`, `blocked` (say why in the notes).

Tags: `[HUMAN]` needs the owner to act (accounts, keys, a real phone).
`[DECISION]` needs the owner to choose. `[PRIVACY]` must pass the
privacy-reviewer.

Phases run in order A, P, B, S, U, but a task only waits for the tasks it names.

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

**A-06.** Run Supabase locally (CLI) in CI, seed a premium test user, and give
Playwright a signed-in fixture. Add a way to run edge function tests.
Accepted when: a browser test signs in as the seeded user and reaches the
dashboard, in CI.

**A-07.** Remove routes, navigation entries, edge functions and cron jobs of
every feature marked freeze in A-03. Keep the code recoverable from git history.
Accepted when: the build contains no frozen route; no reference to
`ai.gateway.lovable.dev` or `LOVABLE_API_KEY` remains; `npm run verify` passes.

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

**B-01.** There is no service worker or manifest. Add them (for example with
`vite-plugin-pwa`), precache the app shell, and handle updates without
stranding users on an old version.
Accepted when: `e2e/offline.spec.ts` passes with its `test.fail()` removed.
Done with `vite-plugin-pwa` 1.3.0 (`vite.config.ts`, `src/pwa/`). The service
worker precaches the built files of this origin only; it has no runtime
caching, so nothing from Supabase or Stripe is stored. A new version downloads
in the background and takes over when the app goes to the background (never
on a `/panic` screen) or on the next launch. Hosting (A-02) must serve
`sw.js` and `index.html` with `Cache-Control: no-cache` and fall back to
`index.html` for app routes, or updates and first visits to deep links break.
Not verified: install prompt and offline launch on a real iPhone and Android
phone.

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
Accepted when: the build makes no request to `fonts.googleapis.com` or
`fonts.gstatic.com`; an offline browser test finds Inter loaded
(`document.fonts.check`).

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
`src/assets/hero-split-bg.png` is 2.6 MB and is downloaded by every first
visit (the precache size limit in `vite.config.ts` was raised to 3 MiB for it,
lower it again once the image is compressed); `public/favicon.png` and several
`src/assets/*.png` files contain JPEG data under a `.png` name.

## Owner checklist

Things only the owner can do. Each unblocks the task named.

- [ ] Create the Supabase project and choose hosting (A-02)
- [x] Mark each feature keep or freeze (A-03)
- [ ] SMS provider account and key; verified email sending domain (P-02)
- [ ] Real-phone airplane mode test, iPhone and Android (B-05)
- [ ] Legal review of the privacy policy and of the panic button terms, which
      must say the app does not replace emergency services (S-05)
