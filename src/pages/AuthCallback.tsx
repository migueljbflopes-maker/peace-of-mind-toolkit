import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLocale } from '@/i18n/useLocale';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { safeReturnPath } from '@/lib/returnUrl';
import {
  classifyCallbackFailure,
  cleanCallbackPath,
  failureLogLine,
  readCallbackAddress,
  signInPath,
  type CallbackFailure,
} from '@/lib/authCallback';

type Status = 'loading' | 'success' | CallbackFailure;

export default function AuthCallback() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const processedRef = useRef(false);
  // The texts as they are now, for the notice shown from inside the effect.
  const textsRef = useRef(t.auth);
  textsRef.current = t.auth;

  // The sign-in page, with the return address the link carried if it is safe.
  const signInAddress = signInPath(searchParams.get('return_url'));

  useEffect(() => {
    // Prevent double-processing in React Strict Mode
    if (processedRef.current) return;
    processedRef.current = true;

    const rawReturnUrl = searchParams.get('return_url');
    // What the address carries, read before anything is waited for. The
    // client leaves it there unless it signs the visitor in.
    const address = readCallbackAddress(window.location.href);

    // The Supabase client reads the callback address itself as it starts
    // (tokens or an error, in the fragment or the query), stores the session
    // and removes the tokens from the address. This page only waits for the
    // outcome. It must not hand the same tokens to the client again with
    // setSession: that was a race with the client (backlog A-08).
    //
    // One outcome only: whichever of arrive() and fail() comes first settles
    // the page, and everything after it is ignored.
    let settled = false;
    const cleanups: Array<() => void> = [];
    const settle = () => {
      settled = true;
      cleanups.forEach((cleanup) => cleanup());
    };

    const arrive = (linkNotUsedFor?: string) => {
      if (settled) return;
      settle();
      setStatus('success');
      const safeReturnUrl = safeReturnPath(rawReturnUrl);
      // Already signed in, and the link that was opened did nothing: say so,
      // or a visitor who expected another account would not know.
      if (linkNotUsedFor !== undefined) {
        toast({
          title: textsRef.current.callbackLinkNotUsedTitle,
          description: textsRef.current.callbackLinkNotUsedDescription.replace('{email}', linkNotUsedFor),
        });
      }

      setTimeout(() => {
        navigate(safeReturnUrl, { replace: true });
      }, 800);
    };

    const fail = (kind: CallbackFailure, clientError?: unknown) => {
      if (settled) return;
      settle();
      // For support. Codes only: no token and none of the server's text.
      console.warn(`[AuthCallback] ${failureLogLine(kind, address, clientError)}`);
      // A link that may still be good stays in the address, for "Try again".
      // Anything else is taken out: the tokens or the error, and a return
      // address that is not safe.
      if (kind !== 'connection') {
        window.history.replaceState(window.history.state, '', cleanCallbackPath(rawReturnUrl));
      }
      setStatus(kind);
    };

    // Armed before anything is waited for, so that it covers every path:
    // whatever happens below, the visitor is not left on "Signing you in...".
    const timeout = setTimeout(() => fail('connection'), 10000);
    cleanups.push(() => clearTimeout(timeout));

    // Synchronous, and starts no Supabase call: the auth client awaits its
    // listeners while holding its lock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        arrive();
      }
    });
    cleanups.push(() => subscription.unsubscribe());

    // initialize() hands back the promise of the reading the client began
    // when it was created (it starts nothing new) and resolves with the
    // error if the link was refused. By then a good link has become a stored
    // session, so getSession() answers the rest: signed in (by this link or
    // from before) or not. After that there is nothing left to wait for.
    const outcome = async () => {
      const { error: linkError } = await supabase.auth.initialize();
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (data.session) {
        const linkFailed = address.hasError || (address.hasTokens && Boolean(linkError));
        arrive(linkFailed ? data.session.user.email ?? '' : undefined);
        return;
      }
      const clientError = linkError ?? sessionError;
      fail(classifyCallbackFailure(address, clientError), clientError);
    };
    outcome().catch((error: unknown) => fail('failed', error));
  }, [navigate, searchParams, toast]);

  const failures: Record<
    Exclude<CallbackFailure, 'connection'>,
    { title: string; description: string; forward: string }
  > = {
    expired: {
      title: t.auth.callbackExpiredTitle,
      description: t.auth.callbackExpiredDescription,
      forward: t.auth.callbackNewLink,
    },
    failed: {
      title: t.auth.callbackFailedTitle,
      description: t.auth.callbackFailedDescription,
      forward: t.auth.callbackNewLink,
    },
    unsupported: {
      title: t.auth.callbackUnsupportedTitle,
      description: t.auth.callbackUnsupportedDescription,
      forward: t.auth.callbackTimeoutSignIn,
    },
    empty: {
      title: t.auth.callbackEmptyTitle,
      description: t.auth.callbackEmptyDescription,
      forward: t.auth.callbackTimeoutSignIn,
    },
  };
  const failure =
    status !== 'loading' && status !== 'success' && status !== 'connection' ? failures[status] : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 pb-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">{t.auth.callbackLoadingTitle}</h2>
              <p className="text-muted-foreground">{t.auth.callbackLoadingDescription}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">{t.auth.callbackSuccessTitle}</h2>
              <p className="text-muted-foreground">{t.auth.callbackSuccessDescription}</p>
            </>
          )}

          {/* The link cannot be used, whatever is tried: one way forward. */}
          {failure && (
            <div role="alert">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">{failure.title}</h2>
              <p className="text-muted-foreground mb-4">{failure.description}</p>
              <Button onClick={() => navigate(signInAddress, { replace: true })} className="w-full">
                {failure.forward}
              </Button>
            </div>
          )}

          {/* The auth server did not answer: the link may still be good. */}
          {status === 'connection' && (
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
                <Button variant="outline" onClick={() => navigate(signInAddress)} className="w-full">
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
