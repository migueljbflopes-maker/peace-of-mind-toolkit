import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, ChevronLeft, AlertTriangle, Lock, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEntitlements } from '@/contexts/EntitlementsContext';
import { useLocale } from '@/i18n/useLocale';
import { supabase } from '@/integrations/supabase/client';
import RiskWizardUI from '@/components/riskWizard/RiskWizardUI';
import PremiumRiskResults from '@/components/riskWizard/PremiumRiskResults';
import { WizardResult, WizardAnswers } from '@/components/riskWizard/types';
import { computeWizardResult } from '@/components/riskWizard/adapter';

export default function RiskAssessment() {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const { user, loading: authLoading } = useAuth();
  const { isPremium, loading: entLoading } = useEntitlements();
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [existingResult, setExistingResult] = useState<WizardResult | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  const t = locale === 'pt' ? {
    title: 'Avaliação de Risco Premium',
    subtitle: 'Análise personalizada com insights de IA',
    loading: 'A carregar...',
    loginRequired: 'Inicie sessão para aceder',
    loginDesc: 'Esta funcionalidade requer autenticação.',
    login: 'Iniciar Sessão',
    premiumRequired: 'Funcionalidade Premium',
    premiumDesc: 'Faça upgrade para aceder a insights de IA personalizados.',
    upgrade: 'Ver Preços',
    back: 'Voltar',
    startAssessment: 'Iniciar Avaliação',
    noAssessment: 'Ainda não tem uma avaliação de risco.',
    noAssessmentDesc: 'Complete o questionário para obter insights personalizados sobre a sua preparação.',
  } : {
    title: 'Premium Risk Assessment',
    subtitle: 'Personalized analysis with AI insights',
    loading: 'Loading...',
    loginRequired: 'Login Required',
    loginDesc: 'This feature requires authentication.',
    login: 'Log In',
    premiumRequired: 'Premium Feature',
    premiumDesc: 'Upgrade to access personalized AI insights.',
    upgrade: 'View Pricing',
    back: 'Back',
    startAssessment: 'Start Assessment',
    noAssessment: 'You don\'t have a risk assessment yet.',
    noAssessmentDesc: 'Complete the questionnaire to get personalized insights about your preparedness.',
  };

  useEffect(() => {
    if (user && isPremium) {
      loadExistingAssessment();
    } else {
      setIsLoadingData(false);
    }
  }, [user, isPremium]);

  const loadExistingAssessment = async () => {
    try {
      const { data, error } = await supabase
        .from('risk_assessments')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data && data.inputs) {
        // Reconstruct result from saved data
        const inputs = data.inputs as unknown as WizardAnswers;
        const result = computeWizardResult(inputs);
        setExistingResult(result);
      }
    } catch (error) {
      console.error('Failed to load assessment:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleWizardComplete = (result: WizardResult) => {
    setExistingResult(result);
    setShowWizard(false);
  };

  const handleRetake = () => {
    setShowWizard(true);
    setExistingResult(null);
  };

  // Loading state
  if (authLoading || entLoading || isLoadingData) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96 mb-8" />
          <Skeleton className="h-96 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container max-w-lg mx-auto px-4 py-16">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto p-3 rounded-full bg-muted w-fit mb-2">
                <LogIn className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>{t.loginRequired}</CardTitle>
              <CardDescription>{t.loginDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/auth')}>{t.login}</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Not premium
  if (!isPremium) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container max-w-lg mx-auto px-4 py-16">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto p-3 rounded-full bg-amber-100 w-fit mb-2">
                <Lock className="h-6 w-6 text-amber-600" />
              </div>
              <CardTitle>{t.premiumRequired}</CardTitle>
              <CardDescription>{t.premiumDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/pricing')}>{t.upgrade}</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Show wizard - use the standalone component which handles its own completion
  if (showWizard) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <RiskWizardUI />
        </main>
        <Footer />
      </div>
    );
  }

  // Show results or empty state
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t.back}
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t.title}</h1>
              <p className="text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>
        </div>

        {existingResult ? (
          <PremiumRiskResults 
            result={existingResult} 
            userId={user.id}
            onRetake={handleRetake}
          />
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <div className="mx-auto p-4 rounded-full bg-muted w-fit mb-4">
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t.noAssessment}</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {t.noAssessmentDesc}
              </p>
              <Button onClick={() => setShowWizard(true)}>
                {t.startAssessment}
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
