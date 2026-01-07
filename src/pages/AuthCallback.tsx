import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash (Supabase puts tokens there)
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          setStatus('error');
          setErrorMessage(error.message);
          return;
        }
        
        if (data.session) {
          setStatus('success');
          
          // Get return URL and validate it's internal
          const returnUrl = searchParams.get('return_url') || '/dashboard';
          const safeReturnUrl = isValidReturnUrl(returnUrl) ? returnUrl : '/dashboard';
          
          // Small delay to show success state
          setTimeout(() => {
            navigate(safeReturnUrl, { replace: true });
          }, 1000);
        } else {
          // No session yet, might still be processing
          // Listen for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
              setStatus('success');
              const returnUrl = searchParams.get('return_url') || '/dashboard';
              const safeReturnUrl = isValidReturnUrl(returnUrl) ? returnUrl : '/dashboard';
              
              setTimeout(() => {
                navigate(safeReturnUrl, { replace: true });
              }, 1000);
              
              subscription.unsubscribe();
            }
          });
          
          // Timeout after 10 seconds
          setTimeout(() => {
            if (status === 'loading') {
              setStatus('error');
              setErrorMessage('Authentication timed out. Please try again.');
            }
          }, 10000);
        }
      } catch (e) {
        setStatus('error');
        setErrorMessage('An unexpected error occurred.');
      }
    };

    handleCallback();
  }, [navigate, searchParams, status]);

  // Validate return URL is internal (security)
  const isValidReturnUrl = (url: string): boolean => {
    if (!url) return false;
    // Must start with / and not be a protocol-relative URL
    if (!url.startsWith('/') || url.startsWith('//')) return false;
    // Block javascript: and data: schemes
    if (url.toLowerCase().includes('javascript:') || url.toLowerCase().includes('data:')) return false;
    return true;
  };

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
        </CardContent>
      </Card>
    </div>
  );
}
