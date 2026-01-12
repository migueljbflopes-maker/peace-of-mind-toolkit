/**
 * Plan Wizard 2.0 Page
 * 
 * Premium-gated page for the comprehensive emergency plan wizard.
 * Follows unified gating order: loading → login → premium lock → content
 */

import { useState, useCallback, useEffect } from 'react';
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
import { getPlan } from '@/lib/planWizard2Store';
import { Loader2 } from 'lucide-react';

type PageMode = 'loading' | 'view' | 'wizard';

export default function PlansWizard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isPremium, loading: entLoading } = useEntitlements();
  const { t, locale } = useLocale();
  
  const [mode, setMode] = useState<PageMode>('loading');
  const [generatedPlans, setGeneratedPlans] = useState<{
    planA: GeneratedPlanA;
    planB: GeneratedPlanB;
  } | null>(null);

  // Load existing plans on mount
  useEffect(() => {
    const loadExistingPlans = async () => {
      if (!user || !isPremium) {
        setMode('wizard');
        return;
      }
      
      try {
        const existingPlan = await getPlan(user.id);
        if (existingPlan?.plan_a_json && existingPlan?.plan_b_json) {
          setGeneratedPlans({
            planA: existingPlan.plan_a_json as GeneratedPlanA,
            planB: existingPlan.plan_b_json as GeneratedPlanB,
          });
          setMode('view');
        } else {
          setMode('wizard');
        }
      } catch (error) {
        console.error('Error loading plans:', error);
        setMode('wizard');
      }
    };

    if (!authLoading && !entLoading && user && isPremium) {
      loadExistingPlans();
    } else if (!authLoading && !entLoading) {
      setMode('wizard');
    }
  }, [user, isPremium, authLoading, entLoading]);

  const handleComplete = useCallback((planA: GeneratedPlanA, planB: GeneratedPlanB) => {
    setGeneratedPlans({ planA, planB });
    setMode('view');
  }, []);

  const handleCancel = useCallback(() => {
    navigate('/premium/plans');
  }, [navigate]);

  const handleRegenerate = useCallback(() => {
    setMode('wizard');
  }, []);

  const handleEdit = useCallback(() => {
    setMode('wizard');
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleShare = useCallback(() => {
    navigate('/premium/red-folder');
  }, [navigate]);

  // Loading state
  if (authLoading || entLoading || mode === 'loading') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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

  // Show results if plans exist
  if (mode === 'view' && generatedPlans) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container-wide section-padding py-8">
          <PlanResultsView
            planA={generatedPlans.planA}
            planB={generatedPlans.planB}
            onRegenerate={handleRegenerate}
            onEdit={handleEdit}
            onPrint={handlePrint}
            onShare={handleShare}
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
