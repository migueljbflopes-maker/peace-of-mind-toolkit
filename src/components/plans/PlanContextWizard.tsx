/**
 * Plan Context Wizard
 * Collects location, dwelling, household, and home reality before AI draft generation
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Sparkles, MapPin, Home, Users, Zap } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { PlanType } from '@/lib/plansStore';
import { AIPlanInput } from '@/lib/aiPlanDraft';

interface PlanContextWizardProps {
  planType: PlanType;
  onComplete: (context: AIPlanInput) => void;
  onCancel: () => void;
  isGenerating?: boolean;
}

type WizardStep = 'location' | 'dwelling' | 'household' | 'homeReality';

const STEPS: WizardStep[] = ['location', 'dwelling', 'household', 'homeReality'];

export function PlanContextWizard({ 
  planType, 
  onComplete, 
  onCancel,
  isGenerating 
}: PlanContextWizardProps) {
  const { t, locale } = useLocale();
  const [step, setStep] = useState<WizardStep>('location');
  
  // Location
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  
  // Dwelling
  const [dwellingType, setDwellingType] = useState<'apartment' | 'house'>('apartment');
  const [floorLevel, setFloorLevel] = useState<'ground' | '1-3' | '4+'>('ground');
  const [hasElevator, setHasElevator] = useState(false);
  const [hasGarden, setHasGarden] = useState(false);
  
  // Household
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);
  const [pets, setPets] = useState(0);
  const [petTypes, setPetTypes] = useState<string[]>([]);
  const [mobilityConstraints, setMobilityConstraints] = useState<string[]>(['none']);
  
  // Home reality
  const [internetReliance, setInternetReliance] = useState<'low' | 'medium' | 'high'>('medium');
  const [powerOutagePreparedness, setPowerOutagePreparedness] = useState<'low' | 'medium' | 'high'>('low');
  const [waterStorage, setWaterStorage] = useState<'none' | 'some' | 'good'>('none');
  const [cookingOptions, setCookingOptions] = useState<string[]>(['electric_stove']);
  const [heatingType, setHeatingType] = useState<'district' | 'gas' | 'electric' | 'none'>('electric');
  const [vehicleAccess, setVehicleAccess] = useState<'none' | 'car' | 'bike_only' | 'multiple'>('car');
  const [cashOnHandLevel, setCashOnHandLevel] = useState<'none' | 'some' | 'good'>('some');

  const currentStepIndex = STEPS.indexOf(step);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const canProceed = () => {
    switch (step) {
      case 'location':
        return country.trim().length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(STEPS[prevIndex]);
    } else {
      onCancel();
    }
  };

  const handleGenerate = () => {
    const context: AIPlanInput = {
      locale: locale as 'en' | 'pt',
      planType,
      location: {
        country,
        city: city || undefined,
        postalCode: postalCode || undefined,
        dwellingType,
        floorLevel: dwellingType === 'apartment' ? floorLevel : 'ground',
        hasElevator: dwellingType === 'apartment' ? hasElevator : false,
        hasGarden,
      },
      household: {
        adults,
        kids,
        pets,
        petTypes: pets > 0 ? petTypes : undefined,
        mobilityConstraints,
        primaryLanguage: locale,
      },
      homeReality: {
        internetReliance,
        powerOutagePreparedness,
        waterStorage,
        cookingOptions,
        heatingType,
        vehicleAccess,
        cashOnHandLevel,
      },
      preferences: {
        calmTone: true,
        avoidFearLanguage: true,
        mobilityPlanPreference: planType === 'A' ? 'stay_first' : 'leave_first',
      },
    };
    onComplete(context);
  };

  const toggleArrayItem = (arr: string[], item: string, setter: (arr: string[]) => void) => {
    if (arr.includes(item)) {
      setter(arr.filter(i => i !== item));
    } else {
      setter([...arr, item]);
    }
  };

  const stepIcons = {
    location: MapPin,
    dwelling: Home,
    household: Users,
    homeReality: Zap,
  };

  const stepTitles = {
    location: locale === 'pt' ? 'Localização' : 'Location',
    dwelling: locale === 'pt' ? 'Habitação' : 'Dwelling',
    household: locale === 'pt' ? 'Agregado Familiar' : 'Household',
    homeReality: locale === 'pt' ? 'Realidade em Casa' : 'Home Reality',
  };

  const StepIcon = stepIcons[step];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <StepIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">
              {planType === 'A' 
                ? (locale === 'pt' ? 'Plano A — Contexto' : 'Plan A — Context')
                : (locale === 'pt' ? 'Plano B — Contexto' : 'Plan B — Context')
              }
            </CardTitle>
            <CardDescription>{stepTitles[step]}</CardDescription>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step: Location */}
        {step === 'location' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {locale === 'pt' 
                ? 'A localização ajuda a personalizar o plano para a sua região.'
                : 'Location helps tailor the plan to your region.'}
            </p>
            <div className="grid gap-4">
              <div>
                <Label>{locale === 'pt' ? 'País' : 'Country'} *</Label>
                <Input 
                  placeholder={locale === 'pt' ? 'ex: Portugal' : 'e.g., Netherlands'}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
              <div>
                <Label>{locale === 'pt' ? 'Cidade' : 'City'}</Label>
                <Input 
                  placeholder={locale === 'pt' ? 'ex: Lisboa' : 'e.g., Amsterdam'}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <Label>{locale === 'pt' ? 'Código Postal' : 'Postal Code'}</Label>
                <Input 
                  placeholder={locale === 'pt' ? 'ex: 1000-001' : 'e.g., 1012'}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step: Dwelling */}
        {step === 'dwelling' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {locale === 'pt' 
                ? 'Detalhes sobre a sua habitação.'
                : 'Details about your home.'}
            </p>
            <div className="grid gap-4">
              <div>
                <Label>{locale === 'pt' ? 'Tipo de Habitação' : 'Dwelling Type'}</Label>
                <Select value={dwellingType} onValueChange={(v) => setDwellingType(v as 'apartment' | 'house')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">{locale === 'pt' ? 'Apartamento' : 'Apartment'}</SelectItem>
                    <SelectItem value="house">{locale === 'pt' ? 'Casa' : 'House'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {dwellingType === 'apartment' && (
                <>
                  <div>
                    <Label>{locale === 'pt' ? 'Piso' : 'Floor Level'}</Label>
                    <Select value={floorLevel} onValueChange={(v) => setFloorLevel(v as 'ground' | '1-3' | '4+')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ground">{locale === 'pt' ? 'Rés-do-chão' : 'Ground floor'}</SelectItem>
                        <SelectItem value="1-3">{locale === 'pt' ? '1º - 3º andar' : '1st - 3rd floor'}</SelectItem>
                        <SelectItem value="4+">{locale === 'pt' ? '4º andar ou superior' : '4th floor or higher'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      id="elevator" 
                      checked={hasElevator} 
                      onCheckedChange={(c) => setHasElevator(!!c)} 
                    />
                    <Label htmlFor="elevator">{locale === 'pt' ? 'Tem elevador' : 'Has elevator'}</Label>
                  </div>
                </>
              )}
              
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="garden" 
                  checked={hasGarden} 
                  onCheckedChange={(c) => setHasGarden(!!c)} 
                />
                <Label htmlFor="garden">{locale === 'pt' ? 'Tem jardim/quintal' : 'Has garden/yard'}</Label>
              </div>
            </div>
          </div>
        )}

        {/* Step: Household */}
        {step === 'household' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {locale === 'pt' 
                ? 'Composição do agregado familiar.'
                : 'Household composition.'}
            </p>
            <div className="grid gap-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>{locale === 'pt' ? 'Adultos' : 'Adults'}</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={10} 
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label>{locale === 'pt' ? 'Crianças' : 'Kids'}</Label>
                  <Input 
                    type="number" 
                    min={0} 
                    max={10} 
                    value={kids}
                    onChange={(e) => setKids(Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>{locale === 'pt' ? 'Animais' : 'Pets'}</Label>
                  <Input 
                    type="number" 
                    min={0} 
                    max={10} 
                    value={pets}
                    onChange={(e) => setPets(Number(e.target.value) || 0)}
                  />
                </div>
              </div>
              
              {pets > 0 && (
                <div>
                  <Label>{locale === 'pt' ? 'Tipos de Animais' : 'Pet Types'}</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['dog', 'cat', 'bird', 'other'].map((type) => (
                      <Button
                        key={type}
                        variant={petTypes.includes(type) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleArrayItem(petTypes, type, setPetTypes)}
                      >
                        {locale === 'pt' 
                          ? { dog: 'Cão', cat: 'Gato', bird: 'Ave', other: 'Outro' }[type]
                          : { dog: 'Dog', cat: 'Cat', bird: 'Bird', other: 'Other' }[type]
                        }
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>{locale === 'pt' ? 'Restrições de Mobilidade' : 'Mobility Constraints'}</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['none', 'limited_mobility', 'no_car', 'wheelchair'].map((constraint) => (
                    <Button
                      key={constraint}
                      variant={mobilityConstraints.includes(constraint) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        if (constraint === 'none') {
                          setMobilityConstraints(['none']);
                        } else {
                          const newConstraints = mobilityConstraints.filter(c => c !== 'none');
                          toggleArrayItem(newConstraints, constraint, setMobilityConstraints);
                        }
                      }}
                    >
                      {locale === 'pt' 
                        ? { none: 'Nenhuma', limited_mobility: 'Mobilidade limitada', no_car: 'Sem carro', wheelchair: 'Cadeira de rodas' }[constraint]
                        : { none: 'None', limited_mobility: 'Limited mobility', no_car: 'No car', wheelchair: 'Wheelchair' }[constraint]
                      }
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Home Reality */}
        {step === 'homeReality' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {locale === 'pt' 
                ? 'Detalhes sobre preparação e recursos em casa.'
                : 'Details about preparedness and resources at home.'}
            </p>
            <div className="grid gap-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>{locale === 'pt' ? 'Dependência de Internet' : 'Internet Reliance'}</Label>
                  <Select value={internetReliance} onValueChange={(v) => setInternetReliance(v as 'low' | 'medium' | 'high')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{locale === 'pt' ? 'Baixa' : 'Low'}</SelectItem>
                      <SelectItem value="medium">{locale === 'pt' ? 'Média' : 'Medium'}</SelectItem>
                      <SelectItem value="high">{locale === 'pt' ? 'Alta' : 'High'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{locale === 'pt' ? 'Preparação para Falta de Energia' : 'Power Outage Prep'}</Label>
                  <Select value={powerOutagePreparedness} onValueChange={(v) => setPowerOutagePreparedness(v as 'low' | 'medium' | 'high')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{locale === 'pt' ? 'Baixa' : 'Low'}</SelectItem>
                      <SelectItem value="medium">{locale === 'pt' ? 'Média' : 'Medium'}</SelectItem>
                      <SelectItem value="high">{locale === 'pt' ? 'Alta' : 'High'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>{locale === 'pt' ? 'Armazenamento de Água' : 'Water Storage'}</Label>
                  <Select value={waterStorage} onValueChange={(v) => setWaterStorage(v as 'none' | 'some' | 'good')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{locale === 'pt' ? 'Nenhum' : 'None'}</SelectItem>
                      <SelectItem value="some">{locale === 'pt' ? 'Algum' : 'Some'}</SelectItem>
                      <SelectItem value="good">{locale === 'pt' ? 'Bom' : 'Good'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{locale === 'pt' ? 'Dinheiro Físico' : 'Cash on Hand'}</Label>
                  <Select value={cashOnHandLevel} onValueChange={(v) => setCashOnHandLevel(v as 'none' | 'some' | 'good')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{locale === 'pt' ? 'Nenhum' : 'None'}</SelectItem>
                      <SelectItem value="some">{locale === 'pt' ? 'Algum' : 'Some'}</SelectItem>
                      <SelectItem value="good">{locale === 'pt' ? 'Bom' : 'Good'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>{locale === 'pt' ? 'Tipo de Aquecimento' : 'Heating Type'}</Label>
                  <Select value={heatingType} onValueChange={(v) => setHeatingType(v as 'district' | 'gas' | 'electric' | 'none')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="district">{locale === 'pt' ? 'Central' : 'District'}</SelectItem>
                      <SelectItem value="gas">{locale === 'pt' ? 'Gás' : 'Gas'}</SelectItem>
                      <SelectItem value="electric">{locale === 'pt' ? 'Elétrico' : 'Electric'}</SelectItem>
                      <SelectItem value="none">{locale === 'pt' ? 'Nenhum' : 'None'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{locale === 'pt' ? 'Acesso a Veículo' : 'Vehicle Access'}</Label>
                  <Select value={vehicleAccess} onValueChange={(v) => setVehicleAccess(v as 'none' | 'car' | 'bike_only' | 'multiple')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{locale === 'pt' ? 'Nenhum' : 'None'}</SelectItem>
                      <SelectItem value="bike_only">{locale === 'pt' ? 'Só bicicleta' : 'Bike only'}</SelectItem>
                      <SelectItem value="car">{locale === 'pt' ? 'Carro' : 'Car'}</SelectItem>
                      <SelectItem value="multiple">{locale === 'pt' ? 'Múltiplos' : 'Multiple'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>{locale === 'pt' ? 'Opções de Cozinhar' : 'Cooking Options'}</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['electric_stove', 'gas_stove', 'camp_stove', 'none'].map((option) => (
                    <Button
                      key={option}
                      variant={cookingOptions.includes(option) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleArrayItem(cookingOptions, option, setCookingOptions)}
                    >
                      {locale === 'pt' 
                        ? { electric_stove: 'Fogão elétrico', gas_stove: 'Fogão a gás', camp_stove: 'Fogão portátil', none: 'Nenhum' }[option]
                        : { electric_stove: 'Electric stove', gas_stove: 'Gas stove', camp_stove: 'Camp stove', none: 'None' }[option]
                      }
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleBack} disabled={isGenerating}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.common.back}
          </Button>
          
          {step === 'homeReality' ? (
            <Button onClick={handleGenerate} disabled={isGenerating || !canProceed()}>
              <Sparkles className="h-4 w-4 mr-2" />
              {isGenerating 
                ? t.common.loading 
                : (locale === 'pt' ? 'Gerar Plano' : 'Generate Plan')
              }
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed()}>
              {t.common.continue}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
