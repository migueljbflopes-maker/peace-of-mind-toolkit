import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Home, Car, ChevronRight, ChevronLeft, Loader2, Check, Sparkles } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { useVaultSession } from '@/hooks/useVaultSession';
import { useAuth } from '@/hooks/useAuth';
import { generatePlanDraft, AIPlanInput } from '@/lib/aiPlanDraft';
import { encryptJSON } from '@/lib/crypto';
import { savePlanToCache, PlanData, PlanType } from '@/lib/plansStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export default function OnboardingStep3Plans({ onNext, onBack }: Props) {
  const { t, locale } = useLocale();
  const { getPassphrase } = useVaultSession();
  const { user } = useAuth();
  
  const [planA, setPlanA] = useState<PlanData | null>(null);
  const [planB, setPlanB] = useState<PlanData | null>(null);
  const [generatingA, setGeneratingA] = useState(false);
  const [generatingB, setGeneratingB] = useState(false);
  const [saving, setSaving] = useState(false);

  const defaultInput: AIPlanInput = {
    locale: locale as 'en' | 'pt',
    region: 'General',
    riskLevelBand: 'medium',
    householdSizeBucket: '2-3',
    hasPets: false,
    hasKids: false,
    mobilityLevel: 'high',
    daysPreparedness: 14,
  };

  const handleGeneratePlanA = async () => {
    setGeneratingA(true);
    try {
      const draft = await generatePlanDraft('A', defaultInput);
      setPlanA(draft);
      toast.success(t.plans.draftGenerated);
    } catch (err) {
      console.error('Error generating Plan A:', err);
      toast.error('Failed to generate plan');
    } finally {
      setGeneratingA(false);
    }
  };

  const handleGeneratePlanB = async () => {
    setGeneratingB(true);
    try {
      const draft = await generatePlanDraft('B', defaultInput);
      setPlanB(draft);
      toast.success(t.plans.draftGenerated);
    } catch (err) {
      console.error('Error generating Plan B:', err);
      toast.error('Failed to generate plan');
    } finally {
      setGeneratingB(false);
    }
  };

  const handleSaveAndContinue = async () => {
    const passphrase = getPassphrase();
    if (!passphrase || !user) {
      toast.error('Vault not unlocked');
      return;
    }

    if (!planA && !planB) {
      // Allow skipping if no plans generated
      onNext();
      return;
    }

    setSaving(true);
    try {
      const savePlan = async (plan: PlanData, planType: PlanType) => {
        const payload = await encryptJSON(plan, passphrase);
        await savePlanToCache(planType, payload);

        if (navigator.onLine) {
          await supabase.from('plan_items').upsert({
            user_id: user.id,
            plan_type: planType,
            ciphertext: payload.ciphertextB64,
            iv: payload.ivB64,
            salt: payload.saltB64,
            version: payload.version,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,plan_type' });
        }
      };

      if (planA) await savePlan(planA, 'A');
      if (planB) await savePlan(planB, 'B');

      toast.success(t.plans.saved);
      onNext();
    } catch (err) {
      console.error('Error saving plans:', err);
      toast.error('Failed to save plans');
    } finally {
      setSaving(false);
    }
  };

  const renderPlanPreview = (plan: PlanData | null, type: 'A' | 'B') => {
    if (!plan) return null;

    return (
      <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">{t.onboarding?.draftReady || 'Draft ready'}</span>
        </div>
        <ul className="text-xs text-muted-foreground space-y-1">
          {plan.triggers.slice(0, 2).map((trigger, i) => (
            <li key={i} className="truncate">• {trigger}</li>
          ))}
          {plan.stepsFirstHour.slice(0, 2).map((step, i) => (
            <li key={i} className="truncate">• {step}</li>
          ))}
          <li className="text-primary cursor-pointer hover:underline">
            {t.onboarding?.andMore || '+ more...'}
          </li>
        </ul>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>{t.onboarding?.step3Title || 'Create your Plans A & B'}</CardTitle>
        <CardDescription>{t.onboarding?.step3Desc || "We'll generate a first draft. You can edit it anytime."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Plan A */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Home className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">{t.plans.planA}</h3>
                <p className="text-sm text-muted-foreground">{t.plans.planADesc}</p>
              </div>
            </div>
          {planA ? (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <Check className="h-3 w-3 mr-1" />
                {t.onboarding?.generated || 'Generated'}
              </Badge>
            ) : null}
          </div>
          
          {renderPlanPreview(planA, 'A')}
          
          {!planA && (
            <Button 
              variant="outline" 
              className="mt-3 w-full" 
              onClick={handleGeneratePlanA}
              disabled={generatingA}
            >
              {generatingA ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.plans.generating}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t.plans.generateDraft}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Plan B */}
        <div className="p-4 border rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Car className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium">{t.plans.planB}</h3>
                <p className="text-sm text-muted-foreground">{t.plans.planBDesc}</p>
              </div>
            </div>
          {planB ? (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <Check className="h-3 w-3 mr-1" />
                {t.onboarding?.generated || 'Generated'}
              </Badge>
            ) : null}
          </div>
          
          {renderPlanPreview(planB, 'B')}
          
          {!planB && (
            <Button 
              variant="outline" 
              className="mt-3 w-full" 
              onClick={handleGeneratePlanB}
              disabled={generatingB}
            >
              {generatingB ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.plans.generating}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t.plans.generateDraft}
                </>
              )}
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {t.onboarding?.plansNote || 'You can edit your plans anytime from Premium → Plans.'}
        </p>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onBack} disabled={saving}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t.common.back}
          </Button>
          <Button className="flex-1" onClick={handleSaveAndContinue} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.common.loading}
              </>
            ) : (
              <>
                {planA || planB ? (t.onboarding?.savePlans || 'Save plans') : t.common.continue}
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
