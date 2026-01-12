/**
 * Wizard Step 7: Confirmation / Summary
 */

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, Shield, Users, Wallet, Target, MessageSquare, CheckCircle2 
} from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { 
  PlanWizardInputs,
  SCENARIO_LABELS,
  SCENARIO_ICONS,
  PRIORITY_LABELS,
  COMM_LABELS,
} from '@/lib/planWizard2Types';

interface Props {
  inputs: PlanWizardInputs;
}

export function WizardStep7Confirmation({ inputs }: Props) {
  const { locale } = useLocale();
  const scenarioLabels = SCENARIO_LABELS[locale as 'en' | 'pt'] || SCENARIO_LABELS.en;
  const priorityLabels = PRIORITY_LABELS[locale as 'en' | 'pt'] || PRIORITY_LABELS.en;
  const commLabels = COMM_LABELS[locale as 'en' | 'pt'] || COMM_LABELS.en;

  const { step1, step2, step3, step4, step5, step6 } = inputs;

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-semibold text-lg">
          {locale === 'pt' ? 'Pronto para Gerar' : 'Ready to Generate'}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {locale === 'pt'
            ? 'Reveja os seus dados antes de gerar os planos.'
            : 'Review your information before generating plans.'}
        </p>
      </div>

      <div className="space-y-3">
        {/* Location */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {locale === 'pt' ? 'Localização' : 'Location'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {step1.city}, {step1.country}
                  {step1.neighborhood && ` (${step1.neighborhood})`}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">{step1.adults} {locale === 'pt' ? 'adultos' : 'adults'}</Badge>
                  {step1.kids > 0 && <Badge variant="outline">{step1.kids} {locale === 'pt' ? 'crianças' : 'kids'}</Badge>}
                  {step1.pets > 0 && <Badge variant="outline">{step1.pets} {locale === 'pt' ? 'animais' : 'pets'}</Badge>}
                  {step1.hasCar && <Badge variant="outline">🚗 {locale === 'pt' ? 'Carro' : 'Car'}</Badge>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Safe locations */}
        {step2.locations.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {locale === 'pt' ? 'Destinos Seguros' : 'Safe Destinations'}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {step2.locations.map((loc, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {loc.label || loc.cityOrArea}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resources */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Wallet className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {locale === 'pt' ? 'Recursos' : 'Resources'}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant={step3.docsReady ? 'default' : 'outline'} className="text-xs">
                    {step3.docsReady 
                      ? (locale === 'pt' ? '✓ Docs prontos' : '✓ Docs ready')
                      : (locale === 'pt' ? 'Docs não prontos' : 'Docs not ready')}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {locale === 'pt' ? 'Mochila:' : 'Go-bag:'} {step3.goBagStatus}
                  </Badge>
                  {step3.medicationsNeeded && (
                    <Badge variant="secondary" className="text-xs">
                      💊 {locale === 'pt' ? 'Medicação' : 'Medications'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scenarios */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Target className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {locale === 'pt' ? 'Cenários' : 'Scenarios'}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {step4.selectedScenarios.map((scenario) => (
                    <Badge key={scenario} variant="secondary" className="text-xs">
                      {SCENARIO_ICONS[scenario]} {scenarioLabels[scenario]}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Priorities */}
        {step5.selectedPriorities.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {locale === 'pt' ? 'Prioridades' : 'Priorities'}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {step5.selectedPriorities.map((priority) => (
                      <Badge key={priority} variant="outline" className="text-xs">
                        {priorityLabels[priority]}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Communication */}
        {(step6.meetingPointA || step6.meetingPointB || step6.preferredChannels.length > 0) && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {locale === 'pt' ? 'Comunicação' : 'Communication'}
                  </p>
                  <div className="text-sm text-muted-foreground mt-1 space-y-1">
                    {step6.meetingPointA && (
                      <p>📍 A: {step6.meetingPointA}</p>
                    )}
                    {step6.meetingPointB && (
                      <p>📍 B: {step6.meetingPointB}</p>
                    )}
                  </div>
                  {step6.preferredChannels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {step6.preferredChannels.map((channel) => (
                        <Badge key={channel} variant="outline" className="text-xs">
                          {commLabels[channel]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        {locale === 'pt'
          ? 'A IA vai gerar Plan A (Ficar) e Plan B (Evacuar) personalizados com base nestes dados.'
          : 'AI will generate personalized Plan A (Stay) and Plan B (Evacuate) based on this data.'}
      </p>
    </div>
  );
}
