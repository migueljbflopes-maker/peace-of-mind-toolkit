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
import { Check, ChevronRight, Shield, Star, MapPin, Home, Users, Package } from 'lucide-react';
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
  // Step 1: Location
  country: string;
  city: string;
  postalCode: string;
  // Step 2: Home
  homeType: 'apartment' | 'house' | '';
  floorLevel: string;
  // Step 3: Household
  householdTags: string[];
  // Step 4: Preparedness
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

// Scoring logic
function calculateScore(data: FunnelData): { exposure: number; preparednessGap: number; total: number } {
  let exposure = 0;
  let preparednessGap = 0;

  // Exposure (0-60 points)
  // Apartment vs house
  if (data.homeType === 'apartment') {
    exposure += 15; // More dependent on building infrastructure
    // Higher floors = more exposure
    const floor = parseInt(data.floorLevel) || 0;
    if (floor >= 5) exposure += 10;
    else if (floor >= 3) exposure += 5;
  } else if (data.homeType === 'house') {
    exposure += 8; // More autonomy
  }

  // Household complexity
  const tags = data.householdTags;
  if (tags.includes('kids')) exposure += 10;
  if (tags.includes('elderly')) exposure += 12;
  if (tags.includes('medical')) exposure += 15;
  if (tags.includes('pets')) exposure += 5;
  if (tags.includes('alone')) exposure += 8;

  // Cap exposure at 60
  exposure = Math.min(60, exposure);

  // Preparedness gap (0-40 points) - higher = less prepared
  if (data.hasKit === 'no') {
    preparednessGap += 15;
  } else if (data.hasKit === 'partly') {
    preparednessGap += 8;
  }

  if (!data.hasWater3Days) preparednessGap += 10;
  if (!data.hasPowerBackup) preparednessGap += 8;
  if (!data.hasEmergencyContacts) preparednessGap += 7;

  // Cap preparedness gap at 40
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

  // Location-based
  if (data.homeType === 'apartment' && parseInt(data.floorLevel) >= 5) {
    reasons.push('High-rise living may complicate evacuation');
  }

  // Household-based
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

  // Preparedness-based
  if (data.hasKit === 'no') {
    reasons.push('No emergency kit increases vulnerability');
  }
  if (!data.hasWater3Days) {
    reasons.push('Water supply for 3+ days is essential');
  }
  if (!data.hasEmergencyContacts) {
    reasons.push('Emergency contacts should be readily available');
  }

  // Take top 3
  return reasons.slice(0, 3);
}

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

  const totalSteps = 5;
  const progressPercent = (step / totalSteps) * 100;

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
      case 4:
        return !!data.hasKit;
      case 5:
        return true;
      default:
        return false;
    }
  }, [step, data]);

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleViewResults = () => {
    // Pass data to /tools/risk via navigate state
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Progress header */}
      <div className="w-full max-w-md mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>{step}/{totalSteps}</span>
          <span className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            {locale === 'pt' ? 'Avaliação de Risco' : 'Risk Assessment'}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <Card className="w-full max-w-md p-6 shadow-lg">
          {/* Step 1: Location */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <MapPin className="h-10 w-10 mx-auto text-primary" />
                <h2 className="text-xl font-semibold">
                  {locale === 'pt' ? 'Onde vives?' : 'Where do you live?'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {locale === 'pt' 
                    ? 'Usamos isto para contexto local de risco.' 
                    : 'We use this for local risk context.'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{locale === 'pt' ? 'País' : 'Country'}</Label>
                  <Select value={data.country} onValueChange={v => updateData('country', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={locale === 'pt' ? 'Selecionar país' : 'Select country'} />
                    </SelectTrigger>
                    <SelectContent>
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

          {/* Step 4: Preparedness */}
          {step === 4 && (
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

          {/* Step 5: Results Gate */}
          {step === 5 && (
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
                  {locale === 'pt' ? `Score: ${score.total}/100` : `Score: ${score.total}/100`}
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
          )}
        </Card>
      </div>

      {/* Social proof strip */}
      <div className="w-full max-w-md mx-auto px-4 pb-8">
        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
          {/* Avatar stack */}
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-500"
              >
                {['J', 'M', 'A', 'S'][i - 1]}
              </div>
            ))}
          </div>
          
          {/* Stars */}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          
          {/* Count */}
          <span>4,000+ {locale === 'pt' ? 'utilizadores' : 'users'}</span>
        </div>
      </div>
    </div>
  );
}
