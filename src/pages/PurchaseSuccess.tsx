import React, { useState, useEffect } from 'react';
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
          {locale === 'pt' 
            ? 'O teu pagamento foi confirmado e a tua conta está pronta.'
            : 'Your payment has been confirmed and your account is ready.'}
        </p>

        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Mail className="h-5 w-5 text-primary" />
            <span className="font-medium">
              {locale === 'pt' ? 'Verifica o teu email' : 'Check your email'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {locale === 'pt' 
              ? `Enviámos um link de acesso para `
              : `We've sent an access link to `}
            <span className="font-semibold text-foreground">{email}</span>
          </p>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          {locale === 'pt'
            ? 'Clica no link no email para aceder ao teu dashboard personalizado.'
            : 'Click the link in your email to access your personalized dashboard.'}
        </p>

        <div className="space-y-2">
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
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          {locale === 'pt'
            ? 'Se já tens uma conta com este email, podes fazer login normalmente.'
            : 'If you already have an account with this email, you can log in normally.'}
        </p>
      </Card>
    </div>
  );
}
