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
- `npm run supabase:functions` serves a copy of `supabase/functions` (made
  under `node_modules/.cache`) whose esm.sh imports ask for no type
  declarations, because the functions as written do not boot on the local
  runtime (backlog F-08). Restart it after editing a function.
- Email sent by the local auth server is not delivered; it lands in Mailpit
  at http://127.0.0.1:54324.

CI pins the Supabase CLI version (`.github/workflows/ci.yml`); the harness was
brought up with CLI 3.1.0.

## Backend

Supabase: migrations in `supabase/migrations`, edge functions in
`supabase/functions`. The web app reads its Supabase and Stripe publishable
keys from `.env`.
