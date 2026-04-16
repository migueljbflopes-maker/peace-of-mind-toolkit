import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield, ChevronLeft, AlertTriangle, Lock, LogIn, 
  FileText, Brain, Target, MapPin, Users, Zap, CheckCircle 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEntitlements } from '@/contexts/EntitlementsContext';
import { useLocale } from '@/i18n/useLocale';
import { supabase } from '@/integrations/supabase/client';
import RiskWizardUI from '@/components/riskWizard/RiskWizardUI';
import { PremiumRiskResults } from '@/components/riskWizard/PremiumRiskResults';
import { WizardResult, WizardAnswers } from '@/components/riskWizard/types';
import { computeWizardResult } from '@/components/riskWizard/adapter';

export default function RiskAssessment() {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const { user, loading: authLoading } = useAuth();
  const { isPremium, loading: entLoading } = useEntitlements();
  
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [existingResult, setExistingResult] = useState<WizardResult | null>(null);
  const [existingAiInsights, setExistingAiInsights] = useState<Record<string, unknown> | null>(null);
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
        
        // Load existing AI insights if available
        if (data.ai_insights) {
          setExistingAiInsights(data.ai_insights as Record<string, unknown>);
        }
      }
    } catch (error) {
      console.error('Failed to load assessment:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleWizardComplete = (result: WizardResult) => {
    setExistingResult(result);
    setExistingAiInsights(null); // Clear old insights to trigger fresh AI fetch
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
              <Button onClick={() => navigate('/login')}>{t.login}</Button>
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

  // Show wizard - pass callback to receive completion and skip internal results
  if (showWizard) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <RiskWizardUI 
            onComplete={handleWizardComplete}
            showResultsInternally={false}
            exitRoute="/dashboard"
          />
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
            score={existingResult.readinessScore}
            riskLevel={existingResult.riskLevel}
            city={existingResult.inputs.city || ''}
            country={existingResult.inputs.country_code || ''}
            breakdown={existingResult.breakdown}
            inputs={existingResult.inputs as unknown as Record<string, unknown>}
            existingInsights={existingAiInsights}
            onSaved={() => setShowWizard(false)}
            onRetake={handleRetake}
          />
        ) : (
          <div className="space-y-8">
            {/* Hero explanation */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="pt-8 pb-8">
                <div className="text-center max-w-2xl mx-auto space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">
                    {locale === 'pt' ? 'Descubra os seus riscos reais' : 'Discover Your Real Risks'}
                  </h2>
                  <p className="text-muted-foreground text-lg">
                    {locale === 'pt' 
                      ? 'Obtenha uma análise personalizada baseada na sua localização, agregado familiar e nível de preparação atual.'
                      : 'Get a personalized analysis based on your location, household, and current preparedness level.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* How it works */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {locale === 'pt' ? 'Como funciona' : 'How it works'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="relative overflow-hidden">
                  <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    1
                  </div>
                  <CardContent className="pt-14 pb-6">
                    <FileText className="h-8 w-8 text-primary mb-3" />
                    <h4 className="font-semibold mb-1">
                      {locale === 'pt' ? 'Responda a 14 perguntas' : 'Answer 14 questions'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {locale === 'pt' 
                        ? 'Sobre localização, casa, mobilidade e preparação atual' 
                        : 'About location, household, mobility and current preparedness'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                  <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    2
                  </div>
                  <CardContent className="pt-14 pb-6">
                    <Brain className="h-8 w-8 text-primary mb-3" />
                    <h4 className="font-semibold mb-1">
                      {locale === 'pt' ? 'IA analisa os seus riscos' : 'AI analyzes your risks'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {locale === 'pt' 
                        ? 'Cruzamos dados com infraestruturas e riscos regionais' 
                        : 'We cross-reference data with infrastructure and regional risks'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                  <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    3
                  </div>
                  <CardContent className="pt-14 pb-6">
                    <Target className="h-8 w-8 text-primary mb-3" />
                    <h4 className="font-semibold mb-1">
                      {locale === 'pt' ? 'Receba o seu relatório' : 'Receive your report'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {locale === 'pt' 
                        ? 'Com prioridades claras e recomendações personalizadas' 
                        : 'With clear priorities and personalized recommendations'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* What you'll get */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {locale === 'pt' ? 'O que vai descobrir' : 'What you\'ll discover'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">
                        {locale === 'pt' ? 'Análise de infraestruturas' : 'Infrastructure analysis'}
                      </span>
                      <p className="text-sm text-muted-foreground">
                        {locale === 'pt' 
                          ? 'Hospitais, serviços de emergência, cadeias de abastecimento' 
                          : 'Hospitals, emergency services, supply chains'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">
                        {locale === 'pt' ? 'Riscos naturais' : 'Natural hazards'}
                      </span>
                      <p className="text-sm text-muted-foreground">
                        {locale === 'pt' 
                          ? 'Sismos, inundações, incêndios e outros perigos regionais' 
                          : 'Earthquakes, floods, fires and other regional hazards'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">
                        {locale === 'pt' ? 'Riscos geopolíticos' : 'Geopolitical risks'}
                      </span>
                      <p className="text-sm text-muted-foreground">
                        {locale === 'pt' 
                          ? 'Cenários de guerra, impacto nuclear, civil e de infraestrutura' 
                          : 'War scenarios, nuclear, civil and infrastructure impact'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">
                        {locale === 'pt' ? 'Top 3 prioridades' : 'Top 3 priorities'}
                      </span>
                      <p className="text-sm text-muted-foreground">
                        {locale === 'pt' 
                          ? 'Ações concretas personalizadas para a sua situação' 
                          : 'Concrete personalized actions for your situation'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="text-center pt-4">
              <Button 
                size="lg" 
                className="h-14 px-10 text-lg font-semibold gap-2"
                onClick={() => setShowWizard(true)}
              >
                <Shield className="h-5 w-5" />
                {t.startAssessment}
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                {locale === 'pt' 
                  ? 'Aproximadamente 5 minutos para completar' 
                  : 'Approximately 5 minutes to complete'}
              </p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
