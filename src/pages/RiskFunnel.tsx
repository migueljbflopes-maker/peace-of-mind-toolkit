import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '@/i18n/useLocale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, ChevronRight, Shield, Star, MapPin, Home, Users, Package, Info, ChevronDown, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'resilient_risk_funnel';

// Countries list (subset for demo)
const COUNTRIES = [
  { code: 'PT', name: 'Portugal' },
  { code: 'ES', name: 'Spain' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'IT', name: 'Italy' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'BR', name: 'Brazil' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
];

interface FunnelData {
  country: string;
  city: string;
  postalCode: string;
  homeType: 'apartment' | 'house' | '';
  floorLevel: string;
  householdTags: string[];
  hasKit: 'yes' | 'partly' | 'no' | '';
  hasWater3Days: boolean;
  hasPowerBackup: boolean;
  hasEmergencyContacts: boolean;
}

const defaultData: FunnelData = {
  country: '',
  city: '',
  postalCode: '',
  homeType: '',
  floorLevel: '',
  householdTags: [],
  hasKit: '',
  hasWater3Days: false,
  hasPowerBackup: false,
  hasEmergencyContacts: false,
};

// Why we ask content
const whyWeAskContent = {
  location: {
    pt: "Usamos a tua localização apenas para adaptar orientações - as tuas respostas ficam privadas a menos que escolhas guardar.",
    en: "We use your location only to tailor guidance - your answers stay private unless you choose to save."
  },
  home: {
    pt: "O tipo de habitação afeta rotas de evacuação, autonomia energética e acesso a recursos.",
    en: "Home type affects evacuation routes, energy autonomy, and resource access."
  },
  household: {
    pt: "Cada membro tem necessidades únicas - isto ajuda-nos a personalizar o plano.",
    en: "Each member has unique needs - this helps us personalize your plan."
  },
  preparedness: {
    pt: "Perceber o que já tens ajuda a focar nas lacunas prioritárias.",
    en: "Understanding what you already have helps focus on priority gaps."
  }
};

// Scoring logic
function calculateScore(data: FunnelData): { exposure: number; preparednessGap: number; total: number } {
  let exposure = 0;
  let preparednessGap = 0;

  if (data.homeType === 'apartment') {
    exposure += 15;
    const floor = parseInt(data.floorLevel) || 0;
    if (floor >= 5) exposure += 10;
    else if (floor >= 3) exposure += 5;
  } else if (data.homeType === 'house') {
    exposure += 8;
  }

  const tags = data.householdTags;
  if (tags.includes('kids')) exposure += 10;
  if (tags.includes('elderly')) exposure += 12;
  if (tags.includes('medical')) exposure += 15;
  if (tags.includes('pets')) exposure += 5;
  if (tags.includes('alone')) exposure += 8;

  exposure = Math.min(60, exposure);

  if (data.hasKit === 'no') {
    preparednessGap += 15;
  } else if (data.hasKit === 'partly') {
    preparednessGap += 8;
  }

  if (!data.hasWater3Days) preparednessGap += 10;
  if (!data.hasPowerBackup) preparednessGap += 8;
  if (!data.hasEmergencyContacts) preparednessGap += 7;

  preparednessGap = Math.min(40, preparednessGap);

  return {
    exposure,
    preparednessGap,
    total: exposure + preparednessGap,
  };
}

function getRiskLevel(score: number): 'low' | 'moderate' | 'high' {
  if (score <= 33) return 'low';
  if (score <= 66) return 'moderate';
  return 'high';
}

function getReasons(data: FunnelData, score: { exposure: number; preparednessGap: number }): string[] {
  const reasons: string[] = [];

  if (data.homeType === 'apartment' && parseInt(data.floorLevel) >= 5) {
    reasons.push('High-rise living may complicate evacuation');
  }

  if (data.householdTags.includes('elderly')) {
    reasons.push('Elderly household members need extra planning');
  }
  if (data.householdTags.includes('medical')) {
    reasons.push('Medical needs require backup supplies');
  }
  if (data.householdTags.includes('kids')) {
    reasons.push('Children need specialized emergency planning');
  }
  if (data.householdTags.includes('alone')) {
    reasons.push('Living alone means self-reliance is critical');
  }

  if (data.hasKit === 'no') {
    reasons.push('No emergency kit increases vulnerability');
  }
  if (!data.hasWater3Days) {
    reasons.push('Water supply for 3+ days is essential');
  }
  if (!data.hasEmergencyContacts) {
    reasons.push('Emergency contacts should be readily available');
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
        <span>{locale === 'pt' ? 'Porque perguntamos' : 'Why we ask'}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 text-center">
          {locale === 'pt' ? textPt : textEn}
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
  color = 'violet',
  onComplete,
  duration = 2500
}: { 
  titlePt: string; 
  titleEn: string; 
  subtitlePt: string; 
  subtitleEn: string;
  color?: 'violet' | 'emerald';
  onComplete: () => void;
  duration?: number;
}) {
  const { locale } = useLocale();
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + (100 / (duration / 50));
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
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/30',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30'
  };
  
  const iconColorClasses = {
    violet: 'text-violet-500',
    emerald: 'text-emerald-500'
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className={`w-full max-w-md p-6 bg-gradient-to-br ${colorClasses[color]} border shadow-lg`}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-background/80 flex items-center justify-center">
            <CheckCircle2 className={`h-8 w-8 ${iconColorClasses[color]}`} />
          </div>
          
          <h2 className="text-xl font-semibold mb-2">
            {locale === 'pt' ? titlePt : titleEn}
          </h2>
          <p className="text-muted-foreground mb-6">
            {locale === 'pt' ? subtitlePt : subtitleEn}
          </p>
          
          <div className="w-full max-w-xs mx-auto">
            <Progress value={progress} className="h-1.5" />
          </div>
          
          <button 
            onClick={onComplete}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {locale === 'pt' ? 'Saltar' : 'Skip'}
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
  duration = 4000 
}: { 
  onComplete: () => void; 
  city?: string;
  duration?: number;
}) {
  const { locale } = useLocale();
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  
  const steps = [
    { id: 'scoring', labelPt: 'A avaliar a tua prontidão', labelEn: 'Scoring your readiness' },
    { id: 'location', labelPt: 'A verificar contexto local', labelEn: 'Checking location context' },
    { id: 'profile', labelPt: 'A construir o teu perfil', labelEn: 'Building your profile' }
  ];
  
  useEffect(() => {
    const stepDuration = duration / steps.length;
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + (100 / (duration / 50));
      });
    }, 50);
    
    steps.forEach((step, index) => {
      setTimeout(() => {
        setCompletedSteps(prev => [...prev, step.id]);
      }, stepDuration * (index + 1));
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
            {locale === 'pt' ? 'A analisar o teu risco...' : 'Analyzing your risk...'}
          </h2>
          {city && (
            <p className="text-muted-foreground mb-6">{city}</p>
          )}
          
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
                  <span className={isComplete ? 'text-foreground' : 'text-muted-foreground'}>
                    {locale === 'pt' ? step.labelPt : step.labelEn}
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

// Social Proof Component (Trustpilot style)
function SocialProof() {
  const { locale } = useLocale();
  
  return (
    <div className="mt-6 text-center">
      {/* Avatars */}
      <div className="flex justify-center -space-x-2 mb-3">
        {['J', 'M', 'A', 'S'].map((initial, i) => (
          <div 
            key={i} 
            className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-500"
          >
            {initial}
          </div>
        ))}
      </div>
      
      {/* Text */}
      <p className="text-sm text-muted-foreground mb-3">
        {locale === 'pt' 
          ? 'Mais de 4.000 utilizadores ativos que confiam nas nossas orientações.'
          : 'Over 4,000 active users who trust our preparedness guidance.'}
      </p>
      
      {/* Excellent text */}
      <p className="font-semibold text-foreground mb-2">
        {locale === 'pt' ? 'Excelente' : 'Excellent'}
      </p>
      
      {/* Green stars (Trustpilot style) */}
      <div className="flex justify-center gap-0.5 mb-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div 
            key={i} 
            className="w-6 h-6 bg-[#00b67a] flex items-center justify-center"
          >
            <Star className="h-4 w-4 fill-white text-white" />
          </div>
        ))}
      </div>
      
      {/* Review count */}
      <p className="text-xs text-muted-foreground">
        {locale === 'pt' ? 'Baseado em 56.334 avaliações' : 'Based on 56,334 reviews'}
      </p>
    </div>
  );
}

