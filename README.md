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

## Backend

Supabase: migrations in `supabase/migrations`, edge functions in
`supabase/functions`. The web app reads its Supabase and Stripe publishable
keys from `.env`.
