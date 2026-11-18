import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLocale } from '@/i18n/useLocale';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'timeout'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const processedRef = useRef(false);

  // Validate and sanitize return URL (security + loop prevention)
  const sanitizeReturnUrl = (url: string): string => {
    // Block login/auth pages to prevent loops
    if (!url || url.startsWith('/login') || url.startsWith('/auth')) {
      return '/dashboard';
    }
    // Block already-encoded URLs (indicates loop)
    if (url.includes('%2F') || url.includes('%252F')) {
      return '/dashboard';
    }
    // Must start with / and not //
    if (!url.startsWith('/') || url.startsWith('//')) {
      return '/dashboard';
    }
    // Block javascript/data URLs
    if (url.toLowerCase().includes('javascript:') || url.toLowerCase().includes('data:')) {
      return '/dashboard';
    }
    return url;
  };

  useEffect(() => {
    // Prevent double-processing in React Strict Mode
    if (processedRef.current) return;
    processedRef.current = true;

    // Check for error in URL params (Supabase may redirect with error)
    const errorParam = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');

    if (errorParam) {
      setStatus('error');
      setErrorMessage(errorDesc || errorParam || 'Authentication failed');
      return;
    }

    // The Supabase client reads the callback address itself as it starts
    // (tokens in the fragment, or a PKCE `code` in the query), stores the
    // session and removes the tokens from the address. This page only waits
    // for the outcome. It must not hand the same tokens to the client again
    // with setSession: that was a race with the client (backlog A-08).
    let settled = false;
    const cleanups: Array<() => void> = [];
    const settle = () => {
      settled = true;
      cleanups.forEach((cleanup) => cleanup());
    };

    const arrive = () => {
      if (settled) return;
      settle();
      setStatus('success');
      const safeReturnUrl = sanitizeReturnUrl(searchParams.get('return_url') || '/dashboard');

      setTimeout(() => {
        navigate(safeReturnUrl, { replace: true });
      }, 800);
    };

    const fail = (message: string) => {
      if (settled) return;
      settle();
      setStatus('error');
      setErrorMessage(message);
    };

    // Armed before anything is waited for, so that it covers every path:
    // whatever happens below, the visitor is not left on "Signing you in...".
    const timeout = setTimeout(() => {
      if (settled) return;
      settle();
      setStatus('timeout');
    }, 10000);
    cleanups.push(() => clearTimeout(timeout));

    // Synchronous, and starts no Supabase call: the auth client awaits its
    // listeners while holding its lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        arrive();
      }
    });
    cleanups.push(() => subscription.unsubscribe());

    // Answers once the client has finished reading the address: covers the
    // magic link, the PKCE code and a visitor who is already signed in.
    supabase.auth.getSession().then(
      ({ data, error }) => {
        if (error) fail(error.message);
        else if (data.session) arrive();
        // No session: keep waiting for the listener, until the timeout.
      },
      () => fail('An unexpected error occurred.'),
    );
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 pb-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Signing you in...</h2>
              <p className="text-muted-foreground">Please wait while we verify your login.</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Welcome!</h2>
              <p className="text-muted-foreground">Redirecting you now...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
              <p className="text-muted-foreground mb-4">{errorMessage}</p>
              <Button onClick={() => navigate('/login')} className="w-full">
                Try again
              </Button>
            </>
          )}

          {status === 'timeout' && (
            <div role="alert">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">{t.auth.callbackTimeoutTitle}</h2>
              <p className="text-muted-foreground mb-4">{t.auth.callbackTimeoutDescription}</p>
              <div className="space-y-2">
                <Button onClick={() => window.location.reload()} className="w-full">
                  {t.auth.callbackTimeoutRetry}
                </Button>
                <Button variant="outline" onClick={() => navigate('/login')} className="w-full">
                  {t.auth.callbackTimeoutSignIn}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
