import React, { useState, useEffect, useMemo } from "react";
import { useLocale } from "@/i18n/useLocale";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  AlertTriangle,
  Route,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────

export const AVATAR_PHOTOS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
];

export const COUNTRIES = [
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

export const whyWeAskContent = {
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

export const totalSteps = 10;
export const questionSteps = [1, 2, 3, 4, 6, 7];

// ── Types ──────────────────────────────────────────────────

export interface FunnelData {
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

export const defaultData: FunnelData = {
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

export type ExpressPaySupport = {
  ready: boolean;
  method: "apple_pay" | "google_pay" | null;
};

// ── Scoring ────────────────────────────────────────────────

export function calculateScore(data: FunnelData): { exposure: number; preparednessGap: number; total: number } {
  let exposure = 35;
  let preparednessGap = 0;

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

  if (data.hasKit === "no") preparednessGap += 12;
  else if (data.hasKit === "partly") preparednessGap += 6;

  if (!data.hasWater3Days) preparednessGap += 8;
  if (!data.hasPowerBackup) preparednessGap += 6;
  if (!data.hasEmergencyContacts) preparednessGap += 4;

  if (data.emergencyExperience === "never") preparednessGap += 4;

  if (data.hasEvacuationPlan === "no") preparednessGap += 8;
  else if (data.hasEvacuationPlan === "somewhat") preparednessGap += 4;

  preparednessGap = Math.min(40, preparednessGap);

  return { exposure, preparednessGap, total: exposure + preparednessGap };
}

export function getRiskLevel(score: number): "low" | "moderate" | "high" {
  if (score <= 40) return "low";
  if (score <= 65) return "moderate";
  return "high";
}

export function buildReasons(data: FunnelData, locale: string): string[] {
  const reasons: string[] = [];
  const pt = locale === "pt";

  if (data.city) {
    reasons.push(pt ? `Localização em ${data.city} apresenta riscos específicos` : `Location in ${data.city} presents specific risks`);
  } else {
    reasons.push(pt ? "A tua localização geográfica influencia o perfil de risco" : "Your geographic location influences your risk profile");
  }

  if (data.homeType === "apartment" && parseInt(data.floorLevel) >= 5) {
    reasons.push(pt ? "Habitação em andar alto pode complicar evacuação" : "High-rise living may complicate evacuation");
  }
  if (data.householdTags.includes("elderly")) reasons.push(pt ? "Membros idosos precisam de planeamento extra" : "Elderly household members need extra planning");
  if (data.householdTags.includes("medical")) reasons.push(pt ? "Necessidades médicas requerem reservas de backup" : "Medical needs require backup supplies");
  if (data.householdTags.includes("kids")) reasons.push(pt ? "Crianças precisam de planeamento de emergência especializado" : "Children need specialized emergency planning");
  if (data.householdTags.includes("alone")) reasons.push(pt ? "Viver sozinho significa que auto-suficiência é crítica" : "Living alone means self-reliance is critical");
  if (data.hasKit === "no") reasons.push(pt ? "Sem kit de emergência aumenta vulnerabilidade" : "No emergency kit increases vulnerability");
  if (!data.hasWater3Days) reasons.push(pt ? "Reserva de água para 3+ dias é essencial" : "Water supply for 3+ days is essential");
  if (!data.hasEmergencyContacts) reasons.push(pt ? "Contactos de emergência devem estar acessíveis" : "Emergency contacts should be readily available");

  return reasons.slice(0, 3);
}

// ── Shared Sub-Components ──────────────────────────────────

export function WhyWeAsk({ textPt, textEn }: { textPt: string; textEn: string }) {
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

export function FunnelInterstitial({
  titlePt, titleEn, subtitlePt, subtitleEn, color = "violet", onComplete, duration = 2500,
}: {
  titlePt: string; titleEn: string; subtitlePt: string; subtitleEn: string;
  color?: "violet" | "emerald"; onComplete: () => void; duration?: number;
}) {
  const { locale } = useLocale();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) { clearInterval(interval); return 100; }
        return prev + 100 / (duration / 50);
      });
    }, 50);
    const timer = setTimeout(onComplete, duration);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [duration, onComplete]);

  const colorClasses = {
    violet: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
    emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
  };
  const iconColorClasses = { violet: "text-violet-500", emerald: "text-emerald-500" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md p-6 bg-gradient-to-br ${colorClasses[color]} border shadow-lg`}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-background/80 flex items-center justify-center">
            <CheckCircle2 className={`h-8 w-8 ${iconColorClasses[color]}`} />
          </div>
          <h2 className="text-xl font-semibold mb-2">{locale === "pt" ? titlePt : titleEn}</h2>
          <p className="text-muted-foreground mb-6">{locale === "pt" ? subtitlePt : subtitleEn}</p>
          <div className="w-full max-w-xs mx-auto"><Progress value={progress} className="h-1.5" /></div>
          <button onClick={onComplete} className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
            {locale === "pt" ? "Saltar" : "Skip"}
          </button>
        </div>
      </Card>
    </div>
  );
}

export function FunnelAnalyzingScreen({ onComplete, city, duration = 4000 }: { onComplete: () => void; city?: string; duration?: number }) {
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
      setProgress((prev) => { if (prev >= 100) { clearInterval(interval); return 100; } return prev + 100 / (duration / 50); });
    }, 50);
    steps.forEach((step, index) => {
      setTimeout(() => setCompletedSteps((prev) => [...prev, step.id]), stepDuration * (index + 1));
    });
    const timer = setTimeout(onComplete, duration + 300);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [duration, onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 shadow-lg">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-background/80 flex items-center justify-center relative">
            <Shield className="h-10 w-10 text-emerald-500" />
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping" />
          </div>
          <h2 className="text-xl font-semibold mb-1">{locale === "pt" ? "A analisar o teu risco..." : "Analyzing your risk..."}</h2>
          {city && <p className="text-muted-foreground mb-6">{city}</p>}
          <div className="w-full max-w-xs mx-auto mb-6"><Progress value={progress} className="h-2" /></div>
          <div className="space-y-3 text-left max-w-xs mx-auto">
            {steps.map((step) => {
              const isComplete = completedSteps.includes(step.id);
              return (
                <div key={step.id} className="flex items-center gap-3">
                  {isComplete ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />}
                  <span className={isComplete ? "text-foreground" : "text-muted-foreground"}>{locale === "pt" ? step.labelPt : step.labelEn}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}

export function SocialProof() {
  const { locale } = useLocale();
  return (
    <div className="mt-6 text-center">
      <div className="flex justify-center -space-x-2 mb-3">
        {AVATAR_PHOTOS.map((photo, i) => (
          <img key={i} src={photo} alt="" className="w-8 h-8 rounded-full border-2 border-white object-cover" />
        ))}
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        {locale === "pt" ? "Mais de 4.000 utilizadores ativos que confiam nas nossas orientações." : "Over 4,000 active users who trust our preparedness guidance."}
      </p>
      <p className="font-semibold text-foreground mb-2">{locale === "pt" ? "Excelente" : "Excellent"}</p>
      <div className="flex justify-center gap-0.5 mb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-6 h-6 bg-[#00b67a] flex items-center justify-center">
            <Star className="h-4 w-4 fill-white text-white" />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{locale === "pt" ? "Baseado em 56.334 avaliações" : "Based on 56,334 reviews"}</p>
    </div>
  );
}

// ── Shared Question Steps Renderer ─────────────────────────

interface FunnelStepsProps {
  step: number;
  data: FunnelData;
  locale: string;
  canProceed: boolean;
  handleNext: () => void;
  updateData: <K extends keyof FunnelData>(key: K, value: FunnelData[K]) => void;
  toggleHouseholdTag: (tag: string) => void;
}

export function FunnelQuestionSteps({ step, data, locale, canProceed, handleNext, updateData, toggleHouseholdTag }: FunnelStepsProps) {
  return (
    <>
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
                  {COUNTRIES.map((c) => (<SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{locale === "pt" ? "Cidade" : "City"}</Label>
              <Input value={data.city} onChange={(e) => updateData("city", e.target.value)} placeholder={locale === "pt" ? "Ex: Lisboa" : "e.g., Lisbon"} />
            </div>
            <div className="space-y-2">
              <Label>{locale === "pt" ? "Código Postal" : "Postal Code"} <span className="text-muted-foreground">(opcional)</span></Label>
              <Input value={data.postalCode} onChange={(e) => updateData("postalCode", e.target.value)} placeholder={locale === "pt" ? "Ex: 1000-001" : "e.g., 1000-001"} />
            </div>
          </div>
          <WhyWeAsk textPt={whyWeAskContent.location.pt} textEn={whyWeAskContent.location.en} />
          <Button onClick={handleNext} disabled={!canProceed} className="w-full" size="lg">
            {locale === "pt" ? "Continuar" : "Continue"}<ChevronRight className="ml-2 h-4 w-4" />
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
            <button onClick={() => updateData("homeType", "apartment")} className={cn("p-4 rounded-lg border-2 text-center transition-all", data.homeType === "apartment" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
              <div className="text-2xl mb-1">🏢</div>
              <div className="font-medium">{locale === "pt" ? "Apartamento" : "Apartment"}</div>
            </button>
            <button onClick={() => updateData("homeType", "house")} className={cn("p-4 rounded-lg border-2 text-center transition-all", data.homeType === "house" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
              <div className="text-2xl mb-1">🏠</div>
              <div className="font-medium">{locale === "pt" ? "Moradia" : "House"}</div>
            </button>
          </div>
          {data.homeType === "apartment" && (
            <div className="space-y-2">
              <Label>{locale === "pt" ? "Andar (opcional)" : "Floor level (optional)"}</Label>
              <div className="flex flex-wrap gap-2">
                {["0", "1", "2", "3", "4", "5+"].map((floor) => (
                  <button key={floor} onClick={() => updateData("floorLevel", floor === "5+" ? "5" : floor)} className={cn("px-4 py-2 rounded-full text-sm border transition-all", data.floorLevel === floor || (floor === "5+" && parseInt(data.floorLevel) >= 5) ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50")}>
                    {floor === "0" ? (locale === "pt" ? "R/C" : "Ground") : floor}
                  </button>
                ))}
              </div>
            </div>
          )}
          <WhyWeAsk textPt={whyWeAskContent.home.pt} textEn={whyWeAskContent.home.en} />
          <Button onClick={handleNext} disabled={!canProceed} className="w-full" size="lg">
            {locale === "pt" ? "Continuar" : "Continue"}<ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 3: Household */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <Users className="h-10 w-10 mx-auto text-primary" />
            <h2 className="text-xl font-semibold">{locale === "pt" ? "O teu agregado inclui..." : "Your household includes..."}</h2>
            <p className="text-sm text-muted-foreground">{locale === "pt" ? "Seleciona todos os que se aplicam" : "Select all that apply"}</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {[
              { id: "kids", label: locale === "pt" ? "👶 Crianças" : "👶 Kids" },
              { id: "elderly", label: locale === "pt" ? "👴 Idosos" : "👴 Elderly" },
              { id: "medical", label: locale === "pt" ? "💊 Necessidades médicas" : "💊 Medical needs" },
              { id: "pets", label: locale === "pt" ? "🐕 Animais" : "🐕 Pets" },
              { id: "alone", label: locale === "pt" ? "🧍 Vivo sozinho" : "🧍 Living alone" },
            ].map((tag) => (
              <button key={tag.id} onClick={() => toggleHouseholdTag(tag.id)} className={cn("px-4 py-2 rounded-full text-sm border transition-all", data.householdTags.includes(tag.id) ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50")}>
                {tag.label}
                {data.householdTags.includes(tag.id) && <Check className="inline ml-1 h-3 w-3" />}
              </button>
            ))}
          </div>
          <WhyWeAsk textPt={whyWeAskContent.household.pt} textEn={whyWeAskContent.household.en} />
          <Button onClick={handleNext} className="w-full" size="lg">
            {locale === "pt" ? "Continuar" : "Continue"}<ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 4: Emergency Experience */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <AlertTriangle className="h-10 w-10 mx-auto text-primary" />
            <h2 className="text-xl font-semibold">{locale === "pt" ? "Já passaste por uma emergência real?" : "Have you been through a real emergency?"}</h2>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {[
              { value: "multiple" as const, label: locale === "pt" ? "Sim, várias vezes" : "Yes, multiple times", emoji: "🔁" },
              { value: "once" as const, label: locale === "pt" ? "Sim, uma vez" : "Yes, once", emoji: "✅" },
              { value: "never" as const, label: locale === "pt" ? "Nunca" : "Never", emoji: "❌" },
            ].map((opt) => (
              <button key={opt.value} onClick={() => updateData("emergencyExperience", opt.value)} className={cn("p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3", data.emergencyExperience === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                <span className="text-xl">{opt.emoji}</span>
                <span className="font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
          <WhyWeAsk textPt={whyWeAskContent.experience.pt} textEn={whyWeAskContent.experience.en} />
          <Button onClick={handleNext} disabled={!canProceed} className="w-full" size="lg">
            {locale === "pt" ? "Continuar" : "Continue"}<ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 6: Emergency Kit */}
      {step === 6 && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <Package className="h-10 w-10 mx-auto text-primary" />
            <h2 className="text-xl font-semibold">{locale === "pt" ? "Tens um kit de emergência?" : "Do you have an emergency kit?"}</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "yes" as const, label: locale === "pt" ? "Sim" : "Yes", emoji: "✅" },
              { value: "partly" as const, label: locale === "pt" ? "Parcial" : "Partly", emoji: "🔶" },
              { value: "no" as const, label: locale === "pt" ? "Não" : "No", emoji: "❌" },
            ].map((opt) => (
              <button key={opt.value} onClick={() => updateData("hasKit", opt.value)} className={cn("p-3 rounded-lg border-2 text-center transition-all", data.hasKit === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                <div className="text-xl mb-1">{opt.emoji}</div>
                <div className="text-sm font-medium">{opt.label}</div>
              </button>
            ))}
          </div>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground text-center">{locale === "pt" ? "Verificações rápidas (opcional):" : "Quick checks (optional):"}</p>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">{locale === "pt" ? "💧 Água para 3+ dias" : "💧 Water for 3+ days"}</span>
              <Switch checked={data.hasWater3Days} onCheckedChange={(v) => updateData("hasWater3Days", v)} />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">{locale === "pt" ? "🔋 Backup de energia" : "🔋 Power backup"}</span>
              <Switch checked={data.hasPowerBackup} onCheckedChange={(v) => updateData("hasPowerBackup", v)} />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">{locale === "pt" ? "📞 Contactos de emergência" : "📞 Emergency contacts"}</span>
              <Switch checked={data.hasEmergencyContacts} onCheckedChange={(v) => updateData("hasEmergencyContacts", v)} />
            </div>
          </div>
          <WhyWeAsk textPt={whyWeAskContent.preparedness.pt} textEn={whyWeAskContent.preparedness.en} />
          <Button onClick={handleNext} disabled={!canProceed} className="w-full" size="lg">
            {locale === "pt" ? "Continuar" : "Continue"}<ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 7: Evacuation Plan */}
      {step === 7 && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <Route className="h-10 w-10 mx-auto text-primary" />
            <h2 className="text-xl font-semibold">{locale === "pt" ? "Tens um plano de evacuação?" : "Do you have an evacuation plan?"}</h2>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {[
              { value: "yes" as const, label: locale === "pt" ? "Sim, toda a família sabe" : "Yes, everyone knows it", emoji: "✅" },
              { value: "somewhat" as const, label: locale === "pt" ? "Mais ou menos" : "Somewhat", emoji: "🔶" },
              { value: "no" as const, label: locale === "pt" ? "Não temos" : "We don't have one", emoji: "❌" },
            ].map((opt) => (
              <button key={opt.value} onClick={() => updateData("hasEvacuationPlan", opt.value)} className={cn("p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3", data.hasEvacuationPlan === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                <span className="text-xl">{opt.emoji}</span>
                <span className="font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
          <WhyWeAsk textPt={whyWeAskContent.evacuation.pt} textEn={whyWeAskContent.evacuation.en} />
          <Button onClick={handleNext} disabled={!canProceed} className="w-full" size="lg">
            {locale === "pt" ? "Ver resultados" : "See results"}<ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}

// ── Shared Results Step Renderer ───────────────────────────

interface ResultsStepProps {
  locale: string;
  riskLevel: "low" | "moderate" | "high";
  score: { exposure: number; preparednessGap: number; total: number };
  reasons: string[];
  handleViewResults: () => void;
}

export function FunnelResultsCard({ locale, riskLevel, score, reasons, handleViewResults }: ResultsStepProps) {
  const riskLevelLabel = {
    low: locale === "pt" ? "Baixo" : "Low",
    moderate: locale === "pt" ? "Moderado" : "Moderate",
    high: locale === "pt" ? "Alto" : "High",
  };
  const riskLevelColor = { low: "text-green-600", moderate: "text-amber-600", high: "text-red-600" };

  return (
    <Card className="w-full max-w-md p-6 shadow-lg">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">{locale === "pt" ? "O teu perfil de risco está pronto" : "Your risk profile is ready"}</h2>
        </div>
        <div className="text-center py-4 px-6 bg-muted/50 rounded-xl">
          <p className="text-sm text-muted-foreground mb-1">{locale === "pt" ? "Categoria de Risco" : "Risk Category"}</p>
          <p className={cn("text-2xl font-bold", riskLevelColor[riskLevel])}>{riskLevelLabel[riskLevel]}</p>
          <p className="text-xs text-muted-foreground mt-1">Score: {score.total}/100</p>
        </div>
        {reasons.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-center">{locale === "pt" ? "Principais fatores:" : "Key factors:"}</p>
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
          {locale === "pt" ? "Ver Resultados & Preparar-se" : "View Results & Get Ready"}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

// ── Shared Funnel Layout ───────────────────────────────────

interface FunnelLayoutProps {
  step: number;
  data: FunnelData;
  locale: string;
  canProceed: boolean;
  handleNext: () => void;
  updateData: <K extends keyof FunnelData>(key: K, value: FunnelData[K]) => void;
  toggleHouseholdTag: (tag: string) => void;
  progressPercent: number;
  currentQuestionNumber: number;
}

export function FunnelQuestionsLayout({
  step, data, locale, canProceed, handleNext, updateData, toggleHouseholdTag, progressPercent, currentQuestionNumber,
}: FunnelLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      <div className="w-full max-w-md mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>{currentQuestionNumber}/{questionSteps.length}</span>
          <span className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            {locale === "pt" ? "Avaliação de Risco" : "Risk Assessment"}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>
      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <Card className="p-6 shadow-lg">
            <FunnelQuestionSteps
              step={step} data={data} locale={locale} canProceed={canProceed}
              handleNext={handleNext} updateData={updateData} toggleHouseholdTag={toggleHouseholdTag}
            />
          </Card>
          <SocialProof />
        </div>
      </div>
    </div>
  );
}

// ── Debug logger (DEV-only) ────────────────────────────────

export function devLog(prefix: string, ...args: any[]) {
  if (import.meta.env.DEV) {
    console.log(`[${prefix}]`, ...args);
  }
}

export function devWarn(prefix: string, ...args: any[]) {
  if (import.meta.env.DEV) {
    console.warn(`[${prefix}]`, ...args);
  }
}

export function devError(prefix: string, ...args: any[]) {
  if (import.meta.env.DEV) {
    console.error(`[${prefix}]`, ...args);
  }
}