// Steps: 1-Location, 2-Home, 3-Household, 4-Interstitial, 5-Preparedness, 6-Interstitial, 7-Analyzing, 8-Results
const totalSteps = 8;
const questionSteps = [1, 2, 3, 5]; // Steps that are actual questions

export default function RiskFunnel() {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FunnelData>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultData, ...JSON.parse(stored) } : defaultData;
    } catch {
      return defaultData;
    }
  });

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
    setData(prev => ({ ...prev, [key]: value }));
  };

  const toggleHouseholdTag = (tag: string) => {
    setData(prev => ({
      ...prev,
      householdTags: prev.householdTags.includes(tag)
        ? prev.householdTags.filter(t => t !== tag)
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
      case 5:
        return !!data.hasKit;
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
    navigate('/tools/risk', {
      state: {
        funnelData: data,
        fromFunnel: true,
      },
    });
  };

  const score = useMemo(() => calculateScore(data), [data]);
  const riskLevel = useMemo(() => getRiskLevel(score.total), [score.total]);
  const reasons = useMemo(() => getReasons(data, score), [data, score]);

  const riskLevelLabel = {
    low: locale === 'pt' ? 'Baixo' : 'Low',
    moderate: locale === 'pt' ? 'Moderado' : 'Moderate',
    high: locale === 'pt' ? 'Alto' : 'High',
  };

  const riskLevelColor = {
    low: 'text-green-600',
    moderate: 'text-amber-600',
    high: 'text-red-600',
  };

  // Render interstitial after Household (step 4)
  if (step === 4) {
    return (
      <FunnelInterstitial
        titlePt="Agregado registado"
        titleEn="Household logged"
        subtitlePt="A personalizar para a tua família"
        subtitleEn="Personalizing for your family"
        color="violet"
        onComplete={handleNext}
      />
    );
  }

  // Render interstitial after Preparedness (step 6)
  if (step === 6) {
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

  // Render analyzing screen (step 7)
  if (step === 7) {
    return (
      <FunnelAnalyzingScreen
        city={data.city}
        onComplete={handleNext}
      />
    );
  }

  // Render results (step 8)
  if (step === 8) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 shadow-lg">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">
                {locale === 'pt' 
                  ? 'O teu perfil de risco está pronto' 
                  : 'Your risk profile is ready'}
              </h2>
            </div>

            {/* Risk level display */}
            <div className="text-center py-4 px-6 bg-muted/50 rounded-xl">
              <p className="text-sm text-muted-foreground mb-1">
                {locale === 'pt' ? 'Categoria de Risco' : 'Risk Category'}
              </p>
              <p className={cn('text-2xl font-bold', riskLevelColor[riskLevel])}>
                {riskLevelLabel[riskLevel]}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Score: {score.total}/100
              </p>
            </div>

            {/* Reasons */}
            {reasons.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-center">
                  {locale === 'pt' ? 'Principais fatores:' : 'Key factors:'}
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

            <Button 
              onClick={handleViewResults}
              className="w-full"
              size="lg"
            >
              {locale === 'pt' ? 'Ver resultados personalizados' : 'View personalized results'}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
        
        <SocialProof />
      </div>
    );
  }

  // Render question steps
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Progress header */}
      <div className="w-full max-w-md mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>{currentQuestionNumber}/{questionSteps.length}</span>
          <span className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            {locale === 'pt' ? 'Avaliação de Risco' : 'Risk Assessment'}
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
                  <h2 className="text-xl font-semibold">
                    {locale === 'pt' ? 'Onde vives?' : 'Where do you live?'}
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{locale === 'pt' ? 'País' : 'Country'}</Label>
                    <Select value={data.country} onValueChange={v => updateData('country', v)}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={locale === 'pt' ? 'Selecionar país' : 'Select country'} />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        {COUNTRIES.map(c => (
                          <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>{locale === 'pt' ? 'Cidade' : 'City'}</Label>
                    <Input
                      value={data.city}
                      onChange={e => updateData('city', e.target.value)}
                      placeholder={locale === 'pt' ? 'Ex: Lisboa' : 'e.g., Lisbon'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{locale === 'pt' ? 'Código Postal' : 'Postal Code'} <span className="text-muted-foreground">(opcional)</span></Label>
                    <Input
                      value={data.postalCode}
                      onChange={e => updateData('postalCode', e.target.value)}
                      placeholder={locale === 'pt' ? 'Ex: 1000-001' : 'e.g., 1000-001'}
                    />
                  </div>
                </div>

                <WhyWeAsk 
                  textPt={whyWeAskContent.location.pt}
                  textEn={whyWeAskContent.location.en}
                />

                <Button 
                  onClick={handleNext} 
                  disabled={!canProceed}
                  className="w-full"
                  size="lg"
                >
                  {locale === 'pt' ? 'Continuar' : 'Continue'}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 2: Home Type */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <Home className="h-10 w-10 mx-auto text-primary" />
                  <h2 className="text-xl font-semibold">
                    {locale === 'pt' ? 'Tipo de habitação?' : 'Type of home?'}
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => updateData('homeType', 'apartment')}
                    className={cn(
                      'p-4 rounded-lg border-2 text-center transition-all',
                      data.homeType === 'apartment'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="text-2xl mb-1">🏢</div>
                    <div className="font-medium">{locale === 'pt' ? 'Apartamento' : 'Apartment'}</div>
                  </button>
                  <button
                    onClick={() => updateData('homeType', 'house')}
                    className={cn(
                      'p-4 rounded-lg border-2 text-center transition-all',
                      data.homeType === 'house'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="text-2xl mb-1">🏠</div>
                    <div className="font-medium">{locale === 'pt' ? 'Moradia' : 'House'}</div>
                  </button>
                </div>

                {data.homeType === 'apartment' && (
                  <div className="space-y-2">
                    <Label>{locale === 'pt' ? 'Andar (opcional)' : 'Floor level (optional)'}</Label>
                    <div className="flex flex-wrap gap-2">
                      {['0', '1', '2', '3', '4', '5+'].map(floor => (
                        <button
                          key={floor}
                          onClick={() => updateData('floorLevel', floor === '5+' ? '5' : floor)}
                          className={cn(
                            'px-4 py-2 rounded-full text-sm border transition-all',
                            (data.floorLevel === floor || (floor === '5+' && parseInt(data.floorLevel) >= 5))
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          {floor === '0' ? (locale === 'pt' ? 'R/C' : 'Ground') : floor}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <WhyWeAsk 
                  textPt={whyWeAskContent.home.pt}
                  textEn={whyWeAskContent.home.en}
                />

                <Button 
                  onClick={handleNext} 
                  disabled={!canProceed}
                  className="w-full"
                  size="lg"
                >
                  {locale === 'pt' ? 'Continuar' : 'Continue'}
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
                    {locale === 'pt' ? 'O teu agregado inclui...' : 'Your household includes...'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'pt' ? 'Seleciona todos os que se aplicam' : 'Select all that apply'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    { id: 'kids', label: locale === 'pt' ? '👶 Crianças' : '👶 Kids' },
                    { id: 'elderly', label: locale === 'pt' ? '👴 Idosos' : '👴 Elderly' },
                    { id: 'medical', label: locale === 'pt' ? '💊 Necessidades médicas' : '💊 Medical needs' },
                    { id: 'pets', label: locale === 'pt' ? '🐕 Animais' : '🐕 Pets' },
                    { id: 'alone', label: locale === 'pt' ? '🧍 Vivo sozinho' : '🧍 Living alone' },
                  ].map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => toggleHouseholdTag(tag.id)}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm border transition-all',
                        data.householdTags.includes(tag.id)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      {tag.label}
                      {data.householdTags.includes(tag.id) && <Check className="inline ml-1 h-3 w-3" />}
                    </button>
                  ))}
                </div>

                <WhyWeAsk 
                  textPt={whyWeAskContent.household.pt}
                  textEn={whyWeAskContent.household.en}
                />

                <Button 
                  onClick={handleNext} 
                  className="w-full"
                  size="lg"
                >
                  {locale === 'pt' ? 'Continuar' : 'Continue'}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 5: Preparedness */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <Package className="h-10 w-10 mx-auto text-primary" />
                  <h2 className="text-xl font-semibold">
                    {locale === 'pt' ? 'Tens um kit de emergência?' : 'Do you have an emergency kit?'}
                  </h2>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'yes' as const, label: locale === 'pt' ? 'Sim' : 'Yes', emoji: '✅' },
                    { value: 'partly' as const, label: locale === 'pt' ? 'Parcial' : 'Partly', emoji: '🔶' },
                    { value: 'no' as const, label: locale === 'pt' ? 'Não' : 'No', emoji: '❌' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updateData('hasKit', opt.value)}
                      className={cn(
                        'p-3 rounded-lg border-2 text-center transition-all',
                        data.hasKit === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className="text-xl mb-1">{opt.emoji}</div>
                      <div className="text-sm font-medium">{opt.label}</div>
                    </button>
                  ))}
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-sm text-muted-foreground text-center">
                    {locale === 'pt' ? 'Verificações rápidas (opcional):' : 'Quick checks (optional):'}
                  </p>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">{locale === 'pt' ? '💧 Água para 3+ dias' : '💧 Water for 3+ days'}</span>
                    <Switch
                      checked={data.hasWater3Days}
                      onCheckedChange={v => updateData('hasWater3Days', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">{locale === 'pt' ? '🔋 Backup de energia' : '🔋 Power backup'}</span>
                    <Switch
                      checked={data.hasPowerBackup}
                      onCheckedChange={v => updateData('hasPowerBackup', v)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">{locale === 'pt' ? '📞 Contactos de emergência' : '📞 Emergency contacts'}</span>
                    <Switch
                      checked={data.hasEmergencyContacts}
                      onCheckedChange={v => updateData('hasEmergencyContacts', v)}
                    />
                  </div>
                </div>

                <WhyWeAsk 
                  textPt={whyWeAskContent.preparedness.pt}
                  textEn={whyWeAskContent.preparedness.en}
                />

                <Button 
                  onClick={handleNext} 
                  disabled={!canProceed}
                  className="w-full"
                  size="lg"
                >
                  {locale === 'pt' ? 'Ver resultados' : 'See results'}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </Card>
          
          <SocialProof />
        </div>
      </div>
    </div>
  );
}
