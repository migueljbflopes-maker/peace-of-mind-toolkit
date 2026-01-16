import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLocale } from '@/i18n/useLocale';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, Mail, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { clearEntitlementsCache } from '@/contexts/EntitlementsContext';

type Status = 'loading' | 'success' | 'error';

export default function PurchaseSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { locale } = useLocale();
  const [status, setStatus] = useState<Status>('loading');
  const [email, setEmail] = useState<string>('');
  const [isNewUser, setIsNewUser] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [resending, setResending] = useState(false);
  const processedRef = useRef(false);

  const sessionId = searchParams.get('session_id');
  const claimCode = searchParams.get('claim_code');
  const source = searchParams.get('source');

  useEffect(() => {
    // Prevent double processing
    if (processedRef.current) return;
    
    // Need either session_id (checkout) or claim_code (express pay)
    if (!sessionId && !claimCode) {
      // Try localStorage fallback for claim code
      const fallbackCode = localStorage.getItem('resilient_claim_code_last');
      if (fallbackCode) {
        console.log('[PurchaseSuccess] Using fallback claim code from localStorage');
        processExpressPurchase(fallbackCode);
        return;
      }
      
      setStatus('error');
      setErrorMessage(locale === 'pt' 
        ? 'Sessão de pagamento não encontrada.' 
        : 'Payment session not found.');
      return;
    }

    processedRef.current = true;

    if (sessionId) {
      // Standard Stripe Checkout flow
      completeGuestPurchase(sessionId);
    } else if (claimCode) {
      // Express Pay flow (Apple Pay / Google Pay)
      processExpressPurchase(claimCode);
    }
  }, [sessionId, claimCode, locale]);

  const completeGuestPurchase = async (sid: string) => {
    try {
      console.log('[PurchaseSuccess] Completing guest purchase via session_id');
      const { data, error } = await supabase.functions.invoke('complete-guest-purchase', {
        body: { session_id: sid }
      });

      if (error) throw error;

      if (data?.success && data?.email) {
        setEmail(data.email);
        setIsNewUser(data.is_new_user ?? true);
        setStatus('success');
        // Clear entitlements cache so next login gets fresh premium status
        clearEntitlementsCache();
        // Clear any stored claim code
        localStorage.removeItem('resilient_claim_code_last');
      } else {
        throw new Error('Unexpected response');
      }
    } catch (err) {
      console.error('Error completing purchase:', err);
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 
        locale === 'pt' ? 'Erro ao processar compra.' : 'Error processing purchase.'
      );
    }
  };

  const processExpressPurchase = async (code: string, retryCount = 0) => {
    const maxRetries = 5;
    const retryDelay = 3000; // 3 seconds (total wait: up to 15 seconds)
    
    try {
      console.log(`[PurchaseSuccess] Completing express purchase via claim_code (attempt ${retryCount + 1}/${maxRetries + 1})`);
      const { data, error } = await supabase.functions.invoke('complete-express-purchase', {
        body: { claimCode: code }
      });

      console.log('[PurchaseSuccess] Express purchase response:', { data, error });

      // Check for structured retryable response (HTTP 200 with success: false, retryable: true)
      if (data?.retryable && retryCount < maxRetries) {
        console.log(`[PurchaseSuccess] Retryable response, attempt ${retryCount + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return processExpressPurchase(code, retryCount + 1);
      }

      // HTTP error from invoke
      if (error) {
        const errorMsg = typeof error === 'string' ? error : (error as any)?.message || '';
        if (errorMsg.includes('email not available') && retryCount < maxRetries) {
          console.log(`[PurchaseSuccess] Email not ready, retry ${retryCount + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return processExpressPurchase(code, retryCount + 1);
        }
        throw error;
      }

      // Check if response data indicates a retryable error
      if (data?.error?.includes('email not available') && retryCount < maxRetries) {
        console.log(`[PurchaseSuccess] Email not ready (from data), retry ${retryCount + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return processExpressPurchase(code, retryCount + 1);
      }

      if (data?.success && data?.email) {
        setEmail(data.email);
        setIsNewUser(data.is_new_user ?? true);
        setStatus('success');
        // Clear entitlements cache so next login gets fresh premium status
        clearEntitlementsCache();
        // Clear the stored claim code on success
        localStorage.removeItem('resilient_claim_code_last');
      } else if (data?.error) {
        throw new Error(data.error);
      } else {
        throw new Error('Unexpected response from express purchase completion');
      }
    } catch (err) {
      console.error('[PurchaseSuccess] Error completing express purchase:', err);
      
      // If email not available and we have retries left, try again
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('email not available') && retryCount < maxRetries) {
        console.log(`[PurchaseSuccess] Retrying after catch, attempt ${retryCount + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return processExpressPurchase(code, retryCount + 1);
      }
      
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 
        locale === 'pt' ? 'Erro ao processar compra.' : 'Error processing purchase.'
      );
    }
  };

  const handleResendEmail = async () => {
    if (!email || resending) return;
    
    setResending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?return_url=/dashboard`,
        },
      });
      
      if (error) throw error;
      
      toast.success(locale === 'pt' 
        ? 'Email reenviado! Verifica a caixa de entrada.' 
        : 'Email resent! Check your inbox.');
    } catch (err) {
      console.error('Error resending email:', err);
      toast.error(locale === 'pt' 
        ? 'Erro ao reenviar email. Tenta novamente.' 
        : 'Failed to resend email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // Inject conversion tracking script on success
  const conversionScriptRef = useRef<HTMLScriptElement | null>(null);
  useEffect(() => {
    if (status === 'success' && !conversionScriptRef.current) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = '//blas6.ttrk.io/postback.js';
      script.async = true;
      document.body.appendChild(script);
      conversionScriptRef.current = script;
      console.log('[PurchaseSuccess] Conversion tracking script injected');

      return () => {
        if (conversionScriptRef.current && document.body.contains(conversionScriptRef.current)) {
          document.body.removeChild(conversionScriptRef.current);
          conversionScriptRef.current = null;
        }
      };
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
          <h1 className="text-xl font-semibold mb-2">
            {locale === 'pt' ? 'A processar pagamento...' : 'Processing payment...'}
          </h1>
          <p className="text-muted-foreground">
            {locale === 'pt' 
              ? 'Por favor aguarda enquanto confirmamos o teu pagamento.'
              : 'Please wait while we confirm your payment.'}
          </p>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold mb-2">
            {locale === 'pt' ? 'Algo correu mal' : 'Something went wrong'}
          </h1>
          <p className="text-muted-foreground mb-6">{errorMessage}</p>
          <Button onClick={() => navigate('/pricing')}>
            {locale === 'pt' ? 'Voltar ao Pricing' : 'Back to Pricing'}
          </Button>
        </Card>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center border-emerald-200">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">
          {locale === 'pt' ? 'Bem-vindo ao Premium!' : 'Welcome to Premium!'}
        </h1>
        
        <p className="text-muted-foreground mb-6">
          {isNewUser ? (
            locale === 'pt' 
              ? 'O teu pagamento foi confirmado e criámos a tua conta.'
              : 'Your payment has been confirmed and we\'ve created your account.'
          ) : (
            locale === 'pt' 
              ? 'O teu pagamento foi confirmado e a tua conta foi atualizada para Premium!'
              : 'Your payment has been confirmed and your account has been upgraded to Premium!'
          )}
        </p>

        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Mail className="h-5 w-5 text-primary" />
            <span className="font-medium">
              {locale === 'pt' ? 'Verifica o teu email' : 'Check your email'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {isNewUser ? (
              <>
                {locale === 'pt' 
                  ? `Enviámos um link de acesso para `
                  : `We've sent an access link to `}
                <span className="font-semibold text-foreground">{email}</span>
              </>
            ) : (
              <>
                {locale === 'pt' 
                  ? `A tua conta `
                  : `Your account `}
                <span className="font-semibold text-foreground">{email}</span>
                {locale === 'pt' 
                  ? ` agora é Premium!`
                  : ` is now Premium!`}
              </>
            )}
          </p>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          {isNewUser ? (
            locale === 'pt'
              ? 'Clica no link no email para aceder ao teu dashboard personalizado.'
              : 'Click the link in your email to access your personalized dashboard.'
          ) : (
            locale === 'pt'
              ? 'Podes fazer login com o teu email para aceder às funcionalidades Premium.'
              : 'You can log in with your email to access Premium features.'
          )}
        </p>

        <div className="space-y-2">
          {isNewUser ? (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleResendEmail}
              disabled={resending}
            >
              {resending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {locale === 'pt' ? 'Reenviar email de acesso' : 'Resend access email'}
            </Button>
          ) : (
            <Button 
              className="w-full"
              onClick={() => navigate('/login')}
            >
              {locale === 'pt' ? 'Ir para Login' : 'Go to Login'}
            </Button>
          )}
          
          <p className="text-xs text-muted-foreground">
            {locale === 'pt' 
              ? 'Verifica a pasta de spam se não encontrares o email.'
              : 'Check your spam folder if you don\'t see the email.'}
          </p>
        </div>
      </Card>
    </div>
  );
}
