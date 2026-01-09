import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Shield, Clock, CheckCircle2, Info, Loader2 } from "lucide-react";
import { useLocale } from "@/i18n/useLocale";

type RiskOfferModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  city?: string;
  onCheckout: () => Promise<void> | void;
  loading?: boolean;
  // optional: control offer
  minutes?: number;          // default 10
  priceNow?: number;         // default 49
  priceWas?: number;         // default 120
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function FeatureCard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="bg-muted/50 rounded-xl p-3 text-center">
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export function RiskOfferModal({
  open,
  onOpenChange,
  city,
  onCheckout,
  loading = false,
  minutes = 10,
  priceNow = 49,
  priceWas = 120,
}: RiskOfferModalProps) {
  const { locale } = useLocale();
  const initialSeconds = useMemo(() => minutes * 60, [minutes]);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    if (!open) return;
    // reset timer each time modal opens
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

  const features = locale === 'pt' ? [
    { title: "Plano 72h", subtitle: "Passos personalizados" },
    { title: "Red Folder", subtitle: "PDF para offline" },
    { title: "Vault", subtitle: "Dados encriptados" },
    { title: "Botão Pânico", subtitle: "Alertar família" },
  ] : [
    { title: "72h Plan", subtitle: "Personalized steps" },
    { title: "Red Folder", subtitle: "Offline PDF" },
    { title: "Vault", subtitle: "Encrypted data" },
    { title: "Panic Button", subtitle: "Alert family" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Top bar with timer */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-white" />
            <span className="text-white text-sm font-medium">
              {locale === 'pt' ? 'Desconto expira em' : 'Discount expires in'}{" "}
              <span className="font-mono font-bold">
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

        {/* Content */}
        <div className="px-5 py-6">
          {/* Headline */}
          <div className="text-center mb-5">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
              <Shield className="h-7 w-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold">
              {locale === 'pt' 
                ? 'O teu plano personalizado está pronto' 
                : 'Your personalized plan is ready'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {locale === 'pt' 
                ? `Inclui um plano de ação focado para ${city || "a tua área"}.`
                : `Includes a focused action plan tailored for ${city || "your area"}.`}
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {features.map((f, i) => (
              <FeatureCard key={i} title={f.title} subtitle={f.subtitle} />
            ))}
          </div>

          {/* Pricing */}
          <div className="text-center mb-5">
            <p className="text-sm text-muted-foreground">
              {locale === 'pt' ? 'Pagamento único' : 'One-time'}{" "}
              <span className="line-through text-muted-foreground/60">€{priceWas}</span>{" "}
              <span className="text-2xl font-bold text-foreground">€{priceNow}</span>{" "}
              {locale === 'pt' ? 'para o teu plano. Sem subscrições.' : 'for your plan. No subscriptions.'}
            </p>
          </div>

          {/* CTA */}
          <Button
            onClick={onCheckout}
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
              locale === 'pt' ? 'Obter o meu plano agora' : 'Get my plan now'
            )}
          </Button>

          {/* Trust row */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-3">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>{locale === 'pt' ? 'Pagamento seguro' : 'Pay safe & secure'}</span>
            <span>•</span>
            <span>{locale === 'pt' ? 'Pagamento único' : 'One-time purchase'}</span>
          </div>

          {/* Tiny footer note */}
          <div className="flex items-start gap-2 mt-4 bg-muted/30 rounded-lg p-3">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              {locale === 'pt' 
                ? 'Orientação calma e prática. Funciona offline após compra.'
                : 'Calm, practical guidance. Works offline after purchase.'}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
