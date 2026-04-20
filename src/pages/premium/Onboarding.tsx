import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Lock, Users, FileText, Download, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocale } from '@/i18n/useLocale';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { PremiumLockedState } from '@/components/PremiumLockedState';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { toast } from 'sonner';

// Step components
import OnboardingStep1Vault from '@/components/onboarding/OnboardingStep1Vault';
import OnboardingStep2Essentials from '@/components/onboarding/OnboardingStep2Essentials';
import OnboardingStep3Plans from '@/components/onboarding/OnboardingStep3Plans';
import OnboardingStep4Export from '@/components/onboarding/OnboardingStep4Export';

const TOTAL_STEPS = 4;

export default function Onboarding() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { isPremium, loading: entitlementsLoading } = useEntitlements();
  const { step, loading: onboardingLoading, setStep, markCompleted, needsOnboarding } = useOnboardingState(user?.id);
  
  const [currentStep, setCurrentStep] = useState(1);

  // Sync with stored step on load
  useEffect(() => {
    if (!onboardingLoading && step) {
      setCurrentStep(step);
    }
  }, [onboardingLoading, step]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?return_url=/premium/onboarding');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleNext = async () => {
    if (currentStep < TOTAL_STEPS) {
      const nextStep = currentStep + 1;
      await setStep(nextStep);
      setCurrentStep(nextStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  const handleComplete = async () => {
    const success = await markCompleted();
    if (success) {
      toast.success(t.onboarding?.completedSuccess || 'Premium setup complete. Your plan is ready offline.');
      navigate('/dashboard');
    }
  };

  // Loading states
  if (authLoading || entitlementsLoading || onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Premium gate
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container-wide section-padding py-12">
          <PremiumLockedState />
        </main>
        <Footer />
      </div>
    );
  }

  const stepIcons = [Lock, Users, FileText, Download];
  const stepLabels = [
    t.onboarding?.step1Title || 'Secure Vault',
    t.onboarding?.step2Title || 'Add Essentials',
    t.onboarding?.step3Title || 'Create Plans',
    t.onboarding?.step4Title || 'Export PDF',
  ];

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <OnboardingStep1Vault onNext={handleNext} />;
      case 2:
        return <OnboardingStep2Essentials onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <OnboardingStep3Plans onNext={handleNext} onBack={handleBack} />;
      case 4:
        return <OnboardingStep4Export onComplete={handleComplete} onBack={handleBack} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <div className="container-wide section-padding py-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">{t.onboarding?.title || 'Premium Setup'}</h1>
            <p className="text-muted-foreground">{t.onboarding?.subtitle || 'Set up your Personalized Resiliency Plan in 5 minutes.'}</p>
          </div>

          {/* Progress indicator */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex items-center justify-between mb-4">
              {stepLabels.map((label, index) => {
                const Icon = stepIcons[index];
                const isActive = index + 1 === currentStep;
                const isCompleted = index + 1 < currentStep;
                
                return (
                  <div 
                    key={index}
                    className={`flex flex-col items-center ${
                      isActive ? 'text-primary' : isCompleted ? 'text-primary/70' : 'text-muted-foreground'
                    }`}
                  >
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center mb-2
                      ${isActive ? 'bg-primary text-primary-foreground' : 
                        isCompleted ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
                    `}>
                      {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span className="text-xs text-center hidden sm:block">{label}</span>
                  </div>
                );
              })}
            </div>
            <Progress value={(currentStep / TOTAL_STEPS) * 100} className="h-2" />
            <p className="text-sm text-muted-foreground text-center mt-2">
              {(t.onboarding?.stepOf || 'Step {current} of {total}').replace('{current}', String(currentStep)).replace('{total}', String(TOTAL_STEPS))}
            </p>
          </div>

          {/* Step content */}
          <div className="max-w-2xl mx-auto">
            {renderStep()}
          </div>

          {/* Skip button */}
          <div className="max-w-2xl mx-auto mt-6 text-center">
            <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
              {t.onboarding?.skipForNow || 'Skip for now'}
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
