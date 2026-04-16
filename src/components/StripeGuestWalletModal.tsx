import React, { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, CheckCircle2, Loader2, Mail, CreditCard, Wallet, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLocale } from '@/i18n/useLocale';
import { toast } from 'sonner';

/**
 * APPLE PAY DOMAIN REGISTRATION
 * 
 * For Apple Pay to work in production:
 * 1. Register domain in Stripe Dashboard → Settings → Payment methods → Apple Pay
 * 2. Host verification file at:
 *    /.well-known/apple-developer-merchantid-domain-association
 *    - Must return HTTP 200 (no redirects)
 *    - HTTPS required
 * 
 * For Google Pay: Usually works automatically with Stripe Elements
 */

const GUEST_SESSION_KEY = 'resilient_guest_session_id';
const CLAIM_CODE_KEY = 'resilient_claim_code_last';
const PAYER_EMAIL_KEY = 'resilient_payer_email';

// Initialize Stripe outside component to avoid re-initialization
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface StripeGuestWalletModalProps {
  open: boolean;
  onClose: () => void;
  city?: string;
}

function getOrCreateGuestSessionId(): string {
  let sessionId = localStorage.getItem(GUEST_SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(GUEST_SESSION_KEY, sessionId);
  }
  return sessionId;
}

// Inner component that uses Stripe hooks
function PaymentForm({
  claimCode,
  onSuccess,
  city,
}: {
  claimCode: string;
  onSuccess: (email?: string) => void;
  city?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { locale } = useLocale();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [expressReady, setExpressReady] = useState(false);
  const [availableMethods, setAvailableMethods] = useState<{ applePay?: boolean; googlePay?: boolean } | null>(null);

  // onClick handler - REQUIRED for ExpressCheckoutElement to work
  const handleExpressClick = useCallback(({ resolve }: {
    resolve: (options: {
      emailRequired?: boolean;
      phoneNumberRequired?: boolean;
      billingAddressRequired?: boolean;
    }) => void;
  }) => {
    if (import.meta.env.DEV) console.log('[Stripe] ExpressCheckout clicked, resolving options...');
    resolve({
      emailRequired: true,
      phoneNumberRequired: false,
      billingAddressRequired: false,
    });
  }, []);

  const handleExpressCheckoutConfirm = useCallback(async (event: {
    billingDetails?: { email?: string };
  }) => {
    if (!stripe || !elements) return;

    setIsProcessing(true);
    if (import.meta.env.DEV) console.log('[Stripe] ExpressCheckout confirm event:', event);
    
    try {
      // Get email from billing details if available
      const billingEmail = event.billingDetails?.email;
      if (import.meta.env.DEV) console.log('[Stripe] Billing email from wallet:', billingEmail);
      
      // If we got an email, save it immediately
      if (billingEmail) {
        await supabase.functions.invoke('set-guest-email', {
          body: { claimCode, email: billingEmail },
        });
        localStorage.setItem(PAYER_EMAIL_KEY, billingEmail);
      }

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/claim?claim=${claimCode}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        console.error('[Stripe] Payment error:', error);
        toast.error(error.message || (locale === 'pt' ? 'Erro no pagamento' : 'Payment error'));
        setIsProcessing(false);
      } else {
        // Payment succeeded
        if (import.meta.env.DEV) console.log('[Stripe] Payment succeeded');
        onSuccess(billingEmail);
      }
    } catch (err) {
      console.error('[Stripe] Payment error:', err);
      toast.error(locale === 'pt' ? 'Erro no pagamento' : 'Payment error');
      setIsProcessing(false);
    }
  }, [stripe, elements, claimCode, onSuccess, locale]);

  // onReady handler with detailed logging
  const handleExpressReady = useCallback(({ availablePaymentMethods }: { availablePaymentMethods?: { applePay?: boolean; googlePay?: boolean } }) => {
    if (import.meta.env.DEV) console.log('[Stripe] ExpressCheckout ready, available methods:', availablePaymentMethods);
    setAvailableMethods(availablePaymentMethods || null);
    
    // Only set ready if at least one method is available
    const hasMethod = availablePaymentMethods?.applePay || availablePaymentMethods?.googlePay;
    setExpressReady(!!hasMethod);
    
    if (!hasMethod) {
      if (import.meta.env.DEV) console.log('[Stripe] No express payment methods available on this device/browser');
    }
  }, []);

  const handleCardPayment = async () => {
    if (!stripe || !elements) return;

    setIsProcessing(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/claim?claim=${claimCode}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || (locale === 'pt' ? 'Erro no pagamento' : 'Payment error'));
        setIsProcessing(false);
      } else {
        // Payment succeeded - no wallet email for card payments
        onSuccess(undefined);
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast.error(locale === 'pt' ? 'Erro no pagamento' : 'Payment error');
      setIsProcessing(false);
    }
  };

  // Fallback to Stripe Checkout hosted (for Apple Pay when domain verification fails)
  const openStripeCheckoutHosted = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-guest-checkout', {
        body: { source: 'riskfunnel' },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No checkout URL received');

      // Open Stripe Checkout in same tab (it handles Apple Pay natively)
      window.location.href = data.url;
    } catch (err) {
      console.error('[Stripe] Checkout redirect error:', err);
      toast.error(locale === 'pt' ? 'Erro ao abrir checkout' : 'Error opening checkout');
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Express Checkout (Apple Pay / Google Pay) - native */}
      <div className="min-h-[44px]">
        <ExpressCheckoutElement
          onClick={handleExpressClick}
          onConfirm={handleExpressCheckoutConfirm}
          onReady={handleExpressReady}
          options={{
            buttonType: {
              applePay: 'buy',
              googlePay: 'buy',
            },
            wallets: {
              applePay: 'auto',
              googlePay: 'auto',
            },
          }}
        />
      </div>

      {/* Fallback: Stripe Checkout hosted (when express methods unavailable) */}
      {availableMethods !== null && !expressReady && (
        <div className="space-y-3">
          <Button
            onClick={openStripeCheckoutHosted}
            disabled={isProcessing}
            className="w-full"
            variant="default"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {locale === 'pt' ? 'A abrir...' : 'Opening...'}
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                {locale === 'pt' ? 'Checkout Rápido' : 'Express Checkout'}
                <ExternalLink className="ml-2 h-3 w-3 opacity-50" />
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            {locale === 'pt' 
              ? 'Apple Pay, Google Pay ou cartão'
              : 'Apple Pay, Google Pay or card'}
          </p>
        </div>
      )}

      {/* Divider - show when express is ready OR when we have fallback */}
      {(expressReady || (availableMethods !== null && !expressReady)) && (
        <div className="flex items-center gap-3 text-muted-foreground text-sm">
          <div className="flex-1 h-px bg-border" />
          <span>{locale === 'pt' ? 'ou' : 'or'}</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Card payment toggle */}
      {!showCardPayment ? (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowCardPayment(true)}
          disabled={isProcessing}
        >
          <CreditCard className="mr-2 h-4 w-4" />
          {locale === 'pt' ? 'Pagar com cartão' : 'Pay by card'}
        </Button>
      ) : (
        <div className="space-y-4">
          <PaymentElement />
          <Button
            onClick={handleCardPayment}
            disabled={isProcessing || !stripe}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {locale === 'pt' ? 'A processar...' : 'Processing...'}
              </>
            ) : (
              locale === 'pt' ? 'Pagar €49' : 'Pay €49'
            )}
          </Button>
        </div>
      )}

      {/* Trust signals */}
      <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground pt-2">
        <span className="flex items-center gap-1">
          <Lock className="h-3 w-3" />
          {locale === 'pt' ? 'Checkout seguro' : 'Secure checkout'}
        </span>
        <span>•</span>
        <span>{locale === 'pt' ? 'Pagamento único €49' : 'One-time €49'}</span>
      </div>
    </div>
  );
}

