import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLocale } from '@/i18n/useLocale';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, Mail, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Status = 'loading' | 'success' | 'error';

export default function PurchaseSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { locale } = useLocale();
  const [status, setStatus] = useState<Status>('loading');
  const [email, setEmail] = useState<string>('');
  const [isNewUser, setIsNewUser] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setErrorMessage(locale === 'pt' 
        ? 'Sessão de pagamento não encontrada.' 
        : 'Payment session not found.');
      return;
    }

    const completeGuest = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('complete-guest-purchase', {
          body: { session_id: sessionId }
        });

        if (error) throw error;

        if (data?.success && data?.email) {
          setEmail(data.email);
          setIsNewUser(data.is_new_user ?? true);
          setStatus('success');
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

    completeGuest();
  }, [sessionId, locale]);

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
              onClick={() => {
                toast.info(locale === 'pt' 
                  ? 'Verifica a pasta de spam se não encontrares o email.'
                  : 'Check your spam folder if you don\'t see the email.');
              }}
            >
              {locale === 'pt' ? 'Não recebi o email' : 'I didn\'t receive the email'}
            </Button>
          ) : (
            <Button 
              className="w-full"
              onClick={() => navigate('/login')}
            >
              {locale === 'pt' ? 'Ir para Login' : 'Go to Login'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
