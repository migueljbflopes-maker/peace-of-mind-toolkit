/**
 * Plan Wizard 2.0 Page
 * 
 * Premium-gated page for the comprehensive emergency plan wizard.
 * Follows unified gating order: loading → login → premium lock → content
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocale } from '@/i18n/useLocale';
import { PremiumLockedState } from '@/components/PremiumLockedState';
import { LoginGateCard } from '@/components/LoginGateCard';
import { PlanWizard2 } from '@/components/planWizard2';
import { GeneratedPlanA, GeneratedPlanB } from '@/lib/planWizard2Types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { PlanResultsView } from '@/components/planWizard2/PlanResultsView';

export default function PlansWizard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isPremium, loading: entLoading } = useEntitlements();
  const { t, locale } = useLocale();
  
  const [generatedPlans, setGeneratedPlans] = useState<{
    planA: GeneratedPlanA;
    planB: GeneratedPlanB;
  } | null>(null);

  const handleComplete = useCallback((planA: GeneratedPlanA, planB: GeneratedPlanB) => {
    setGeneratedPlans({ planA, planB });
  }, []);

  const handleCancel = useCallback(() => {
    navigate('/premium/plans');
  }, [navigate]);

  const handleRegenerate = useCallback(() => {
    setGeneratedPlans(null);
  }, []);

  // Loading state
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

  // Login check
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container-wide section-padding py-8">
          <LoginGateCard feature={locale === 'pt' ? 'Assistente de Planos' : 'Plan Wizard'} />
        </main>
        <Footer />
      </div>
    );
  }

  // Premium check
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1">
          <PremiumLockedState title={locale === 'pt' ? 'Assistente de Planos 2.0' : 'Plan Wizard 2.0'} />
        </main>
        <Footer />
      </div>
    );
  }

  // Show results if plans were generated
  if (generatedPlans) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container-wide section-padding py-8">
          <PlanResultsView
            planA={generatedPlans.planA}
            planB={generatedPlans.planB}
            onRegenerate={handleRegenerate}
            onBack={() => navigate('/premium/plans')}
          />
        </main>
        <Footer />
      </div>
    );
  }

  // Show wizard
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container-wide section-padding py-8">
        <PlanWizard2 
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </main>
      <Footer />
    </div>
  );
}
