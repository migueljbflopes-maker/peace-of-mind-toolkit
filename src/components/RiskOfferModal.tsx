import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Shield,
  Clock,
  CheckCircle2,
  Info,
  Timer,
  Radar,
  Lock,
  Siren,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useLocale } from "@/i18n/useLocale";

type RiskOfferModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  city?: string;
  onCheckout: () => Promise<void> | void;
  loading?: boolean;
  minutes?: number; // default 10
  priceNow?: number; // default 49
  priceWas?: number; // default 120
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function RiskOfferModal({
  open,
  onOpenChange,
  city,
  onCheckout,
  loading = false,
  minutes = 5,
  priceNow = 49,
  priceWas = 120,
}: RiskOfferModalProps) {
  const { locale } = useLocale();
  const initialSeconds = useMemo(() => minutes * 60, [minutes]);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(initialSeconds);
  }, [open, initialSeconds]);

  useEffect(() => {
    if (!open) return;
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [open, secondsLeft]);

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;

  const headlineCity = city?.trim() ? city.trim() : (locale === 'pt' ? "a tua área" : "your area");

  const handleCheckoutClick = useCallback(() => {
    onCheckout?.();
  }, [onCheckout]);

  const features = locale === 'pt' ? [
    { title: "Plano 72h", subtitle: "Passos e checklists personalizados", icon: Timer },
    { title: "Segurança & Orientação", subtitle: "Consultar especialistas", icon: Radar },
    { title: "Vault", subtitle: "Cofre encriptado para documentos,\ncontactos e instruções", icon: Lock },
    { title: "Botão Pânico", subtitle: "Alertar pessoas-chave e partilhar\ninformação crítica", icon: Siren },
  ] : [
    { title: "72h Plan", subtitle: "Personalized steps and checklists", icon: Timer },
    { title: "Safety & Guidance", subtitle: "Consult experts for guidance", icon: Radar },
    { title: "Vault", subtitle: "Encrypted vault for documents,\ncontacts, and instructions", icon: Lock },
    { title: "Panic Button", subtitle: "Alert key people instantly and share\ncritical information", icon: Siren },
  ];

  const isUrgent = secondsLeft <= 60;
  const isCritical = secondsLeft <= 30;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Urgency top bar */}
        <div className={cn(
          "px-4 py-2.5 flex items-center justify-between transition-colors duration-300",
          isUrgent 
            ? "bg-gradient-to-r from-red-500 to-orange-500" 
            : "bg-gradient-to-r from-amber-500 to-orange-500",
          isCritical && "animate-[shake_0.5s_ease-in-out_infinite]"
        )}>
          <div className="flex items-center gap-2">
            <Clock className={cn(
              "h-4 w-4 text-white",
              isUrgent && "animate-pulse"
            )} />
            <span className={cn(
              "text-white text-sm font-medium",
              isUrgent && "animate-pulse"
            )}>
              {locale === 'pt' ? 'Desconto expira em' : 'Discount expires in'}{" "}
              <span className={cn(
                "font-mono font-bold",
                isUrgent && "text-yellow-200"
              )}>
                {pad2(mm)}:{pad2(ss)}
              </span>
            </span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-white/80 hover:text-white text-lg font-medium"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-6">
          {/* Headline */}
          <div className="text-center mb-5">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Shield className="h-10 w-10 text-white drop-shadow-sm" />
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 font-medium mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              {locale === 'pt' ? 'Oferta de lançamento' : 'Limited-time launch offer'}
              <span className="text-muted-foreground">•</span>
              <span>€{priceNow}</span>
            </div>

            <h2 className="text-xl font-semibold">
              {locale === 'pt' ? 'O teu plano personalizado está pronto' : 'Your personalized plan is ready'}
            </h2>

            <p className="text-sm text-muted-foreground mt-1">
              {locale === 'pt' 
                ? `Feito para ${headlineCity}. Acesso instantâneo após pagamento.`
                : `Built for ${headlineCity}. Instant access after payment.`}
            </p>
          </div>

          {/* Feature grid with icons */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {features.map((f, i) => (
              <FeatureCard key={i} title={f.title} subtitle={f.subtitle} icon={f.icon} />
            ))}
          </div>

          {/* Pricing (smaller) */}
          <div className="text-center mb-5">
            <p className="text-sm text-muted-foreground">
              {locale === 'pt' ? 'Pagamento único' : 'One-time'}{" "}
              <span className="line-through text-muted-foreground/60">€{priceWas}</span>{" "}
              <span className="text-2xl font-bold text-foreground">€{priceNow}</span>
              <span className="text-muted-foreground"> · {locale === 'pt' ? 'Sem subscrições' : 'No subscriptions'}</span>
            </p>
          </div>

          {/* CTA */}
          <Button
            onClick={handleCheckoutClick}
            disabled={loading || secondsLeft === 0}
            size="lg"
            className="w-full text-base"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {locale === 'pt' ? 'A preparar pagamento...' : 'Preparing secure payment…'}
              </>
            ) : (
              locale === 'pt' ? 'COMEÇAR AGORA' : 'START NOW'
            )}
          </Button>

          {/* Trust row */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-3 flex-wrap">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>{locale === 'pt' ? 'Pagamento seguro' : 'Pay safe & secure'}</span>
            <span>•</span>
            <span>{locale === 'pt' ? 'Acesso instantâneo' : 'Instant access'}</span>
            <span>•</span>
            <span>{locale === 'pt' ? 'Pagamento único' : 'One-time purchase'}</span>
          </div>

          {/* Calm note (still conversion-friendly) */}
          <div className="flex items-start gap-2 mt-4 bg-muted/30 rounded-lg p-3">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              {locale === 'pt' 
                ? 'Orientação prática para tranquilidade. Funciona offline após compra.'
                : 'Practical guidance designed for peace of mind. Works offline after purchase.'}
            </p>
          </div>

          {/* Tiny secure hint */}
          <div className="flex items-center justify-center gap-1 mt-3 text-[11px] text-muted-foreground/70">
            <Lock className="h-3 w-3" />
            <span>{locale === 'pt' ? 'Pagamento seguro Stripe' : 'Secure Stripe payment'}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FeatureCard({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-muted/50 rounded-xl p-3">
      <div className="flex items-start gap-2.5">
        <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground leading-tight mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
