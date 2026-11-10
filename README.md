# AmIReady

Preparedness app: encrypted vault, plans, printable Red Folder, panic button
and automatic check-in. See `CLAUDE.md` for the architecture and rules, and
`docs/backlog.md` for the plan of work.

## Run it

```sh
npm ci
npm run dev        # http://localhost:8080
```

## Check it

```sh
npm run verify     # typecheck, unit tests, build, browser tests
```

Browser tests use Playwright. Install its browser once with
`npx playwright install chromium`, or use a system Chrome with
`PW_CHANNEL=chrome npm run test:e2e`.

### Backend tests

Tests in `e2e/backend` sign in and use a real database, auth and edge
functions. They run against a local Supabase stack, never the hosted project,
and need Docker and the [Supabase CLI](https://supabase.com/docs/guides/cli).

```sh
npm run supabase:start       # local stack, every migration applied
npm run supabase:functions   # in a second terminal: edge functions, dummy provider keys
npm run test:e2e:backend     # builds the app against the local stack, runs both projects
```

Without the stack, `npm run test:e2e` and `npm run verify` run only the
`mobile-chrome` project and print that `backend` did not run. CI runs both on
every pull request.

How it is put together:

- `scripts/with-local-supabase.mjs <command>` reads the stack from
  `supabase status`, refuses anything that is not on this machine, and runs
  the command with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
  set to the local values (they win over `.env` at build time), a dummy
  Stripe publishable key, and `E2E_BACKEND=1`. Before any test runs, `e2e/global-setup.ts` checks that the
  build contains the local URL and no hosted one.
- `scripts/seed-local.mjs` creates the test users (`scripts/test-users.mjs`):
  a confirmed account with a premium entitlement. It runs at the start of
  every backend run, and by hand with `npm run seed:local`. It is not a
  migration and refuses to run against a URL that is not local.
- `e2e/backend/auth.setup.ts` signs in once through the sign-in page and saves
  the session; every backend test starts signed in as that user. The user has
  no master password yet, and tests share it, so a test that changes account
  state should make its own user with `createUser()`.
- `e2e/backend/fixtures.ts` is what a test imports. `admin` is a service-role
  client for arranging data and asserting on rows; `createUser()` makes a
  throwaway user; `clientFor(user)` is a client signed in as a user, for
  calling edge functions; `pageErrors` collects uncaught errors.
- A page under test cannot reach anything outside this machine: such requests
  are aborted and listed in `blockedRequests`. Mock Stripe or an AI answer
  with `page.route(...)`.
- Edge functions get `e2e/backend/functions.env`, dummy keys only. A function
  that calls Stripe, Resend or OpenAI still makes the call and is refused by
  the provider, so a test must not depend on such a call: mock the function's
  response in the browser with `page.route("**/functions/v1/<name>", ...)`.
- `npm run supabase:functions` serves `supabase/functions` itself, the code
  that is deployed. `e2e/backend/functions-boot.spec.ts` calls every function
  once and fails if one does not boot.
- Email sent by the local auth server is not delivered; it lands in Mailpit
  at http://127.0.0.1:54324.

CI and the deploy workflow pin the same Supabase CLI version (3.1.0, in
`.github/workflows/`), so the functions are bundled for production by the
runtime the tests ran on. Change both together.

## Backend

Supabase: migrations in `supabase/migrations`, edge functions in
`supabase/functions`. The web app reads its Supabase and Stripe publishable
keys from `.env`.

### Edge function dependencies

What is tested must be what is deployed, so no dependency of a function
floats (backlog F-08):

- Each function has its own `deno.json`, which maps the packages it imports
  (`@supabase/supabase-js`, `stripe`, `resend`) to an exact version on npm.
  The code imports them by name. All functions use the same version of a
  package. Files under `_shared` import no packages.
- Each function has a `deno.lock` next to it: every transitive package with
  its integrity hash, and the hash of every file imported by URL (the
  `deno.land/std` server). The edge runtime resolves from it when it serves a
  function locally and when it bundles one for a deploy.
- The runtime does not complain about an incomplete lockfile; it resolves
  what is missing on the spot. CI therefore checks every lockfile with Deno
  itself: `npm run functions:check-locks` (`deno cache --frozen`).
- The deploy workflow uses the same Supabase CLI version as CI and bundles
  with Docker. Bundling on Supabase's side (`--use-api`, or no Docker) does
  not send the lockfiles and must not be used.

To change a version: edit it in every `deno.json` that names the package, run
`npm run functions:lock` and commit the lockfiles. Both commands need
Deno 2.1 (`deno upgrade --version 2.1.4`), the version the edge runtime of
the pinned CLI embeds; `scripts/function-deps.test.mjs` checks the
declarations without Deno. A new function needs a `deno.json` and a
`deno.lock` too, or the unit tests fail.
