import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, Mail, AlertCircle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/i18n/useLocale';
import { toast } from 'sonner';

const CLAIM_CODE_KEY = 'resilient_claim_code_last';
const PAYER_EMAIL_KEY = 'resilient_payer_email';

export default function Claim() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { locale } = useLocale();
  
  const [status, setStatus] = useState<'loading' | 'claiming' | 'not_logged_in' | 'success' | 'error'>('loading');
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  // Get claim code from URL or localStorage
  const claimCode = searchParams.get('claim') || localStorage.getItem(CLAIM_CODE_KEY);
  const savedEmail = localStorage.getItem(PAYER_EMAIL_KEY);

  useEffect(() => {
    if (authLoading) return;

    if (!claimCode) {
      setStatus('error');
      setErrorReason('NO_CLAIM_CODE');
      return;
    }

    if (!user) {
      setStatus('not_logged_in');
      return;
    }

    // User is logged in, attempt to claim
    claimPurchase();
  }, [user, authLoading, claimCode]);

  const claimPurchase = async () => {
    if (!claimCode) return;

    setStatus('claiming');
    try {
      const { data, error } = await supabase.functions.invoke('claim-guest-purchase', {
        body: { claimCode },
      });

      if (error) throw error;

      if (data?.ok) {
        setStatus('success');
        // Clear stored data
        localStorage.removeItem(CLAIM_CODE_KEY);
        localStorage.removeItem(PAYER_EMAIL_KEY);
        
        // Redirect after brief delay
        setTimeout(() => {
          navigate('/premium/onboarding?welcome=true');
        }, 2000);
      } else {
        setStatus('error');
        setErrorReason(data?.reason || 'UNKNOWN');
      }
    } catch (err) {
      console.error('Claim error:', err);
      setStatus('error');
      setErrorReason('NETWORK_ERROR');
    }
  };

  const handleResendLink = async () => {
    if (!savedEmail || !claimCode) {
      toast.error(locale === 'pt' ? 'Email não encontrado' : 'Email not found');
      return;
    }

    setResending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: savedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/claim?claim=${claimCode}`,
        },
      });

      if (error) throw error;
      toast.success(locale === 'pt' ? 'Link reenviado!' : 'Link resent!');
    } catch (err) {
      console.error('Resend error:', err);
      toast.error(locale === 'pt' ? 'Erro ao reenviar' : 'Error resending');
    } finally {
      setResending(false);
    }
  };

  const getErrorMessage = () => {
    switch (errorReason) {
      case 'EMAIL_MISMATCH':
        return locale === 'pt'
          ? 'Por favor, faz login com o mesmo email usado no checkout.'
          : 'Please log in with the same email used at checkout.';
      case 'NOT_PAID':
        return locale === 'pt'
          ? 'O pagamento ainda não foi confirmado. Tenta novamente em alguns segundos.'
          : 'Payment not yet confirmed. Try again in a few seconds.';
      case 'ALREADY_CLAIMED':
        return locale === 'pt'
          ? 'Esta compra já foi ativada. Vai para o dashboard.'
          : 'This purchase was already activated. Go to your dashboard.';
      case 'CLAIM_NOT_FOUND':
        return locale === 'pt'
          ? 'Código de ativação inválido.'
          : 'Invalid activation code.';
      case 'NO_CLAIM_CODE':
        return locale === 'pt'
          ? 'Código de ativação em falta.'
          : 'Missing activation code.';
      default:
        return locale === 'pt'
          ? 'Ocorreu um erro. Tenta novamente.'
          : 'An error occurred. Please try again.';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 shadow-lg">
        {status === 'loading' || status === 'claiming' ? (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              {status === 'claiming'
                ? (locale === 'pt' ? 'A ativar o teu acesso...' : 'Activating your access...')
                : (locale === 'pt' ? 'A carregar...' : 'Loading...')}
            </p>
          </div>
        ) : status === 'not_logged_in' ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-2">
                {locale === 'pt' ? 'Verifica o teu email' : 'Check your email'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {locale === 'pt'
                  ? 'Enviámos um link de acesso seguro. Clica nele para ativar o teu plano premium.'
                  : 'We sent a secure access link. Click it to activate your premium plan.'}
              </p>
              {savedEmail && (
                <p className="text-sm text-primary mt-2">{savedEmail}</p>
              )}
            </div>

            {savedEmail && (
              <Button
                variant="outline"
                onClick={handleResendLink}
                disabled={resending}
                className="w-full"
              >
                {resending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {locale === 'pt' ? 'A enviar...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    {locale === 'pt' ? 'Reenviar link' : 'Resend link'}
                  </>
                )}
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              {locale === 'pt'
                ? 'O link expira em 1 hora. Verifica também a pasta de spam.'
                : 'The link expires in 1 hour. Check your spam folder too.'}
            </p>
          </div>
        ) : status === 'success' ? (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-2">
                {locale === 'pt' ? 'Acesso ativado!' : 'Access activated!'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {locale === 'pt'
                  ? 'A redirecionar para o teu dashboard...'
                  : 'Redirecting to your dashboard...'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>{locale === 'pt' ? 'Premium ativo' : 'Premium active'}</span>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            
            <div>
              <h2 className="text-xl font-semibold mb-2">
                {locale === 'pt' ? 'Não foi possível ativar' : 'Could not activate'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {getErrorMessage()}
              </p>
            </div>

            <div className="space-y-3">
              {errorReason === 'ALREADY_CLAIMED' && (
                <Button onClick={() => navigate('/dashboard')} className="w-full">
                  {locale === 'pt' ? 'Ir para o Dashboard' : 'Go to Dashboard'}
                </Button>
              )}
              
              {errorReason === 'EMAIL_MISMATCH' && (
                <Button 
                  variant="outline" 
                  onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}
                  className="w-full"
                >
                  {locale === 'pt' ? 'Fazer login com outro email' : 'Log in with different email'}
                </Button>
              )}

              {errorReason === 'NOT_PAID' && (
                <Button onClick={claimPurchase} className="w-full">
                  {locale === 'pt' ? 'Tentar novamente' : 'Try again'}
                </Button>
              )}

              <Button variant="ghost" onClick={() => navigate('/')} className="w-full">
                {locale === 'pt' ? 'Voltar ao início' : 'Back to home'}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
