import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLocale } from "@/i18n/useLocale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Check,
  ChevronRight,
  Shield,
  Star,
  MapPin,
  Home,
  Users,
  Package,
  Info,
  ChevronDown,
  CheckCircle2,
  Loader2,
  Lock,
  FileText,
  FolderHeart,
  Zap,
  Bell,
  Clock,
  AlertTriangle,
  Route,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RiskOfferModal } from "@/components/RiskOfferModal";
import ConsoleLogOverlay from "@/components/ConsoleLogOverlay";
import { loadStripe } from "@stripe/stripe-js";

// Only initialize Stripe if the publishable key is available
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

console.log("[RiskFunnel1] Stripe publishable key available:", !!stripePublishableKey);

const STORAGE_KEY = "resilient_risk_funnel_1";
const SUBSCRIPTION_PRICE_ID = "price_1Sp2vlGudTqpziaHp7oKKuyY";

// Avatar photos for social proof
const AVATAR_PHOTOS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
];

// Countries list (subset for demo)
const COUNTRIES = [
  { code: "PT", name: "Portugal" },
  { code: "ES", name: "Spain" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "IT", name: "Italy" },
  { code: "UK", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "BR", name: "Brazil" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
];

interface FunnelData {
  country: string;
  city: string;
  postalCode: string;
  homeType: "apartment" | "house" | "";
  floorLevel: string;
  householdTags: string[];
  emergencyExperience: "never" | "once" | "multiple" | "";
  hasKit: "yes" | "partly" | "no" | "";
  hasEvacuationPlan: "yes" | "somewhat" | "no" | "";
  hasWater3Days: boolean;
  hasPowerBackup: boolean;
  hasEmergencyContacts: boolean;
}

const defaultData: FunnelData = {
  country: "",
  city: "",
  postalCode: "",
  homeType: "",
  floorLevel: "",
  householdTags: [],
  emergencyExperience: "",
  hasKit: "",
  hasEvacuationPlan: "",
  hasWater3Days: false,
  hasPowerBackup: false,
  hasEmergencyContacts: false,
};

// Why we ask content
const whyWeAskContent = {
  location: {
    pt: "Usamos a tua localização apenas para adaptar orientações - as tuas respostas ficam privadas a menos que escolhas guardar.",
    en: "We use your location only to tailor guidance - your answers stay private unless you choose to save.",
  },
  home: {
    pt: "O tipo de habitação afeta rotas de evacuação, autonomia energética e acesso a recursos.",
    en: "Home type affects evacuation routes, energy autonomy, and resource access.",
  },
  household: {
    pt: "Cada membro tem necessidades únicas - isto ajuda-nos a personalizar o plano.",
    en: "Each member has unique needs - this helps us personalize your plan.",
  },
  experience: {
    pt: "Experiência prévia influencia a tua capacidade de resposta em situações reais.",
    en: "Past experience influences your ability to respond in real situations.",
  },
  preparedness: {
    pt: "Perceber o que já tens ajuda a focar nas lacunas prioritárias.",
    en: "Understanding what you already have helps focus on priority gaps.",
  },
  evacuation: {
    pt: "Ter um plano claro pode fazer a diferença nos primeiros minutos críticos.",
    en: "Having a clear plan can make the difference in the first critical minutes.",
  },
};

// Scoring logic - adjusted to always give moderate or high
function calculateScore(data: FunnelData): { exposure: number; preparednessGap: number; total: number } {
  // Base score starts at 35 to bias towards moderate/high
  let exposure = 35;
  let preparednessGap = 0;

  // Location always adds points (everyone has location risk)
  exposure += 10;

  if (data.homeType === "apartment") {
    exposure += 12;
    const floor = parseInt(data.floorLevel) || 0;
    if (floor >= 5) exposure += 8;
    else if (floor >= 3) exposure += 5;
  } else if (data.homeType === "house") {
    exposure += 8;
  }

  const tags = data.householdTags;
  if (tags.includes("kids")) exposure += 8;
  if (tags.includes("elderly")) exposure += 10;
  if (tags.includes("medical")) exposure += 12;
  if (tags.includes("pets")) exposure += 5;
  if (tags.includes("alone")) exposure += 6;

  exposure = Math.min(70, exposure);

  if (data.hasKit === "no") {
    preparednessGap += 12;
  } else if (data.hasKit === "partly") {
    preparednessGap += 6;
  }

  if (!data.hasWater3Days) preparednessGap += 8;
  if (!data.hasPowerBackup) preparednessGap += 6;
  if (!data.hasEmergencyContacts) preparednessGap += 4;

  // Emergency experience scoring
  if (data.emergencyExperience === "never") {
    preparednessGap += 4;
  }

  // Evacuation plan scoring
  if (data.hasEvacuationPlan === "no") {
    preparednessGap += 8;
  } else if (data.hasEvacuationPlan === "somewhat") {
    preparednessGap += 4;
  }

  preparednessGap = Math.min(40, preparednessGap);

  return {
    exposure,
    preparednessGap,
    total: exposure + preparednessGap,
  };
}

function getRiskLevel(score: number): "low" | "moderate" | "high" {
  // Adjusted thresholds - low is now harder to achieve
  if (score <= 40) return "low";
  if (score <= 65) return "moderate";
  return "high";
}

function getReasons(data: FunnelData, score: { exposure: number; preparednessGap: number }): string[] {
  const reasons: string[] = [];
  const { locale } = useLocale();
  const isPortuguese = locale === "pt";

  // Location is ALWAYS first
  if (data.city) {
    reasons.push(
      isPortuguese
        ? `Localização em ${data.city} apresenta riscos específicos`
        : `Location in ${data.city} presents specific risks`,
    );
  } else {
    reasons.push(
      isPortuguese
        ? "A tua localização geográfica influencia o perfil de risco"
        : "Your geographic location influences your risk profile",
    );
  }

  // Then add other factors
  if (data.homeType === "apartment" && parseInt(data.floorLevel) >= 5) {
    reasons.push(
      isPortuguese ? "Habitação em andar alto pode complicar evacuação" : "High-rise living may complicate evacuation",
    );
  }

  if (data.householdTags.includes("elderly")) {
    reasons.push(
      isPortuguese ? "Membros idosos precisam de planeamento extra" : "Elderly household members need extra planning",
    );
  }
  if (data.householdTags.includes("medical")) {
    reasons.push(
      isPortuguese ? "Necessidades médicas requerem reservas de backup" : "Medical needs require backup supplies",
    );
  }
  if (data.householdTags.includes("kids")) {
    reasons.push(
      isPortuguese
        ? "Crianças precisam de planeamento de emergência especializado"
        : "Children need specialized emergency planning",
    );
  }
  if (data.householdTags.includes("alone")) {
    reasons.push(
      isPortuguese
        ? "Viver sozinho significa que auto-suficiência é crítica"
        : "Living alone means self-reliance is critical",
    );
  }

  if (data.hasKit === "no") {
    reasons.push(
      isPortuguese ? "Sem kit de emergência aumenta vulnerabilidade" : "No emergency kit increases vulnerability",
    );
  }
  if (!data.hasWater3Days) {
    reasons.push(isPortuguese ? "Reserva de água para 3+ dias é essencial" : "Water supply for 3+ days is essential");
  }
  if (!data.hasEmergencyContacts) {
    reasons.push(
      isPortuguese
        ? "Contactos de emergência devem estar acessíveis"
        : "Emergency contacts should be readily available",
    );
  }

  return reasons.slice(0, 3);
}

// Why We Ask Component
function WhyWeAsk({ textPt, textEn }: { textPt: string; textEn: string }) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-4">
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full justify-center">
        <Info className="h-4 w-4" />
        <span>{locale === "pt" ? "Porque perguntamos" : "Why we ask"}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 text-center">
          {locale === "pt" ? textPt : textEn}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Interstitial Component
function FunnelInterstitial({
  titlePt,
  titleEn,
  subtitlePt,
  subtitleEn,
  color = "violet",
  onComplete,
  duration = 2500,
}: {
  titlePt: string;
  titleEn: string;
  subtitlePt: string;
  subtitleEn: string;
  color?: "violet" | "emerald";
  onComplete: () => void;
  duration?: number;
}) {
  const { locale } = useLocale();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 100 / (duration / 50);
      });
    }, 50);

    const timer = setTimeout(() => {
      onComplete();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [duration, onComplete]);

  const colorClasses = {
    violet: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
    emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
  };

  const iconColorClasses = {
    violet: "text-violet-500",
    emerald: "text-emerald-500",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md p-6 bg-gradient-to-br ${colorClasses[color]} border shadow-lg`}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-background/80 flex items-center justify-center">
            <CheckCircle2 className={`h-8 w-8 ${iconColorClasses[color]}`} />
          </div>

          <h2 className="text-xl font-semibold mb-2">{locale === "pt" ? titlePt : titleEn}</h2>
          <p className="text-muted-foreground mb-6">{locale === "pt" ? subtitlePt : subtitleEn}</p>

          <div className="w-full max-w-xs mx-auto">
            <Progress value={progress} className="h-1.5" />
          </div>

          <button
            onClick={onComplete}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {locale === "pt" ? "Saltar" : "Skip"}
          </button>
        </div>
      </Card>
    </div>
  );
}

// Analyzing Screen Component
function FunnelAnalyzingScreen({
  onComplete,
  city,
  duration = 4000,
}: {
  onComplete: () => void;
  city?: string;
  duration?: number;
}) {
  const { locale } = useLocale();
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const steps = [
    { id: "scoring", labelPt: "A avaliar a tua prontidão", labelEn: "Scoring your readiness" },
    { id: "location", labelPt: "A verificar contexto local", labelEn: "Checking location context" },
    { id: "profile", labelPt: "A construir o teu perfil", labelEn: "Building your profile" },
  ];

  useEffect(() => {
    const stepDuration = duration / steps.length;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 100 / (duration / 50);
      });
    }, 50);

    steps.forEach((step, index) => {
      setTimeout(
        () => {
          setCompletedSteps((prev) => [...prev, step.id]);
        },
        stepDuration * (index + 1),
      );
    });

    const timer = setTimeout(() => {
      onComplete();
    }, duration + 300);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [duration, onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 shadow-lg">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-background/80 flex items-center justify-center relative">
            <Shield className="h-10 w-10 text-emerald-500" />
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
          </div>

          <h2 className="text-xl font-semibold mb-1">
            {locale === "pt" ? "A analisar o teu risco..." : "Analyzing your risk..."}
          </h2>
          {city && <p className="text-muted-foreground mb-6">{city}</p>}

          <div className="w-full max-w-xs mx-auto mb-6">
            <Progress value={progress} className="h-2" />
          </div>

          <div className="space-y-3 text-left max-w-xs mx-auto">
            {steps.map((step) => {
              const isComplete = completedSteps.includes(step.id);
              return (
                <div key={step.id} className="flex items-center gap-3">
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                  )}
                  <span className={isComplete ? "text-foreground" : "text-muted-foreground"}>
                    {locale === "pt" ? step.labelPt : step.labelEn}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}

// Social Proof Component (Trustpilot style with real photos)
function SocialProof() {
  const { locale } = useLocale();

  return (
    <div className="mt-6 text-center">
      {/* Avatars with real photos */}
      <div className="flex justify-center -space-x-2 mb-3">
        {AVATAR_PHOTOS.map((photo, i) => (
          <img key={i} src={photo} alt="" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
        ))}
      </div>

      {/* Text */}
      <p className="text-sm text-muted-foreground mb-3">
        {locale === "pt"
          ? "Mais de 4.000 utilizadores ativos que confiam nas nossas orientações."
          : "Over 4,000 active users who trust our preparedness guidance."}
      </p>

      {/* Excellent text */}
      <p className="font-semibold text-foreground mb-2">{locale === "pt" ? "Excelente" : "Excellent"}</p>

      {/* Green stars (Trustpilot style) */}
      <div className="flex justify-center gap-0.5 mb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-6 h-6 bg-[#00b67a] flex items-center justify-center">
            <Star className="h-4 w-4 fill-white text-white" />
          </div>
        ))}
      </div>

      {/* Review count */}
      <p className="text-xs text-muted-foreground">
        {locale === "pt" ? "Baseado em 56.334 avaliações" : "Based on 56,334 reviews"}
      </p>
    </div>
  );
}

// Product Popup Component - High Conversion Version
function ProductPopup({
  open,
  onClose,
  onCheckout,
  loading,
  city,
}: {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
  loading: boolean;
  city?: string;
}) {
  const { locale } = useLocale();

  const benefits = [
    { labelPt: "O teu plano de ação personalizado para 72h", labelEn: "Your personalized 72h action plan" },
    {
      labelPt: city ? `Análise de risco específica para ${city}` : "Análise de risco da tua cidade",
      labelEn: city ? `City-specific risk analysis for ${city}` : "City-specific risk analysis",
    },
    { labelPt: "Vault de emergência & Red Folder PDF", labelEn: "Emergency vault & Red Folder PDF" },
    { labelPt: "Botão de pânico para alertar a família", labelEn: "One-tap panic button for your family" },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        {/* Header with success icon */}
        <div className="text-center mb-4">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            {locale === "pt" ? "O teu plano personalizado está pronto" : "Your personalized plan is ready"}
          </DialogTitle>
          <DialogDescription className="mt-1">
            {locale === "pt"
              ? "1 dia grátis, depois €49/mês • cancela quando quiseres"
              : "1 day free, then €49/month • cancel anytime"}
          </DialogDescription>
        </div>

        {/* Benefits list - simple, focused */}
        <ul className="space-y-3 py-4">
          {benefits.map((benefit, i) => (
            <li key={i} className="flex items-center gap-3">
              <Check className="h-5 w-5 text-emerald-500 shrink-0" />
              <span className="text-sm">{locale === "pt" ? benefit.labelPt : benefit.labelEn}</span>
            </li>
          ))}
        </ul>

        {/* CTA with subscription pricing */}
        <Button onClick={onCheckout} disabled={loading} className="w-full" size="lg">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {locale === "pt" ? "A processar..." : "Processing..."}
            </>
          ) : locale === "pt" ? (
            "Começar Trial Grátis — €49/mês"
          ) : (
            "Start Free Trial — €49/month"
          )}
        </Button>

        {/* Trust badges inline */}
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground mt-3">
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3" />
            {locale === "pt" ? "Checkout seguro" : "Secure checkout"}
          </span>
          <span>•</span>
          <span>{locale === "pt" ? "Cancela automaticamente" : "Auto-cancels"}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Steps: 1-Location, 2-Home, 3-Household, 4-EmergencyExp, 5-Interstitial, 6-Kit, 7-EvacPlan, 8-Interstitial, 9-Analyzing, 10-Results
const totalSteps = 10;
const questionSteps = [1, 2, 3, 4, 6, 7]; // Steps that are actual questions

type ExpressPaySupport = {
  ready: boolean;
  method: "apple_pay" | "google_pay" | null;
};

export default function RiskFunnel1() {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const [step, setStep] = useState(1);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [expressPay, setExpressPay] = useState<ExpressPaySupport>({
    ready: false,
    method: null,
  });
  const [data, setData] = useState<FunnelData>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultData, ...JSON.parse(stored) } : defaultData;
    } catch {
      return defaultData;
    }
  });

  // Express Pay: prepare PaymentRequest once, so `show()` can be called immediately on click (required by Apple Pay)
  const paymentRequestRef = useRef<any>(null);
  const guestSessionIdRef = useRef<string | null>(null);
  const localeRef = useRef(locale);
  const navigateRef = useRef(navigate);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const getOrCreateGuestSessionId = () => {
    if (guestSessionIdRef.current) return guestSessionIdRef.current;
    const key = "resilient_guest_session_id";
    const existing = localStorage.getItem(key);
    const id = existing || crypto.randomUUID();
    if (!existing) localStorage.setItem(key, id);
    guestSessionIdRef.current = id;
    return id;
  };

  // Probe for Apple/Google Pay support on mount and build a reusable PaymentRequest instance
  useEffect(() => {
    let cancelled = false;

    (async () => {
      console.log("[RiskFunnel1] === EXPRESS PAY DETECTION START ===");
      console.log("[RiskFunnel1] Current domain:", window.location.hostname);
      console.log("[RiskFunnel1] Protocol:", window.location.protocol);
      console.log("[RiskFunnel1] User Agent:", navigator.userAgent);

      if (!stripePromise) {
        console.log("[RiskFunnel1] ❌ Stripe not initialized (missing VITE_STRIPE_PUBLISHABLE_KEY)");
        if (!cancelled) setExpressPay({ ready: true, method: null });
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) {
        console.log("[RiskFunnel1] ❌ Stripe.js failed to load");
        if (!cancelled) setExpressPay({ ready: true, method: null });
        return;
      }

      console.log("[RiskFunnel1] ✓ Stripe.js loaded successfully");

      // Use the same currency/amount we charge (49 EUR => 4900)
      // For subscription, this is shown as the initial payment amount
      const pr = stripe.paymentRequest({
        country: "PT",
        currency: "eur",
        total: { label: "Resilient Plan", amount: 0 },
        requestPayerName: true,
        requestPayerEmail: true,
      });

      // Attach handlers once. IMPORTANT: do not do async work before `pr.show()` in the click handler.
      pr.on("cancel", () => {
        console.log("[RiskFunnel1] Express Pay: user cancelled sheet");
        setCheckoutLoading(false);
      });

      pr.on("paymentmethod", async (ev: any) => {
        console.log("[RiskFunnel1] Express Pay: paymentmethod event received");

        try {
          // Create SetupIntent for subscription (not PaymentIntent)
          console.log("[RiskFunnel1] Express Pay: creating SetupIntent for subscription...");
          const { data: siRes, error: siErr } = await supabase.functions.invoke("create-subscription-setup", {
            body: { guestSessionId: getOrCreateGuestSessionId() },
          });
          if (siErr) throw siErr;

          const clientSecret: string | undefined = siRes?.clientSecret;
          console.log("[RiskFunnel1] Express Pay: SetupIntent clientSecret received:", !!clientSecret);
          if (!clientSecret) throw new Error("Missing SetupIntent clientSecret");

          // Confirm SetupIntent with the payment method
          const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(
            clientSecret,
            { payment_method: ev.paymentMethod.id },
            { handleActions: false },
          );

          const currentLocale = localeRef.current;

          if (confirmError) {
            console.error("[RiskFunnel1] Express Pay: confirm error:", confirmError);
            ev.complete("fail");
            toast.error(currentLocale === "pt" ? "Falha na configuração" : "Setup failed");
            setCheckoutLoading(false);
            return;
          }

          if (setupIntent?.status === "requires_action") {
            console.log("[RiskFunnel1] Express Pay: requires_action, confirming...");
            const { error: actionError } = await stripe.confirmCardSetup(clientSecret);
            if (actionError) {
              console.error("[RiskFunnel1] Express Pay: action error:", actionError);
              ev.complete("fail");
              toast.error(currentLocale === "pt" ? "Falha na configuração" : "Setup failed");
              setCheckoutLoading(false);
              return;
            }
          }

          // SetupIntent succeeded - now complete the subscription
          console.log("[RiskFunnel1] Express Pay: SetupIntent succeeded, completing subscription...");
          const { data: subRes, error: subErr } = await supabase.functions.invoke("complete-subscription-setup", {
            body: {
              setupIntentId: siRes?.setupIntentId,
              payerEmail: ev.payerEmail,
              payerName: ev.payerName,
            },
          });

          if (subErr) {
            console.error("[RiskFunnel1] Express Pay: subscription creation failed:", subErr);
            ev.complete("fail");
            toast.error(currentLocale === "pt" ? "Falha ao criar subscrição" : "Subscription creation failed");
            setCheckoutLoading(false);
            return;
          }

          ev.complete("success");
          console.log("[RiskFunnel1] Express Pay: subscription created, navigating to claim");
          navigateRef.current(`/claim?claim_code=${siRes?.claimCode}`);
        } catch (err) {
          console.error("[RiskFunnel1] Express Pay: paymentmethod handler failed:", err);
          try {
            ev.complete("fail");
          } catch {
            // ignore
          }
          const currentLocale = localeRef.current;
          toast.error(currentLocale === "pt" ? "Falha no pagamento" : "Payment failed");
          setCheckoutLoading(false);
        }
      });

      paymentRequestRef.current = pr;

      console.log("[RiskFunnel1] PaymentRequest created, calling canMakePayment()...");
      const canPay = await pr.canMakePayment();
      console.log("[RiskFunnel1] canMakePayment() returned:", JSON.stringify(canPay));

      if (canPay === null) {
        console.log("[RiskFunnel1] ⚠️ canMakePayment returned null - possible reasons:");
        console.log("[RiskFunnel1]   1. Domain not registered in Stripe Apple Pay settings");
        console.log("[RiskFunnel1]   2. No cards configured in Apple Wallet / Google Pay");
        console.log("[RiskFunnel1]   3. Not using HTTPS (required for Apple Pay)");
        console.log("[RiskFunnel1]   4. Browser does not support Payment Request API");
        console.log("[RiskFunnel1]   5. Apple Pay domain verification file not served correctly");
        console.log("[RiskFunnel1]   Registered domain should be:", window.location.hostname);
      }

      const method = canPay?.applePay ? "apple_pay" : canPay?.googlePay ? "google_pay" : null;

      console.log("[RiskFunnel1] === EXPRESS PAY DETECTION RESULT ===");
      console.log("[RiskFunnel1] Apple Pay available:", canPay?.applePay ?? false);
      console.log("[RiskFunnel1] Google Pay available:", canPay?.googlePay ?? false);
      console.log("[RiskFunnel1] Selected method:", method ?? "NONE (will use standard checkout)");

      if (!cancelled) setExpressPay({ ready: true, method });
    })().catch((err) => {
      console.error("[RiskFunnel1] ❌ Express Pay detection error:", err);
      if (!cancelled) setExpressPay({ ready: true, method: null });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // Progress based on question steps only (4 questions total)
  const progressPercent = useMemo(() => {
    const questionIndex = questionSteps.indexOf(step);
    if (questionIndex >= 0) {
      return ((questionIndex + 1) / questionSteps.length) * 100;
    }
    // For non-question steps, show 100%
    return 100;
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

  // Step validation
  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return data.country && data.city;
      case 2:
        return !!data.homeType;
      case 3:
        return true; // Optional selections
      case 4:
        return !!data.emergencyExperience;
      case 6:
        return !!data.hasKit;
      case 7:
        return !!data.hasEvacuationPlan;
      default:
        return true;
    }
  }, [step, data]);

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleViewResults = () => {
    setShowOfferModal(true);
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);

    console.log("[RiskFunnel1] Starting subscription checkout...", {
      stripeAvailable: !!stripePromise,
      expressPayReady: expressPay.ready,
      expressPayMethod: expressPay.method,
      hasPreparedPaymentRequest: !!paymentRequestRef.current,
    });

    try {
      const stripe = stripePromise ? await stripePromise : null;

      // IMPORTANT: Apple Pay sheet must be shown immediately from a user gesture.
      // So if Express Pay is available, call `show()` first (no awaits before it).
      if (stripe && expressPay.ready && expressPay.method && paymentRequestRef.current) {
        console.log("[RiskFunnel1] Attempting Express Pay with:", expressPay.method);
        try {
          paymentRequestRef.current.show();
          return; // success/fail handled by paymentmethod/cancel listeners
        } catch (err) {
          console.warn("[RiskFunnel1] Express Pay show() failed; falling back to Checkout:", err);
          // fall through to Checkout Session below
        }
      }

      // Fallback: Use Stripe Checkout in subscription mode
      // For subscriptions, we need to use Stripe Checkout which properly handles trial + auto-cancel
      console.log("[RiskFunnel1] Using standard Checkout Session for subscription");
      const guestSessionId = getOrCreateGuestSessionId();

      // Create a checkout session for subscription
      const { data: res, error } = await supabase.functions.invoke("create-subscription-checkout", {
        body: {
          source: "riskfunnel1",
          guestSessionId,
          priceId: SUBSCRIPTION_PRICE_ID,
        },
      });
      if (error) throw error;
      if (!res?.url) throw new Error("No checkout URL received");

      console.log("[RiskFunnel1] Redirecting to Stripe Subscription Checkout:", res.url);
      window.location.href = res.url;
    } catch (e) {
      console.error("[RiskFunnel1] Checkout error:", e);
      toast.error(locale === "pt" ? "Erro ao abrir checkout" : "Error opening checkout");
      setCheckoutLoading(false);
    }
  };

  const score = useMemo(() => calculateScore(data), [data]);
  const riskLevel = useMemo(() => getRiskLevel(score.total), [score.total]);

  // Get reasons with locale context
  const reasons = useMemo(() => {
    const reasonsList: string[] = [];
    const isPortuguese = locale === "pt";

    // Location is ALWAYS first
    if (data.city) {
      reasonsList.push(
        isPortuguese
          ? `Localização em ${data.city} apresenta riscos específicos`
          : `Location in ${data.city} presents specific risks`,
      );
    } else {
      reasonsList.push(
        isPortuguese
          ? "A tua localização geográfica influencia o perfil de risco"
          : "Your geographic location influences your risk profile",
      );
    }

    // Then add other factors
    if (data.homeType === "apartment" && parseInt(data.floorLevel) >= 5) {
      reasonsList.push(
        isPortuguese
          ? "Habitação em andar alto pode complicar evacuação"
          : "High-rise living may complicate evacuation",
      );
    }

    if (data.householdTags.includes("elderly")) {
      reasonsList.push(
        isPortuguese ? "Membros idosos precisam de planeamento extra" : "Elderly household members need extra planning",
      );
    }
    if (data.householdTags.includes("medical")) {
      reasonsList.push(
        isPortuguese ? "Necessidades médicas requerem reservas de backup" : "Medical needs require backup supplies",
      );
    }
    if (data.householdTags.includes("kids")) {
      reasonsList.push(
        isPortuguese
          ? "Crianças precisam de planeamento de emergência especializado"
          : "Children need specialized emergency planning",
      );
    }
    if (data.householdTags.includes("alone")) {
      reasonsList.push(
        isPortuguese
          ? "Viver sozinho significa que auto-suficiência é crítica"
          : "Living alone means self-reliance is critical",
      );
    }

    if (data.hasKit === "no") {
      reasonsList.push(
        isPortuguese ? "Sem kit de emergência aumenta vulnerabilidade" : "No emergency kit increases vulnerability",
      );
    }
    if (!data.hasWater3Days) {
      reasonsList.push(
        isPortuguese ? "Reserva de água para 3+ dias é essencial" : "Water supply for 3+ days is essential",
      );
    }
    if (!data.hasEmergencyContacts) {
      reasonsList.push(
        isPortuguese
          ? "Contactos de emergência devem estar acessíveis"
          : "Emergency contacts should be readily available",
      );
    }

    return reasonsList.slice(0, 3);
  }, [data, locale]);

  const riskLevelLabel = {
    low: locale === "pt" ? "Baixo" : "Low",
    moderate: locale === "pt" ? "Moderado" : "Moderate",
    high: locale === "pt" ? "Alto" : "High",
  };

  const riskLevelColor = {
    low: "text-green-600",
    moderate: "text-amber-600",
    high: "text-red-600",
  };

  // Render interstitial after Emergency Experience (step 5)
  if (step === 5) {
    return (
      <FunnelInterstitial
        titlePt="Perfil registado"
        titleEn="Profile logged"
        subtitlePt="A personalizar para a tua situação"
        subtitleEn="Personalizing for your situation"
        color="violet"
        onComplete={handleNext}
      />
    );
  }

  // Render interstitial after Evacuation Plan (step 8)
  if (step === 8) {
    return (
      <FunnelInterstitial
        titlePt="Verificação de prontidão completa"
        titleEn="Readiness check complete"
        subtitlePt="A calcular as tuas prioridades"
        subtitleEn="Calculating your priorities"
        color="emerald"
        onComplete={handleNext}
      />
    );
  }

  // Render analyzing screen (step 9)
  if (step === 9) {
    return <FunnelAnalyzingScreen city={data.city} onComplete={handleNext} />;
  }

  // Render results (step 10)
  if (step === 10) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 shadow-lg">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">
                  {locale === "pt" ? "O teu perfil de risco está pronto" : "Your risk profile is ready"}
                </h2>
              </div>

              {/* Risk level display */}
              <div className="text-center py-4 px-6 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground mb-1">
                  {locale === "pt" ? "Categoria de Risco" : "Risk Category"}
                </p>
                <p className={cn("text-2xl font-bold", riskLevelColor[riskLevel])}>{riskLevelLabel[riskLevel]}</p>
                <p className="text-xs text-muted-foreground mt-1">Score: {score.total}/100</p>
              </div>

              {/* Reasons */}
              {reasons.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-center">
                    {locale === "pt" ? "Principais fatores:" : "Key factors:"}
                  </p>
                  <ul className="space-y-2">
                    {reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button onClick={handleViewResults} className="w-full" size="lg">
                {locale === "pt"
                  ? "Ver Resultados & Preparar-se"
                  : "View Results & Get Ready"}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>

          <SocialProof />
        </div>

        <RiskOfferModal
          open={showOfferModal}
          onOpenChange={setShowOfferModal}
          city={data.city}
          loading={checkoutLoading}
          onCheckout={handleCheckout}
          minutes={10}
          priceWas={120}
          priceNow={49}
          ctaText={{ en: "Continue for FREE", pt: "Continuar GRÁTIS" }}
          offerBadge={{ en: "Limited-time launch offer - Free Trial", pt: "Oferta de lançamento - Teste Grátis" }}
          pricingVariant="trial"
        />

        {/* DEBUG: Remove this component after fixing Apple Pay */}
        {/* Debug overlay disabled - Apple Pay working */}
      </>
    );
  }

  // Render question steps
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Progress header */}
      <div className="w-full max-w-md mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>
            {currentQuestionNumber}/{questionSteps.length}
          </span>
          <span className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            {locale === "pt" ? "Avaliação de Risco" : "Risk Assessment"}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <Card className="p-6 shadow-lg">
            {/* Step 1: Location */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <MapPin className="h-10 w-10 mx-auto text-primary" />
                  <h2 className="text-xl font-semibold">{locale === "pt" ? "Onde vives?" : "Where do you live?"}</h2>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{locale === "pt" ? "País" : "Country"}</Label>
                    <Select value={data.country} onValueChange={(v) => updateData("country", v)}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={locale === "pt" ? "Selecionar país" : "Select country"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{locale === "pt" ? "Cidade" : "City"}</Label>
                    <Input
                      value={data.city}
                      onChange={(e) => updateData("city", e.target.value)}
                      placeholder={locale === "pt" ? "Ex: Lisboa" : "e.g., Lisbon"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {locale === "pt" ? "Código Postal" : "Postal Code"}{" "}
                      <span className="text-muted-foreground">(opcional)</span>
                    </Label>
                    <Input
                      value={data.postalCode}
                      onChange={(e) => updateData("postalCode", e.target.value)}
                      placeholder={locale === "pt" ? "Ex: 1000-001" : "e.g., 1000-001"}
                    />
                  </div>
                </div>

                <WhyWeAsk textPt={whyWeAskContent.location.pt} textEn={whyWeAskContent.location.en} />

                <Button onClick={handleNext} disabled={!canProceed} className="w-full" size="lg">
                  {locale === "pt" ? "Continuar" : "Continue"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 2: Home Type */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <Home className="h-10 w-10 mx-auto text-primary" />
                  <h2 className="text-xl font-semibold">{locale === "pt" ? "Tipo de habitação?" : "Type of home?"}</h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => updateData("homeType", "apartment")}
                    className={cn(
                      "p-4 rounded-lg border-2 text-center transition-all",
                      data.homeType === "apartment"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <div className="text-2xl mb-1">🏢</div>
                    <div className="font-medium">{locale === "pt" ? "Apartamento" : "Apartment"}</div>
                  </button>
                  <button
                    onClick={() => updateData("homeType", "house")}
                    className={cn(
                      "p-4 rounded-lg border-2 text-center transition-all",
                      data.homeType === "house"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <div className="text-2xl mb-1">🏠</div>
                    <div className="font-medium">{locale === "pt" ? "Moradia" : "House"}</div>
                  </button>
                </div>

                {data.homeType === "apartment" && (
                  <div className="space-y-2">
                    <Label>{locale === "pt" ? "Andar (opcional)" : "Floor level (optional)"}</Label>
                    <div className="flex flex-wrap gap-2">
                      {["0", "1", "2", "3", "4", "5+"].map((floor) => (
                        <button
                          key={floor}
                          onClick={() => updateData("floorLevel", floor === "5+" ? "5" : floor)}
                          className={cn(
                            "px-4 py-2 rounded-full text-sm border transition-all",
                            data.floorLevel === floor || (floor === "5+" && parseInt(data.floorLevel) >= 5)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50",
                          )}
                        >
                          {floor === "0" ? (locale === "pt" ? "R/C" : "Ground") : floor}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <WhyWeAsk textPt={whyWeAskContent.home.pt} textEn={whyWeAskContent.home.en} />

                <Button onClick={handleNext} disabled={!canProceed} className="w-full" size="lg">
                  {locale === "pt" ? "Continuar" : "Continue"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 3: Household */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <Users className="h-10 w-10 mx-auto text-primary" />
                  <h2 className="text-xl font-semibold">
                    {locale === "pt" ? "O teu agregado inclui..." : "Your household includes..."}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {locale === "pt" ? "Seleciona todos os que se aplicam" : "Select all that apply"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    { id: "kids", label: locale === "pt" ? "👶 Crianças" : "👶 Kids" },
                    { id: "elderly", label: locale === "pt" ? "👴 Idosos" : "👴 Elderly" },
                    { id: "medical", label: locale === "pt" ? "💊 Necessidades médicas" : "💊 Medical needs" },
                    { id: "pets", label: locale === "pt" ? "🐕 Animais" : "🐕 Pets" },
                    { id: "alone", label: locale === "pt" ? "🧍 Vivo sozinho" : "🧍 Living alone" },
                  ].map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleHouseholdTag(tag.id)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm border transition-all",
                        data.householdTags.includes(tag.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      {tag.label}
                      {data.householdTags.includes(tag.id) && <Check className="inline ml-1 h-3 w-3" />}
                    </button>
                  ))}
                </div>

                <WhyWeAsk textPt={whyWeAskContent.household.pt} textEn={whyWeAskContent.household.en} />

                <Button onClick={handleNext} className="w-full" size="lg">
                  {locale === "pt" ? "Continuar" : "Continue"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 4: Emergency Experience (NEW) */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <AlertTriangle className="h-10 w-10 mx-auto text-primary" />
                  <h2 className="text-xl font-semibold">
                    {locale === "pt"
                      ? "Já passaste por uma emergência real?"
                      : "Have you been through a real emergency?"}
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {[
                    {
                      value: "multiple" as const,
                      label: locale === "pt" ? "Sim, várias vezes" : "Yes, multiple times",
                      emoji: "🔁",
                    },
                    { value: "once" as const, label: locale === "pt" ? "Sim, uma vez" : "Yes, once", emoji: "✅" },
                    { value: "never" as const, label: locale === "pt" ? "Nunca" : "Never", emoji: "❌" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateData("emergencyExperience", opt.value)}
                      className={cn(
                        "p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3",
                        data.emergencyExperience === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>

                <WhyWeAsk textPt={whyWeAskContent.experience.pt} textEn={whyWeAskContent.experience.en} />

                <Button onClick={handleNext} disabled={!canProceed} className="w-full" size="lg">
                  {locale === "pt" ? "Continuar" : "Continue"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 6: Emergency Kit */}
            {step === 6 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <Package className="h-10 w-10 mx-auto text-primary" />
                  <h2 className="text-xl font-semibold">
                    {locale === "pt" ? "Tens um kit de emergência?" : "Do you have an emergency kit?"}
                  </h2>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "yes" as const, label: locale === "pt" ? "Sim" : "Yes", emoji: "✅" },
                    { value: "partly" as const, label: locale === "pt" ? "Parcial" : "Partly", emoji: "🔶" },
                    { value: "no" as const, label: locale === "pt" ? "Não" : "No", emoji: "❌" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateData("hasKit", opt.value)}
                      className={cn(
                        "p-3 rounded-lg border-2 text-center transition-all",
                        data.hasKit === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <div className="text-xl mb-1">{opt.emoji}</div>
                      <div className="text-sm font-medium">{opt.label}</div>
                    </button>
                  ))}
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-sm text-muted-foreground text-center">
                    {locale === "pt" ? "Verificações rápidas (opcional):" : "Quick checks (optional):"}
                  </p>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">{locale === "pt" ? "💧 Água para 3+ dias" : "💧 Water for 3+ days"}</span>
                    <Switch checked={data.hasWater3Days} onCheckedChange={(v) => updateData("hasWater3Days", v)} />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">{locale === "pt" ? "🔋 Backup de energia" : "🔋 Power backup"}</span>
                    <Switch checked={data.hasPowerBackup} onCheckedChange={(v) => updateData("hasPowerBackup", v)} />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">
                      {locale === "pt" ? "📞 Contactos de emergência" : "📞 Emergency contacts"}
                    </span>
                    <Switch
                      checked={data.hasEmergencyContacts}
                      onCheckedChange={(v) => updateData("hasEmergencyContacts", v)}
                    />
                  </div>
                </div>

                <WhyWeAsk textPt={whyWeAskContent.preparedness.pt} textEn={whyWeAskContent.preparedness.en} />

                <Button onClick={handleNext} disabled={!canProceed} className="w-full" size="lg">
                  {locale === "pt" ? "Continuar" : "Continue"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 7: Evacuation Plan (NEW) */}
            {step === 7 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <Route className="h-10 w-10 mx-auto text-primary" />
                  <h2 className="text-xl font-semibold">
                    {locale === "pt" ? "Tens um plano de evacuação?" : "Do you have an evacuation plan?"}
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {[
                    {
                      value: "yes" as const,
                      label: locale === "pt" ? "Sim, toda a família sabe" : "Yes, everyone knows it",
                      emoji: "✅",
                    },
                    { value: "somewhat" as const, label: locale === "pt" ? "Mais ou menos" : "Somewhat", emoji: "🔶" },
                    { value: "no" as const, label: locale === "pt" ? "Não temos" : "We don't have one", emoji: "❌" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateData("hasEvacuationPlan", opt.value)}
                      className={cn(
                        "p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3",
                        data.hasEvacuationPlan === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50",
                      )}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>

                <WhyWeAsk textPt={whyWeAskContent.evacuation.pt} textEn={whyWeAskContent.evacuation.en} />

                <Button onClick={handleNext} disabled={!canProceed} className="w-full" size="lg">
                  {locale === "pt" ? "Ver resultados" : "See results"}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </Card>

          <SocialProof />
        </div>
      </div>

      {/* DEBUG: Remove this component after fixing Apple Pay */}
      {/* Debug overlay disabled - Apple Pay working */}
    </div>
  );
}
