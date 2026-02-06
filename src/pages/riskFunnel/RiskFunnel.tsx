import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLocale } from "@/i18n/useLocale";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, ChevronRight, CheckCircle2, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RiskOfferModal } from "@/components/RiskOfferModal";
import { trackFeature, FUNNEL_STEP_NAMES } from "@/lib/trackFeature";
import { loadStripe } from "@stripe/stripe-js";
import {
  type FunnelData, type ExpressPaySupport,
  defaultData, totalSteps, questionSteps,
  calculateScore, getRiskLevel, buildReasons,
  FunnelInterstitial, FunnelAnalyzingScreen, SocialProof,
  FunnelResultsCard, FunnelQuestionsLayout,
  devLog, devWarn, devError,
} from "./shared";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

if (import.meta.env.DEV) {
  console.log("[RiskFunnel] Stripe publishable key available:", !!stripePublishableKey);
}

const STORAGE_KEY = "resilient_risk_funnel";
const LOG_PREFIX = "RiskFunnel";
const FUNNEL_NAME = "riskfunnel";

// Product Popup - One-time payment variant
function ProductPopup({ open, onClose, onCheckout, loading, city }: {
  open: boolean; onClose: () => void; onCheckout: () => void; loading: boolean; city?: string;
}) {
  const { locale } = useLocale();
  const benefits = [
    { labelPt: "O teu plano de ação personalizado para 72h", labelEn: "Your personalized 72h action plan" },
    { labelPt: city ? `Análise de risco específica para ${city}` : "Análise de risco da tua cidade", labelEn: city ? `City-specific risk analysis for ${city}` : "City-specific risk analysis" },
    { labelPt: "Vault de emergência & Red Folder PDF", labelEn: "Emergency vault & Red Folder PDF" },
    { labelPt: "Botão de pânico para alertar a família", labelEn: "One-tap panic button for your family" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="text-center mb-4">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            {locale === "pt" ? "O teu plano personalizado está pronto" : "Your personalized plan is ready"}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {locale === "pt" ? "Desbloqueia acesso instantâneo a tudo o que precisas" : "Unlock instant access to everything you need"}
          </DialogDescription>
        </div>
        <ul className="space-y-3 py-4">
          {benefits.map((b, i) => (
            <li key={i} className="flex items-center gap-3">
              <Check className="h-5 w-5 text-emerald-500 shrink-0" />
              <span className="text-sm">{locale === "pt" ? b.labelPt : b.labelEn}</span>
            </li>
          ))}
        </ul>
        <Button onClick={onCheckout} disabled={loading} className="w-full" size="lg">
          {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{locale === "pt" ? "A processar..." : "Processing..."}</>) : locale === "pt" ? "Obter o Meu Plano — €49" : "Get My Plan — €49"}
        </Button>
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground mt-3">
          <span className="flex items-center gap-1"><Lock className="h-3 w-3" />{locale === "pt" ? "Checkout seguro" : "Secure checkout"}</span>
          <span>•</span>
          <span>{locale === "pt" ? "Sem subscrição" : "No subscription"}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RiskFunnel() {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const [step, setStep] = useState(1);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [expressPay, setExpressPay] = useState<ExpressPaySupport>({ ready: false, method: null });
  const [data, setData] = useState<FunnelData>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultData, ...JSON.parse(stored) } : defaultData;
    } catch { return defaultData; }
  });

  const paymentRequestRef = useRef<any>(null);
  const guestSessionIdRef = useRef<string | null>(null);
  const localeRef = useRef(locale);
  const navigateRef = useRef(navigate);

  useEffect(() => { localeRef.current = locale; }, [locale]);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  const getOrCreateGuestSessionId = () => {
    if (guestSessionIdRef.current) return guestSessionIdRef.current;
    const key = "resilient_guest_session_id";
    const existing = localStorage.getItem(key);
    const id = existing || crypto.randomUUID();
    if (!existing) localStorage.setItem(key, id);
    guestSessionIdRef.current = id;
    return id;
  };

  // Express Pay detection
  useEffect(() => {
    let cancelled = false;
    (async () => {
      devLog(LOG_PREFIX, "=== EXPRESS PAY DETECTION START ===");
      devLog(LOG_PREFIX, "Current domain:", window.location.hostname);

      if (!stripePromise) {
        devLog(LOG_PREFIX, "❌ Stripe not initialized");
        if (!cancelled) setExpressPay({ ready: true, method: null });
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) {
        devLog(LOG_PREFIX, "❌ Stripe.js failed to load");
        if (!cancelled) setExpressPay({ ready: true, method: null });
        return;
      }

      devLog(LOG_PREFIX, "✓ Stripe.js loaded");

      const pr = stripe.paymentRequest({
        country: "PT", currency: "eur",
        total: { label: "Resilient Plan", amount: 4900 },
        requestPayerName: true, requestPayerEmail: true,
      });

      pr.on("cancel", () => {
        devLog(LOG_PREFIX, "Express Pay: user cancelled");
        setCheckoutLoading(false);
      });

      pr.on("paymentmethod", async (ev: any) => {
        devLog(LOG_PREFIX, "Express Pay: paymentmethod event");
        try {
          devLog(LOG_PREFIX, "Express Pay: creating PaymentIntent...");
          const { data: piRes, error: piErr } = await supabase.functions.invoke("create-payment-intent", {
            body: { guestSessionId: getOrCreateGuestSessionId() },
          });
          if (piErr) throw piErr;

          const clientSecret: string | undefined = piRes?.clientSecret;
          devLog(LOG_PREFIX, "Express Pay: clientSecret received:", !!clientSecret);
          if (!clientSecret) throw new Error("Missing PaymentIntent clientSecret");

          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
            clientSecret, { payment_method: ev.paymentMethod.id }, { handleActions: false },
          );

          const currentLocale = localeRef.current;
          if (confirmError) {
            devError(LOG_PREFIX, "Express Pay: confirm error:", confirmError);
            ev.complete("fail");
            toast.error(currentLocale === "pt" ? "Falha no pagamento" : "Payment failed");
            setCheckoutLoading(false);
            return;
          }

          if (paymentIntent?.status === "requires_action") {
            devLog(LOG_PREFIX, "Express Pay: requires_action");
            const { error: actionError } = await stripe.confirmCardPayment(clientSecret);
            if (actionError) {
              devError(LOG_PREFIX, "Express Pay: action error:", actionError);
              ev.complete("fail");
              toast.error(currentLocale === "pt" ? "Falha no pagamento" : "Payment failed");
              setCheckoutLoading(false);
              return;
            }
          }

          ev.complete("success");
          devLog(LOG_PREFIX, "Express Pay: success, claimCode:", piRes?.claimCode);
          if (piRes?.claimCode) localStorage.setItem('resilient_claim_code_last', piRes.claimCode);
          window.location.href = `/purchase-success?claim_code=${piRes?.claimCode}&source=express`;
        } catch (err) {
          devError(LOG_PREFIX, "Express Pay: handler failed:", err);
          try { ev.complete("fail"); } catch { /* ignore */ }
          toast.error(localeRef.current === "pt" ? "Falha no pagamento" : "Payment failed");
          setCheckoutLoading(false);
        }
      });

      paymentRequestRef.current = pr;

      devLog(LOG_PREFIX, "Calling canMakePayment()...");
      const canPay = await pr.canMakePayment();
      devLog(LOG_PREFIX, "canMakePayment():", JSON.stringify(canPay));

      if (canPay === null) {
        devLog(LOG_PREFIX, "⚠️ canMakePayment null — domain/card/HTTPS issue");
      }

      const method = canPay?.applePay ? "apple_pay" : canPay?.googlePay ? "google_pay" : null;
      devLog(LOG_PREFIX, "Selected method:", method ?? "NONE");

      if (!cancelled) setExpressPay({ ready: true, method });
    })().catch((err) => {
      devError(LOG_PREFIX, "Express Pay detection error:", err);
      if (!cancelled) setExpressPay({ ready: true, method: null });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data]);
  useEffect(() => {
    trackFeature('risk_funnel', 'step_view', { funnel: FUNNEL_NAME, step, step_name: FUNNEL_STEP_NAMES[step] || `step_${step}` });
  }, [step]);

  const progressPercent = useMemo(() => {
    const qi = questionSteps.indexOf(step);
    return qi >= 0 ? ((qi + 1) / questionSteps.length) * 100 : 100;
  }, [step]);

  const currentQuestionNumber = useMemo(() => {
    const idx = questionSteps.indexOf(step);
    return idx >= 0 ? idx + 1 : questionSteps.length;
  }, [step]);

  const updateData = <K extends keyof FunnelData>(key: K, value: FunnelData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleHouseholdTag = (tag: string) => {
    setData((prev) => ({
      ...prev,
      householdTags: prev.householdTags.includes(tag)
        ? prev.householdTags.filter((t) => t !== tag)
        : [...prev.householdTags, tag],
    }));
  };

  const canProceed = useMemo(() => {
    switch (step) {
      case 1: return data.country && data.city;
      case 2: return !!data.homeType;
      case 3: return true;
      case 4: return !!data.emergencyExperience;
      case 6: return !!data.hasKit;
      case 7: return !!data.hasEvacuationPlan;
      default: return true;
    }
  }, [step, data]);

  const handleNext = () => {
    trackFeature('risk_funnel', 'step_complete', { funnel: FUNNEL_NAME, step, step_name: FUNNEL_STEP_NAMES[step] || `step_${step}` });
    if (step < totalSteps) setStep(step + 1);
  };

  const handleViewResults = () => setShowOfferModal(true);
  const handleOfferModalClose = (open: boolean) => { setShowOfferModal(open); if (!open) navigate("/"); };

  const handleCheckout = async () => {
    trackFeature('risk_funnel', 'checkout_click', { funnel: FUNNEL_NAME, risk_level: riskLevel, score: score.total });
    setCheckoutLoading(true);
    devLog(LOG_PREFIX, "Starting checkout...", { expressPayMethod: expressPay.method });

    try {
      const stripe = stripePromise ? await stripePromise : null;
      if (stripe && expressPay.ready && expressPay.method && paymentRequestRef.current) {
        devLog(LOG_PREFIX, "Attempting Express Pay with:", expressPay.method);
        try { paymentRequestRef.current.show(); return; } catch (err) {
          devWarn(LOG_PREFIX, "Express Pay show() failed; falling back:", err);
        }
      }

      devLog(LOG_PREFIX, "Using standard Checkout Session");
      const { data: res, error } = await supabase.functions.invoke("create-guest-checkout", { body: { source: FUNNEL_NAME } });
      if (error) throw error;
      if (!res?.url) throw new Error("No checkout URL received");
      devLog(LOG_PREFIX, "Redirecting to Stripe Checkout");
      window.location.href = res.url;
    } catch (e) {
      console.error("[RiskFunnel] Checkout error:", e);
      toast.error(locale === "pt" ? "Erro ao abrir checkout" : "Error opening checkout");
      setCheckoutLoading(false);
    }
  };

  const score = useMemo(() => calculateScore(data), [data]);
  const riskLevel = useMemo(() => getRiskLevel(score.total), [score.total]);
  const reasons = useMemo(() => buildReasons(data, locale), [data, locale]);

  // Interstitials
  if (step === 5) return <FunnelInterstitial titlePt="Perfil registado" titleEn="Profile logged" subtitlePt="A personalizar para a tua situação" subtitleEn="Personalizing for your situation" color="violet" onComplete={handleNext} />;
  if (step === 8) return <FunnelInterstitial titlePt="Verificação de prontidão completa" titleEn="Readiness check complete" subtitlePt="A calcular as tuas prioridades" subtitleEn="Calculating your priorities" color="emerald" onComplete={handleNext} />;
  if (step === 9) return <FunnelAnalyzingScreen city={data.city} onComplete={handleNext} />;

  // Results
  if (step === 10) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
          <FunnelResultsCard locale={locale} riskLevel={riskLevel} score={score} reasons={reasons} handleViewResults={handleViewResults} />
          <SocialProof />
        </div>
        <RiskOfferModal open={showOfferModal} onOpenChange={handleOfferModalClose} city={data.city} loading={checkoutLoading} onCheckout={handleCheckout} minutes={10} priceWas={120} priceNow={49} />
      </>
    );
  }

  // Question steps
  return (
    <FunnelQuestionsLayout
      step={step} data={data} locale={locale} canProceed={!!canProceed}
      handleNext={handleNext} updateData={updateData} toggleHouseholdTag={toggleHouseholdTag}
      progressPercent={progressPercent} currentQuestionNumber={currentQuestionNumber}
    />
  );
}
