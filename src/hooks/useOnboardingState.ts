/**
 * Hook for managing premium onboarding state
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OnboardingState {
  completed: boolean;
  step: number;
  updatedAt: string | null;
}

export function useOnboardingState(userId?: string) {
  const [state, setState] = useState<OnboardingState>({ completed: false, step: 1, updatedAt: null });
  const [loading, setLoading] = useState(true);

  // Fetch onboarding state
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchState = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('onboarding_state')
        .select('completed, step, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching onboarding state:', error);
      }

      if (data) {
        setState({
          completed: data.completed,
          step: data.step,
          updatedAt: data.updated_at,
        });
      } else {
        // No onboarding state exists yet
        setState({ completed: false, step: 1, updatedAt: null });
      }
      setLoading(false);
    };

    fetchState();
  }, [userId]);

  // Update step
  const setStep = useCallback(async (step: number) => {
    if (!userId) return false;

    const { error } = await supabase
      .from('onboarding_state')
      .upsert({
        user_id: userId,
        step,
        completed: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Error updating onboarding step:', error);
      return false;
    }

    setState(prev => ({ ...prev, step, completed: false }));
    return true;
  }, [userId]);

  // Mark as completed
  const markCompleted = useCallback(async () => {
    if (!userId) return false;

    const { error } = await supabase
      .from('onboarding_state')
      .upsert({
        user_id: userId,
        step: 4,
        completed: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Error marking onboarding complete:', error);
      return false;
    }

    setState({ completed: true, step: 4, updatedAt: new Date().toISOString() });
    return true;
  }, [userId]);

  return {
    ...state,
    loading,
    setStep,
    markCompleted,
    needsOnboarding: !state.completed && !loading,
  };
}
