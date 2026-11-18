// What went wrong on /auth/callback, the page every sign-in link lands on
// (backlog A-12). Kept apart from the page so that the rules are in one
// place and unit-tested.
//
// The page never shows the auth server's own text. Everything it can be told
// (an error in the address, an error from the Supabase client) is reduced
// here to one of a few kinds, and each kind has a translated message and one
// way forward.

import { DEFAULT_RETURN_PATH, safeReturnPath } from '@/lib/returnUrl';

export type CallbackFailure =
  /** The link has expired or was already used. A new link fixes it. */
  | 'expired'
  /** The link was refused for a reason we do not name. A new link is the way forward. */
  | 'failed'
  /** An address in a form this app does not use (a PKCE `?code=`). */
  | 'unsupported'
  /** Nothing to sign in with: the page was opened on its own. */
  | 'empty'
  /** The auth server did not answer, or not properly. Trying again can help. */
  | 'connection';

export interface CallbackAddress {
  /** `error` as the auth server wrote it into the address, e.g. "access_denied". */
  error: string | null;
  /** `error_code`, e.g. "otp_expired". */
  errorCode: string | null;
  /** Whether the address says anything went wrong (error, code or description). */
  hasError: boolean;
  /** Whether the address carries an access token (the form this app uses). */
  hasTokens: boolean;
  /** Whether the address carries a PKCE code (a form this app does not use). */
  hasCode: boolean;
}

/**
 * Reads what a callback address carries. The auth server writes its answer
 * into the fragment, the query, or both; the query wins, as it does in the
 * Supabase client. Only codes are returned, never the description: that text
 * is the server's and is not shown.
 */
export function readCallbackAddress(href: string): CallbackAddress {
  const params = new Map<string, string>();
  try {
    const url = new URL(href);
    if (url.hash.length > 1) {
      new URLSearchParams(url.hash.slice(1)).forEach((value, key) => params.set(key, value));
    }
    url.searchParams.forEach((value, key) => params.set(key, value));
  } catch {
    // Not an address: it carries nothing.
  }
  const error = params.get('error') || null;
  const errorCode = params.get('error_code') || null;
  return {
    error,
    errorCode,
    hasError: Boolean(error || errorCode || params.get('error_description')),
    hasTokens: Boolean(params.get('access_token')),
    hasCode: Boolean(params.get('code')),
  };
}

// Codes that mean "this link can no longer be used; a new one can".
const EXPIRED_CODES = new Set([
  'otp_expired',
  'flow_state_expired',
  'flow_state_not_found',
  'bad_jwt',
  'session_not_found',
  'session_expired',
]);

interface ClientError {
  name?: unknown;
  status?: unknown;
  code?: unknown;
}

/** The parts of a Supabase auth error this module reads. Never its message. */
function describe(error: unknown): { name: string; status: number | null; code: string | null } {
  const e = (error && typeof error === 'object' ? error : {}) as ClientError;
  return {
    name: typeof e.name === 'string' ? e.name : '',
    status: typeof e.status === 'number' ? e.status : null,
    code: typeof e.code === 'string' ? e.code : null,
  };
}

/**
 * Decides what to tell a visitor who is NOT signed in once the Supabase
 * client has finished reading the address.
 *
 * @param address     what the address carried when the page opened
 * @param clientError the error `supabase.auth.initialize()` resolved with,
 *                    or the one `getSession()` returned, if any
 */
export function classifyCallbackFailure(address: CallbackAddress, clientError: unknown): CallbackFailure {
  // The auth server said so itself, in the address.
  if (address.hasError) {
    return address.errorCode && EXPIRED_CODES.has(address.errorCode) ? 'expired' : 'failed';
  }

  const { name, status, code } = describe(clientError);
  // No answer (offline, 502/503/504), too many requests, or a server fault:
  // the link may still be good.
  const noProperAnswer =
    name === 'AuthRetryableFetchError' || status === 429 || (status !== null && status >= 500);

  if (address.hasTokens) {
    if (!clientError) return 'failed';
    if (noProperAnswer) return 'connection';
    // The auth server refused the token: 401 or 403 for one that expired or
    // belongs to a session that is gone, 400 for one it cannot read.
    if (name === 'AuthSessionMissingError') return 'expired';
    if (code && EXPIRED_CODES.has(code)) return 'expired';
    if (status !== null && status >= 400 && status < 500) return 'expired';
    return 'failed';
  }

  if (address.hasCode) return 'unsupported';
  if (clientError && noProperAnswer) return 'connection';
  return 'empty';
}

/** A short, non-sensitive line for the console, for support. No tokens, no server text. */
export function failureLogLine(kind: CallbackFailure, address: CallbackAddress, clientError: unknown): string {
  const { name, status, code } = describe(clientError);
  const parts = [
    `kind=${kind}`,
    address.error ? `error=${address.error.slice(0, 60)}` : '',
    address.errorCode ? `error_code=${address.errorCode.slice(0, 60)}` : '',
    name ? `client=${name}` : '',
    status !== null ? `status=${status}` : '',
    code ? `code=${code}` : '',
  ];
  return parts.filter(Boolean).join(' ');
}

/** `?return_url=…` for a return address that is safe and not the default; otherwise nothing. */
function returnQuery(rawReturnUrl: string | null | undefined, origin?: string): string {
  const safe = origin === undefined ? safeReturnPath(rawReturnUrl) : safeReturnPath(rawReturnUrl, origin);
  return safe === DEFAULT_RETURN_PATH ? '' : `?return_url=${encodeURIComponent(safe)}`;
}

/** The sign-in page, keeping the return address the link carried if it is safe. */
export function signInPath(rawReturnUrl: string | null | undefined, origin?: string): string {
  return `/login${returnQuery(rawReturnUrl, origin)}`;
}

/**
 * The callback page's own address with the tokens or the error taken out,
 * and the return address kept only if it is safe.
 */
export function cleanCallbackPath(rawReturnUrl: string | null | undefined, origin?: string): string {
  return `/auth/callback${returnQuery(rawReturnUrl, origin)}`;
}
