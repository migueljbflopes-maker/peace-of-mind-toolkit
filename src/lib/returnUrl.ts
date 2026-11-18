// The address a visitor is sent to after signing in (backlog F-30).
//
// It arrives in the query string (`/login?return_url=…`, and again in
// `/auth/callback?return_url=…` inside the magic-link email), so anyone can
// write it into a link to the real site. The sign-in page and the callback
// both navigate to it, and the sign-in page renders it as a link. It must
// therefore be a path on this site and nothing else.
//
// This is the only place that decides. Every consumer of `return_url` calls
// safeReturnPath() on the value it read (already decoded once by
// URLSearchParams) and uses the result.

/** Where to go when the requested address is missing or refused. */
export const DEFAULT_RETURN_PATH = '/dashboard';

// The sign-in page and the magic-link callback: returning to them is a loop.
const SIGN_IN_ROUTE = /^\/(login|auth)(\/|$)/i;

// A legitimate path is encoded once, and one that was nested in another
// parameter twice. Anything still changing after this many decodes is refused.
const MAX_DECODES = 5;

/** Backslashes, C0 control characters and DEL: browsers rewrite or drop these. */
function hasRewrittenCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code === 0x5c || code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function resolve(candidate: string, origin: string): URL | null {
  try {
    return new URL(candidate, origin);
  } catch {
    return null;
  }
}

function currentOrigin(): string {
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
}

/**
 * Returns `raw` unchanged when it is a path on this site that is safe to
 * navigate to after sign-in, and `/dashboard` otherwise.
 *
 * The rule, in order:
 *  1. It starts with exactly one `/` (not `//`, not `/\`), so it is neither a
 *     scheme (`javascript:`, `https:`) nor another host.
 *  2. It holds no backslash and no control character anywhere. Browsers turn
 *     `\` into `/` and delete tabs and newlines before they read an address,
 *     so a check that reads them literally would read a different address.
 *  3. Resolved against this site's origin by the URL parser, it stays on this
 *     origin, and its path does not begin with `//` (which `/.//host` becomes
 *     once dot segments are removed, and which the router would then follow).
 *  4. Its path is not the sign-in page or the callback (case-insensitive, as
 *     the router matches).
 *  5. Rules 2 to 4 still hold after the path is percent-decoded, again and
 *     again until it stops changing; a path that cannot be decoded, or is
 *     encoded more than MAX_DECODES deep, is refused. So `/%2Fhost`,
 *     `/%5Chost`, `/%252Fhost` and `/%6Cogin` are refused whether or not some
 *     later step decodes them once more.
 *
 * The query string and the hash are the destination's own business: apart
 * from rule 2 they are kept as they are, so an encoded slash in a parameter
 * (`/premium/plans/wizard?next=%2Fx`) survives.
 */
export function safeReturnPath(raw: string | null | undefined, origin: string = currentOrigin()): string {
  if (typeof raw !== 'string' || raw === '') return DEFAULT_RETURN_PATH;
  if (raw[0] !== '/' || raw[1] === '/') return DEFAULT_RETURN_PATH;
  if (hasRewrittenCharacter(raw)) return DEFAULT_RETURN_PATH;

  const first = resolve(raw, origin);
  if (!first || first.origin !== origin) return DEFAULT_RETURN_PATH;

  let path = first.pathname;
  for (let decodes = 0; decodes <= MAX_DECODES; decodes++) {
    const resolved = resolve(path, origin);
    if (!resolved || resolved.origin !== origin) return DEFAULT_RETURN_PATH;
    if (resolved.pathname.startsWith('//')) return DEFAULT_RETURN_PATH;
    if (SIGN_IN_ROUTE.test(resolved.pathname)) return DEFAULT_RETURN_PATH;

    let decoded: string;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      return DEFAULT_RETURN_PATH;
    }
    if (decoded === path) return raw;
    if (hasRewrittenCharacter(decoded)) return DEFAULT_RETURN_PATH;
    path = decoded;
  }
  return DEFAULT_RETURN_PATH;
}
