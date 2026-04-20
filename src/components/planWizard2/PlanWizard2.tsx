/**
 * Plan Wizard 2.0 - Main Component
 * 
 * Multi-step wizard for comprehensive emergency plan generation.
 * Premium-only, with 7 steps collecting location, destinations, 
 * resources, scenarios, priorities, and communication preferences.
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { 
  PlanWizardInputs, 
  createEmptyWizardInputs,
  GeneratedPlanA,
  GeneratedPlanB,
} from '@/lib/planWizard2Types';
import { 
  saveWizardInputs, 
  getCachedPremiumPlan,
  saveGeneratedPlans,
} from '@/lib/planWizard2Store';
import { supabase } from '@/integrations/supabase/client';
import { useVaultKey } from '@/contexts/VaultKeyContext';

import { WizardStep1Location } from './steps/WizardStep1Location';
import { WizardStep2SafeLocations } from './steps/WizardStep2SafeLocations';
import { WizardStep3Resources } from './steps/WizardStep3Resources';
import { WizardStep4Scenarios } from './steps/WizardStep4Scenarios';
import { WizardStep5Priorities } from './steps/WizardStep5Priorities';
import { WizardStep6Comms } from './steps/WizardStep6Comms';
import { WizardStep7Confirmation } from './steps/WizardStep7Confirmation';

const TOTAL_STEPS = 7;

interface PlanWizard2Props {
  onComplete: (planA: GeneratedPlanA, planB: GeneratedPlanB) => void;
  onCancel: () => void;
}

export function PlanWizard2({ onComplete, onCancel }: PlanWizard2Props) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const { encrypt, decrypt, isUnlocked } = useVaultKey();
  const [currentStep, setCurrentStep] = useState(1);
  const [inputs, setInputs] = useState<PlanWizardInputs>(createEmptyWizardInputs);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [loadingExisting, setLoadingExisting] = useState(true);

  // Load existing wizard inputs on mount
  useEffect(() => {
    async function loadExisting() {
      if (!user) return;
      try {
        const existing = await getCachedPremiumPlan(user.id);
        if (existing?.wizard_inputs) {
          setInputs(prev => ({
            ...prev,
            ...existing.wizard_inputs,
          }));
        }
      } catch (error) {
        console.error('Error loading existing inputs:', error);
      } finally {
        setLoadingExisting(false);
      }
    }
    loadExisting();
  }, [user]);

  const progress = (currentStep / TOTAL_STEPS) * 100;

  // Save current step inputs
  const saveCurrentStep = useCallback(async () => {
    if (!user) return;
    try {
      const stepKey = `step${currentStep}` as keyof PlanWizardInputs;
      await saveWizardInputs(user.id, { [stepKey]: inputs[stepKey] });
    } catch (error) {
      console.error('Error saving step:', error);
    }
  }, [user, currentStep, inputs]);

  const handleNext = async () => {
    await saveCurrentStep();
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      onCancel();
    }
  };

  const updateStep1 = (data: PlanWizardInputs['step1']) => {
    setInputs(prev => ({ ...prev, step1: data }));
  };

  const updateStep2 = (data: PlanWizardInputs['step2']) => {
    setInputs(prev => ({ ...prev, step2: data }));
  };

  const updateStep3 = (data: PlanWizardInputs['step3']) => {
    setInputs(prev => ({ ...prev, step3: data }));
  };

  const updateStep4 = (data: PlanWizardInputs['step4']) => {
    setInputs(prev => ({ ...prev, step4: data }));
  };

  const updateStep5 = (data: PlanWizardInputs['step5']) => {
    setInputs(prev => ({ ...prev, step5: data }));
  };

  const updateStep6 = (data: PlanWizardInputs['step6']) => {
    setInputs(prev => ({ ...prev, step6: data }));
  };

  const handleGenerate = async () => {
    if (!user) return;
    
    setIsGenerating(true);
    setGenerationStatus(locale === 'pt' ? 'A guardar dados...' : 'Saving data...');
    if (import.meta.env.DEV) console.log('[PlanWizard] Starting generation...');
    
    try {
      // Save all inputs first
      if (import.meta.env.DEV) console.log('[PlanWizard] Saving wizard inputs...');
      await saveWizardInputs(user.id, inputs);
      if (import.meta.env.DEV) console.log('[PlanWizard] Wizard inputs saved');

      setGenerationStatus(locale === 'pt' ? 'A processar os seus planos...' : 'Processing your plans...');
      if (import.meta.env.DEV) console.log('[PlanWizard] Calling edge function...');

      // Call edge function to generate plans
      const { data, error } = await supabase.functions.invoke('generate-plan-wizard', {
        body: {
          wizard_inputs: inputs,
          locale: locale,
        },
      });

      if (import.meta.env.DEV) console.log('[PlanWizard] Edge function response:', { data: !!data, error });

      if (error) {
        console.error('[PlanWizard] Generation error:', error);
        const errorMsg = error.message || (locale === 'pt' ? 'Erro ao gerar planos' : 'Error generating plans');
        toast.error(errorMsg);
        return;
      }

      if (!data?.plan_a || !data?.plan_b) {
        console.error('[PlanWizard] Incomplete response:', data);
        toast.error(locale === 'pt' ? 'Resposta incompleta' : 'Incomplete response');
        return;
      }

      setGenerationStatus(locale === 'pt' ? 'A guardar planos...' : 'Saving plans...');
      if (import.meta.env.DEV) console.log('[PlanWizard] Saving generated plans...');

      // Save generated plans (encrypted with Master Key when vault is unlocked)
      await saveGeneratedPlans(
        user.id,
        data.plan_a,
        data.plan_b,
        isUnlocked ? { encrypt, decrypt } : undefined
      );
      if (import.meta.env.DEV) console.log('[PlanWizard] Plans saved successfully');

      toast.success(locale === 'pt' ? 'Planos gerados com sucesso!' : 'Plans generated successfully!');
      onComplete(data.plan_a, data.plan_b);
    } catch (error) {
      console.error('[PlanWizard] Generation failed:', error);
      const errorMsg = error instanceof Error ? error.message : (locale === 'pt' ? 'Falha na geração' : 'Generation failed');
      toast.error(errorMsg);
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return inputs.step1.country.trim().length > 0 && inputs.step1.city.trim().length > 0;
      case 2:
        return true; // Safe locations are optional
      case 3:
        return true; // Resources are optional
      case 4:
        return inputs.step4.selectedScenarios.length > 0;
      case 5:
        return true; // Priorities are optional
      case 6:
        return true; // Comms are optional
      case 7:
        return true;
      default:
        return true;
    }
  };

  const stepTitles = {
    1: locale === 'pt' ? 'Localização & Contexto' : 'Location & Context',
    2: locale === 'pt' ? 'Destinos Seguros' : 'Safe Destinations',
    3: locale === 'pt' ? 'Recursos & Preparação' : 'Resources & Readiness',
    4: locale === 'pt' ? 'Cenários de Emergência' : 'Emergency Scenarios',
    5: locale === 'pt' ? 'Prioridades Pessoais' : 'Personal Priorities',
    6: locale === 'pt' ? 'Comunicação & Encontro' : 'Communication & Meetups',
    7: locale === 'pt' ? 'Confirmação' : 'Confirmation',
  };

  if (loadingExisting) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">
              {locale === 'pt' ? 'Assistente de Planos 2.0' : 'Plan Wizard 2.0'}
            </CardTitle>
            <CardDescription>
              {locale === 'pt' 
                ? `Passo ${currentStep} de ${TOTAL_STEPS}: ${stepTitles[currentStep as keyof typeof stepTitles]}`
                : `Step ${currentStep} of ${TOTAL_STEPS}: ${stepTitles[currentStep as keyof typeof stepTitles]}`}
            </CardDescription>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>

      <CardContent className="space-y-6">
        {currentStep === 1 && (
          <WizardStep1Location data={inputs.step1} onChange={updateStep1} />
        )}
        {currentStep === 2 && (
          <WizardStep2SafeLocations data={inputs.step2} onChange={updateStep2} />
        )}
        {currentStep === 3 && (
          <WizardStep3Resources data={inputs.step3} onChange={updateStep3} />
        )}
        {currentStep === 4 && (
          <WizardStep4Scenarios data={inputs.step4} onChange={updateStep4} />
        )}
        {currentStep === 5 && (
          <WizardStep5Priorities data={inputs.step5} onChange={updateStep5} />
        )}
        {currentStep === 6 && (
          <WizardStep6Comms data={inputs.step6} onChange={updateStep6} />
        )}
        {currentStep === 7 && (
          <WizardStep7Confirmation inputs={inputs} />
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleBack} disabled={isGenerating}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {currentStep === 1 
              ? (locale === 'pt' ? 'Cancelar' : 'Cancel')
              : (locale === 'pt' ? 'Voltar' : 'Back')}
          </Button>

          {currentStep < TOTAL_STEPS ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              {locale === 'pt' ? 'Seguinte' : 'Next'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <div className="flex flex-col items-end gap-2">
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !canProceed()}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {generationStatus || (locale === 'pt' ? 'A gerar...' : 'Generating...')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {locale === 'pt' ? 'Gerar Planos A & B' : 'Generate Plans A & B'}
                  </>
                )}
              </Button>
              {isGenerating && (
                <p className="text-xs text-muted-foreground">
                  {locale === 'pt' 
                    ? 'Isto pode demorar 30-60 segundos' 
                    : 'This may take 30-60 seconds'}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
