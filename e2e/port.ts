import { createHash } from "node:crypto";

/**
 * The port the app under test is served on (backlog A-09).
 *
 * Two checkouts on one machine used to share port 4173, and a run in one
 * could silently test the build served by the other. Outside CI each checkout
 * now gets its own port, derived from its path, so parallel runs do not meet.
 * CI and the backend run keep 4173: the local Supabase stack is configured
 * with that address (e2e/backend/functions.env), and a CI job has the machine
 * to itself. E2E_PORT overrides everything.
 */
export function portFor(cwd: string, env: Record<string, string | undefined>): number {
  if (env.E2E_PORT) {
    const port = Number(env.E2E_PORT);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      throw new Error(`E2E_PORT must be a port number between 1024 and 65535, got "${env.E2E_PORT}"`);
    }
    return port;
  }
  if (env.CI || env.E2E_BACKEND === "1") return 4173;
  const hash = createHash("sha256").update(cwd).digest();
  return 4200 + (hash.readUInt16BE(0) % 800);
}
