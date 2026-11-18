import { describe, expect, it } from 'vitest';
import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError } from '@supabase/supabase-js';
import {
  classifyCallbackFailure,
  cleanCallbackPath,
  failureLogLine,
  readCallbackAddress,
  signInPath,
} from './authCallback';

// Backlog A-12: how /auth/callback decides what went wrong.

const ORIGIN = 'https://app.example.test';
const at = (rest: string) => readCallbackAddress(`${ORIGIN}/auth/callback${rest}`);
const EXPIRED = 'error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
const TOKENS = '#access_token=a.b.c&expires_in=3600&refresh_token=r&token_type=bearer&type=magiclink';

describe('readCallbackAddress', () => {
  it('reads an error from the fragment, from the query, and from both', () => {
    for (const rest of [`#${EXPIRED}`, `?${EXPIRED}`, `?${EXPIRED}#${EXPIRED}`, `?return_url=%2Fx#${EXPIRED}`]) {
      expect(at(rest)).toMatchObject({ error: 'access_denied', errorCode: 'otp_expired', hasError: true });
    }
  });

  it('lets the query win over the fragment, as the Supabase client does', () => {
    expect(at('?error_code=otp_expired#error_code=other').errorCode).toBe('otp_expired');
  });

  it('sees tokens, a code, and nothing', () => {
    expect(at(TOKENS)).toMatchObject({ hasTokens: true, hasCode: false, hasError: false });
    expect(at('?code=abc')).toMatchObject({ hasTokens: false, hasCode: true, hasError: false });
    expect(at('?return_url=%2Fx')).toMatchObject({ hasTokens: false, hasCode: false, hasError: false });
    expect(readCallbackAddress('not an address')).toMatchObject({ hasTokens: false, hasCode: false, hasError: false });
  });

  it('counts a description on its own as an error, and never returns it', () => {
    const address = at('#error_description=Some+server+text');
    expect(address.hasError).toBe(true);
    expect(JSON.stringify(address)).not.toContain('server');
  });
});

describe('classifyCallbackFailure', () => {
  it('an error in the address: expired when the code says so, failed otherwise', () => {
    expect(classifyCallbackFailure(at(`#${EXPIRED}`), null)).toBe('expired');
    expect(classifyCallbackFailure(at(`?${EXPIRED}`), null)).toBe('expired');
    expect(classifyCallbackFailure(at('#error=access_denied&error_code=user_banned'), null)).toBe('failed');
    expect(classifyCallbackFailure(at('#error=access_denied'), null)).toBe('failed');
    expect(classifyCallbackFailure(at('?error=server_error&error_description=x'), null)).toBe('failed');
  });

  it('a token the auth server refused (401, 403, 400) is an expired link', () => {
    const address = at(TOKENS);
    expect(classifyCallbackFailure(address, new AuthApiError('invalid JWT: token is expired', 401, 'bad_jwt'))).toBe('expired');
    expect(classifyCallbackFailure(address, new AuthApiError('x', 403, 'session_not_found'))).toBe('expired');
    expect(classifyCallbackFailure(address, new AuthApiError('x', 400, undefined))).toBe('expired');
    expect(classifyCallbackFailure(address, new AuthSessionMissingError())).toBe('expired');
  });

  it('no proper answer from the auth server is a connection problem, not an expired link', () => {
    const address = at(TOKENS);
    expect(classifyCallbackFailure(address, new AuthRetryableFetchError('Failed to fetch', 0))).toBe('connection');
    expect(classifyCallbackFailure(address, new AuthApiError('x', 500, undefined))).toBe('connection');
    expect(classifyCallbackFailure(address, new AuthApiError('x', 429, 'over_request_rate_limit'))).toBe('connection');
    expect(classifyCallbackFailure(at(''), new AuthRetryableFetchError('Failed to fetch', 0))).toBe('connection');
  });

  it('tokens the client could not use for a reason it does not name: failed', () => {
    expect(classifyCallbackFailure(at(TOKENS), null)).toBe('failed');
    expect(classifyCallbackFailure(at(TOKENS), new Error('odd'))).toBe('failed');
  });

  it('a PKCE code is unsupported; nothing at all is empty', () => {
    expect(classifyCallbackFailure(at('?code=abc'), null)).toBe('unsupported');
    expect(classifyCallbackFailure(at(''), null)).toBe('empty');
    expect(classifyCallbackFailure(at('?return_url=%2Fpremium%2Fvault'), null)).toBe('empty');
    // A stored session that could not be refreshed is not about this address.
    expect(classifyCallbackFailure(at(''), new AuthApiError('x', 400, 'refresh_token_not_found'))).toBe('empty');
  });
});

describe('failureLogLine', () => {
  it('names codes only: no server text, no token', () => {
    const line = failureLogLine(
      'expired',
      at(`#${EXPIRED}`),
      new AuthApiError('invalid JWT: token is expired', 401, 'bad_jwt'),
    );
    expect(line).toBe('kind=expired error=access_denied error_code=otp_expired client=AuthApiError status=401 code=bad_jwt');
    expect(line).not.toMatch(/invalid JWT|Email link/);
  });
});

describe('signInPath and cleanCallbackPath', () => {
  it('keep a safe return address, encoded once', () => {
    const route = '/premium/plans/wizard?next=%2Fx&plan=B';
    expect(signInPath(route, ORIGIN)).toBe(`/login?return_url=${encodeURIComponent(route)}`);
    expect(cleanCallbackPath(route, ORIGIN)).toBe(`/auth/callback?return_url=${encodeURIComponent(route)}`);
  });

  it('carry nothing for the default, for no address, and for one that leaves the site or loops', () => {
    for (const raw of [null, undefined, '', '/dashboard', '//example.com', '/\\example.com', 'https://example.com/', '/login', '/auth/callback?return_url=/x', '/%2Fexample.com']) {
      expect(signInPath(raw, ORIGIN)).toBe('/login');
      expect(cleanCallbackPath(raw, ORIGIN)).toBe('/auth/callback');
    }
  });
});
