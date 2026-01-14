import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FileText, Info, RefreshCw } from 'lucide-react';
import { getPlan } from '@/lib/planWizard2Store';
import { GeneratedPlanA, GeneratedPlanB } from '@/lib/planWizard2Types';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocale } from '@/i18n/useLocale';
import { PremiumLockedState } from '@/components/PremiumLockedState';
import { LoginGateCard } from '@/components/LoginGateCard';
import { PlanCard } from '@/components/plans/PlanCard';
import { PlanType } from '@/lib/plansStore';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Plans() {
  const { user, loading: authLoading } = useAuth();
  const { isPremium, loading: entLoading } = useEntitlements();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  
  const [planData, setPlanData] = useState<{
    planA: GeneratedPlanA | null;
    planB: GeneratedPlanB | null;
  } | null>(null);

  // Load full plan data
  useEffect(() => {
    if (user && isPremium) {
      getPlan(user.id).then(plan => {
        if (plan) {
          setPlanData({
            planA: plan.plan_a_json,
            planB: plan.plan_b_json,
          });
        }
      });
    }
  }, [user, isPremium]);

  if (authLoading || entLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">{t.common.loading}</div>
        </main>
        <Footer />
      </div>
    );
  }

  // Login check BEFORE premium check
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container-wide section-padding py-8">
          <LoginGateCard feature={t.plans.title} />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {!isPremium ? (
          <PremiumLockedState title={t.plans.title} />
        ) : (
          <div className="container-wide section-padding py-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold text-foreground">{t.plans.title}</h1>
                </div>
                {(planData?.planA || planData?.planB) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/premium/plans/wizard')}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {locale === 'pt' ? 'Refazer Planos' : 'Redo Plans'}
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground">{t.plans.subtitle}</p>
            </div>

            {/* Tip */}
            <Alert className="mb-6 border-muted bg-muted/30">
              <Info className="h-4 w-4 text-muted-foreground" />
              <AlertDescription className="text-muted-foreground">
                {t.plans.tip}
              </AlertDescription>
            </Alert>

            {/* Plans Grid */}
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
              {(['A', 'B'] as PlanType[]).map((planType) => {
                const hasPlan = planType === 'A' ? !!planData?.planA : !!planData?.planB;
                const summary = planType === 'A' ? planData?.planA?.overview : planData?.planB?.overview;
                return (
                  <PlanCard
                    key={planType}
                    planType={planType}
                    hasGeneratedPlan={hasPlan}
                    summary={summary}
                    onViewPlan={() => navigate('/premium/plans/wizard')}
                    onStartWizard={() => navigate('/premium/plans/wizard')}
                  />
                );
              })}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