// Success step with email collection fallback
function SuccessStep({
  claimCode,
  walletEmail,
  onComplete,
}: {
  claimCode: string;
  walletEmail?: string;
  onComplete: () => void;
}) {
  const { locale } = useLocale();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(!!walletEmail);
  const [usedEmail, setUsedEmail] = useState(walletEmail || '');

  // Auto-send magic link if wallet email exists
  useEffect(() => {
    if (walletEmail && !sent) {
      sendMagicLink(walletEmail);
    }
  }, [walletEmail]);

  const sendMagicLink = async (targetEmail: string) => {
    setSending(true);
    try {
      // Save email to guest purchase if not already saved
      if (!walletEmail) {
        await supabase.functions.invoke('set-guest-email', {
          body: { claimCode, email: targetEmail },
        });
      }
      localStorage.setItem(PAYER_EMAIL_KEY, targetEmail);

      // Send magic link via Supabase auth
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/claim?claim=${claimCode}`,
        },
      });

      if (error) throw error;

      setUsedEmail(targetEmail);
      setSent(true);
      toast.success(locale === 'pt' ? 'Link enviado!' : 'Link sent!');
    } catch (err) {
      console.error('Magic link error:', err);
      toast.error(locale === 'pt' ? 'Erro ao enviar email' : 'Error sending email');
    } finally {
      setSending(false);
    }
  };

  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes('@')) {
      sendMagicLink(email);
    }
  };

  const handleAccessPlan = () => {
    window.location.href = `/claim?claim=${claimCode}`;
  };

  if (!sent) {
    // Fallback: ask for email
    return (
      <div className="space-y-4 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">
            {locale === 'pt' ? 'Pagamento confirmado!' : 'Payment confirmed!'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {locale === 'pt' 
              ? 'Insere o teu email para receber o link de acesso'
              : 'Enter your email to receive your access link'}
          </p>
        </div>
        
        <form onSubmit={handleSubmitEmail} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={sending || !email}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {locale === 'pt' ? 'A enviar...' : 'Sending...'}
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                {locale === 'pt' ? 'Enviar link de acesso' : 'Send access link'}
              </>
            )}
          </Button>
        </form>
      </div>
    );
  }

  // Success with email sent
  return (
    <div className="space-y-4 text-center">
      <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
      </div>
      <div>
        <h3 className="font-semibold text-lg">
          {locale === 'pt' ? 'Tudo pronto!' : 'All set!'}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {locale === 'pt' 
            ? `Enviámos um link de acesso para ${usedEmail}`
            : `We sent an access link to ${usedEmail}`}
        </p>
      </div>
      
      <Button onClick={handleAccessPlan} className="w-full">
        {locale === 'pt' ? 'Aceder ao meu plano' : 'Access my plan'}
      </Button>
      
      <p className="text-xs text-muted-foreground">
        {locale === 'pt' 
          ? 'Clica no link no email para ativar o teu acesso premium'
          : 'Click the link in your email to activate your premium access'}
      </p>
    </div>
  );
}

export function StripeGuestWalletModal({ open, onClose, city }: StripeGuestWalletModalProps) {
  const { locale } = useLocale();
  const [step, setStep] = useState<'loading' | 'payment' | 'success'>('loading');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [claimCode, setClaimCode] = useState<string | null>(null);
  const [walletEmail, setWalletEmail] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Initialize payment intent when modal opens
  useEffect(() => {
    if (open && step === 'loading') {
      initPaymentIntent();
    }
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('loading');
      setClientSecret(null);
      setClaimCode(null);
      setWalletEmail(undefined);
      setError(null);
    }
  }, [open]);

  const initPaymentIntent = async () => {
    try {
      const guestSessionId = getOrCreateGuestSessionId();
      
      const { data, error: invokeError } = await supabase.functions.invoke('create-payment-intent', {
        body: { guestSessionId },
      });

      if (invokeError) throw invokeError;
      if (!data?.clientSecret) throw new Error('No client secret received');

      setClientSecret(data.clientSecret);
      setClaimCode(data.claimCode);
      localStorage.setItem(CLAIM_CODE_KEY, data.claimCode);
      setStep('payment');
    } catch (err) {
      console.error('Payment intent error:', err);
      setError(locale === 'pt' ? 'Erro ao iniciar pagamento' : 'Error starting payment');
    }
  };

  const handlePaymentSuccess = (email?: string) => {
    setWalletEmail(email);
    setStep('success');
  };

  const elementsOptions = clientSecret ? {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0a8754',
        borderRadius: '8px',
      },
    },
  } : undefined;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8">
            {error ? (
              <div className="text-center space-y-4">
                <p className="text-destructive">{error}</p>
                <Button variant="outline" onClick={() => { setError(null); initPaymentIntent(); }}>
                  {locale === 'pt' ? 'Tentar novamente' : 'Try again'}
                </Button>
              </div>
            ) : (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">
                  {locale === 'pt' ? 'A preparar pagamento...' : 'Preparing payment...'}
                </p>
              </>
            )}
          </div>
        )}

        {step === 'payment' && clientSecret && claimCode && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">
                {locale === 'pt' ? 'Obter o Meu Plano' : 'Get My Plan'}
              </DialogTitle>
              <DialogDescription className="text-center">
                {city 
                  ? (locale === 'pt' 
                      ? `Plano personalizado para ${city}` 
                      : `Personalized plan for ${city}`)
                  : (locale === 'pt'
                      ? 'Plano de resiliência personalizado'
                      : 'Your personalized resiliency plan')}
              </DialogDescription>
            </DialogHeader>
            
            <Elements stripe={stripePromise} options={elementsOptions}>
              <PaymentForm
                claimCode={claimCode}
                onSuccess={handlePaymentSuccess}
                city={city}
              />
            </Elements>
          </>
        )}

        {step === 'success' && claimCode && (
          <SuccessStep
            claimCode={claimCode}
            walletEmail={walletEmail}
            onComplete={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
