import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Info } from 'lucide-react';
import { hasGeneratedPlans } from '@/lib/planWizard2Store';
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
  const { t } = useLocale();
  const navigate = useNavigate();
  
  const [wizardPlans, setWizardPlans] = useState<{ hasPlanA: boolean; hasPlanB: boolean } | null>(null);

  // Load wizard plan status
  useEffect(() => {
    if (user && isPremium) {
      hasGeneratedPlans(user.id).then(setWizardPlans);
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
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">{t.plans.title}</h1>
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
                const hasWizardPlan = planType === 'A' ? wizardPlans?.hasPlanA : wizardPlans?.hasPlanB;
                return (
                  <PlanCard
                    key={planType}
                    planType={planType}
                    hasGeneratedPlan={hasWizardPlan}
                    onViewPlan={() => navigate('/premium/plans/wizard')}
                    onStartWizard={() => navigate('/premium/plans/wizard')}
                  />
                );
              })}
            </div>

            {/* Premium note */}
            <p className="mt-8 text-sm text-muted-foreground text-center">
              {t.plans.premiumNote}
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
