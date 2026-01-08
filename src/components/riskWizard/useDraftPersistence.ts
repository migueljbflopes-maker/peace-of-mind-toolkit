import { useState, useEffect, useCallback } from 'react';
import type { WizardAnswers, WizardDraft } from './types';
import { defaultWizardAnswers } from './types';

const DRAFT_KEY = 'riskDraft_v1';
const RESULT_KEY = 'riskWizard_result_v1';

interface UseDraftPersistenceReturn {
  answers: WizardAnswers;
  currentStepIndex: number;
  hasDraft: boolean;
  setAnswers: React.Dispatch<React.SetStateAction<WizardAnswers>>;
  setCurrentStepIndex: React.Dispatch<React.SetStateAction<number>>;
  updateAnswer: (key: string, value: string | string[]) => void;
  clearDraft: () => void;
  resumeDraft: () => void;
  startFresh: () => void;
}

export function useDraftPersistence(): UseDraftPersistenceReturn {
  const [answers, setAnswers] = useState<WizardAnswers>(defaultWizardAnswers);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasDraft, setHasDraft] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) {
        const draft: WizardDraft = JSON.parse(stored);
        // Check if draft is recent (within 7 days)
        const draftAge = Date.now() - new Date(draft.updatedAt).getTime();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        
        if (draftAge < sevenDays && draft.version === 'v1') {
          setHasDraft(true);
        }
      }
    } catch (e) {
      console.error('Failed to check draft:', e);
    }
    setInitialized(true);
  }, []);

  // Auto-save draft on changes (after initialization)
  useEffect(() => {
    if (!initialized) return;
    
    const draft: WizardDraft = {
      answers,
      currentStepIndex,
      updatedAt: new Date().toISOString(),
      version: 'v1',
    };
    
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.error('Failed to save draft:', e);
    }
  }, [answers, currentStepIndex, initialized]);

  const updateAnswer = useCallback((key: string, value: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(RESULT_KEY);
    setAnswers(defaultWizardAnswers);
    setCurrentStepIndex(0);
    setHasDraft(false);
  }, []);

  const resumeDraft = useCallback(() => {
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) {
        const draft: WizardDraft = JSON.parse(stored);
        setAnswers(draft.answers);
        setCurrentStepIndex(draft.currentStepIndex);
        setHasDraft(false); // Clear the "resume" prompt
      }
    } catch (e) {
      console.error('Failed to resume draft:', e);
      startFresh();
    }
  }, []);

  const startFresh = useCallback(() => {
    clearDraft();
    setHasDraft(false);
  }, [clearDraft]);

  return {
    answers,
    currentStepIndex,
    hasDraft,
    setAnswers,
    setCurrentStepIndex,
    updateAnswer,
    clearDraft,
    resumeDraft,
    startFresh,
  };
}

// Save result to localStorage
export function saveWizardResult(result: unknown) {
  try {
    localStorage.setItem(RESULT_KEY, JSON.stringify(result));
  } catch (e) {
    console.error('Failed to save result:', e);
  }
}

// Load result from localStorage
export function loadWizardResult<T>(): T | null {
  try {
    const stored = localStorage.getItem(RESULT_KEY);
    if (stored) {
      return JSON.parse(stored) as T;
    }
  } catch (e) {
    console.error('Failed to load result:', e);
  }
  return null;
}
