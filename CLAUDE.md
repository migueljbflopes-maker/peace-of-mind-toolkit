# AmIReady

Preparedness app sold to households: an encrypted vault of critical information,
evacuation and stay-put plans, a printable "Red Folder" PDF, and a way to alert
emergency contacts (panic button and automatic check-in).

The work is driven by `docs/backlog.md`. Read it before starting anything.

## Stack

- React 18, Vite, TypeScript, Tailwind, shadcn/ui. Routing in `src/App.tsx`.
- Supabase: Postgres with row level security, Auth, Deno edge functions in
  `supabase/functions`, SQL migrations in `supabase/migrations`.
- Stripe for payments. Resend for email.
- UI strings live in `src/i18n/translations.ts`, in English and Portuguese.
  Every new user-facing string goes there in both languages.

## Commands

| Command | What it checks |
|---|---|
| `npm run typecheck` | TypeScript |
| `npm run test` | Unit tests (Vitest) |
| `npm run build` | Production build |
| `npm run test:e2e` | Browser tests (Playwright) against the production build |
| `npm run verify` | All of the above, in order. This is the definition of "passing" |

Without the bundled Chromium, run browser tests with `PW_CHANNEL=chrome`.

## Architecture decisions

These are settled. Changing one is an owner decision, not a task.

1. **Installable web app first.** A service worker makes the app open with no
   network. A native wrapper may come later and must not be assumed.
2. **The panic button has two paths.** Online, the server notifies the contacts.
   Offline, the app opens the phone's SMS composer with the message and last
   known location already filled in, and queues the server alert for when the
   network returns.
3. **Automatic check-in is the offline guarantee.** The user sets an interval;
   if they do not respond in time, the server alerts the contacts. It is the
   only mechanism that works when the phone is off or destroyed.
4. **The vault is zero-knowledge.** A random master key encrypts the data on
   the device; the master key is wrapped by a key derived from the user's
   password. The server stores ciphertext only. See `src/utils/crypto.ts`.

## Invariants

A change that breaks one of these is wrong even if every test passes.

- **Never tell the user an alert was sent unless a provider accepted it.** The
  app is used in emergencies; a false "sent" is the worst bug it can have.
- **A real panic activation is never blocked** by a paywall check failing
  open, a rate limit, or a client that closed mid-flow.
- **No sensitive data reaches the server in plaintext** unless it is listed,
  with its justification, in `docs/data-inventory.md`. Sensitive means:
  identity, health, finance, addresses, locations, contacts, plan contents.
- **Nothing sensitive is sent to an AI provider** without explicit user
  consent for that specific call.
- **Every edge function authenticates its caller itself** or is documented as
  public. `verify_jwt = false` is not, on its own, an authorization decision.
- **What the app says about privacy and offline matches what the code does.**
  If the code cannot back a claim, change the claim in the same commit.

## Working rules

- One backlog task per branch and per pull request. Do not widen the task.
- A task is done when its acceptance criteria are met by a test that fails
  before the change and passes after it, and `npm run verify` passes.
- Do not weaken, skip or delete a test to make it pass. If a test is wrong,
  say so and stop.
- Do not edit a migration that already exists; add a new one.
- Do not change `src/utils/crypto.ts` or `src/lib/crypto.ts` without adding
  tests for the changed behaviour first.
- Tasks tagged `[HUMAN]` or `[DECISION]` need the owner. Prepare what you can,
  state exactly what is needed, and stop.
- Report failures as failures. A summary says what was verified and how, and
  names anything that was not verified.

## Agents

Defined in `.claude/agents/`. The loop is `/next-task`.

- `implementer` writes the change for one task.
- `verifier` checks it independently and can reject it.
- `privacy-reviewer` gates any task that touches data, storage, sync, edge
  functions or user-facing privacy claims.
