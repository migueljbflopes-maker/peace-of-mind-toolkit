import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoginModal } from '@/components/modals/LoginModal';
import { PaywallModal } from '@/components/modals/PaywallModal';
import { useEntitlements } from '@/hooks/useEntitlements';
import { RISK_WIZARD, flattenSteps, getTotalSteps } from './schema';
import { computeWizardResult, calculateReadinessScore } from './adapter';
import { useDraftPersistence, saveWizardResult } from './useDraftPersistence';
import type { WizardResult } from './types';
import WizardProgress from './WizardProgress';
import WizardStep from './WizardStep';
import WizardResults from './WizardResults';
import ResumeModal from './ResumeModal';

export default function RiskWizardUI() {
  const navigate = useNavigate();
  const { isPremium } = useEntitlements();
  
  // Draft persistence
  const {
    answers,
    currentStepIndex,
    hasDraft,
    setCurrentStepIndex,
    updateAnswer,
    clearDraft,
    resumeDraft,
    startFresh,
  } = useDraftPersistence();
  
  // UI state
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<WizardResult | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(hasDraft);
  
  // Flatten steps for linear navigation
  const allSteps = useMemo(() => flattenSteps(RISK_WIZARD), []);
  const totalSteps = getTotalSteps(RISK_WIZARD);
  
  const currentStepData = allSteps[currentStepIndex];
  
  // Calculate live readiness preview (only after preparedness section starts)
  const readinessPreview = useMemo(() => {
    const preparednessStartIndex = allSteps.findIndex(s => s.sectionId === 'preparedness');
    if (currentStepIndex < preparednessStartIndex) return null;
    return calculateReadinessScore(answers);
  }, [answers, currentStepIndex, allSteps]);
  
  // Check if current step is answered
  const isCurrentStepAnswered = useCallback(() => {
    const step = currentStepData?.step;
    if (!step) return false;
    
    if (step.type === 'location' && step.fields) {
      // Check all required fields
      return step.fields.every(field => {
        if (!field.required) return true;
        const value = (answers as unknown as Record<string, unknown>)[field.key];
        return value && String(value).trim() !== '';
      });
    }
    
    if (step.type === 'single') {
      const value = (answers as unknown as Record<string, unknown>)[step.id];
      return value && String(value).trim() !== '';
    }
    
    if (step.type === 'multi') {
      const value = (answers as unknown as Record<string, unknown>)[step.id] as string[] | undefined;
      return value && value.length > 0;
    }
    
    return false;
  }, [currentStepData, answers]);
  
  const handleNext = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Compute and show results
      const computedResult = computeWizardResult(answers);
      setResult(computedResult);
      saveWizardResult(computedResult);
      setShowResults(true);
    }
  }, [currentStepIndex, totalSteps, answers, setCurrentStepIndex]);
  
  const handleBack = useCallback(() => {
    if (showResults) {
      setShowResults(false);
    } else if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    } else {
      navigate('/be-prepared');
    }
  }, [showResults, currentStepIndex, setCurrentStepIndex, navigate]);
  
  const handleUpdateAnswer = useCallback((key: string, value: string | string[]) => {
    updateAnswer(key, value);
  }, [updateAnswer]);
  
  const handleResume = useCallback(() => {
    resumeDraft();
    setShowResumeModal(false);
  }, [resumeDraft]);
  
  const handleStartFresh = useCallback(() => {
    startFresh();
    setShowResumeModal(false);
  }, [startFresh]);
  
  const handleResultsBack = useCallback(() => {
    setShowResults(false);
    setResult(null);
  }, []);
  
  // Show resume modal if draft exists
  if (showResumeModal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <ResumeModal 
          open={true}
          onResume={handleResume}
          onStartFresh={handleStartFresh}
        />
      </div>
    );
  }
  
  // Show results screen
  if (showResults && result) {
    return (
      <>
        <WizardResults
          result={result}
          isPremium={isPremium}
          onBack={handleResultsBack}
          onShowPaywall={() => setShowPaywallModal(true)}
          onShowLogin={() => setShowLoginModal(true)}
        />
        <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
        <PaywallModal open={showPaywallModal} onOpenChange={setShowPaywallModal} />
      </>
    );
  }
  
  // Main wizard view
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        {/* Header with title */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <button 
              onClick={handleBack}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{RISK_WIZARD.title}</h1>
              <p className="text-xs text-muted-foreground">{RISK_WIZARD.subtitle}</p>
            </div>
          </div>
          
          {/* Progress bar */}
          <WizardProgress
            currentStep={currentStepIndex}
            totalSteps={totalSteps}
            sectionTitle={currentStepData?.sectionTitle}
            readinessPreview={readinessPreview}
          />
        </div>
        
        {/* Step content */}
        <Card className="p-5 mb-6 bg-card border-border/50">
          {currentStepData && (
            <WizardStep
              step={currentStepData.step}
              answers={answers}
              onUpdateAnswer={handleUpdateAnswer}
              sectionIntro={currentStepData.sectionIntro}
              sectionTitle={currentStepData.sectionIntro ? currentStepData.sectionTitle : undefined}
            />
          )}
        </Card>
        
        {/* Navigation buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isCurrentStepAnswered()}
            className="flex-1"
          >
            {currentStepIndex === totalSteps - 1 ? 'See Results' : 'Continue'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        
        {/* Auto-save indicator */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          Progress saved automatically
        </p>
      </div>
      
      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />
      <PaywallModal open={showPaywallModal} onOpenChange={setShowPaywallModal} />
    </div>
  );
}
