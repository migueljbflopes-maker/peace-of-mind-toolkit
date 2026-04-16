/**
 * Hook to recover and sync local drafts after user login
 * Handles: risk assessments, supplies plans, wizard results
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

// Local storage keys for drafts
const DRAFT_KEYS = {
  risk: 'riskDraft_v1',
  riskResult: 'riskWizard_result_v1',
  supplies: 'resilient_supplies_quiz_draft',
  suppliesState: 'resilient_supplies_state',
} as const;

interface DraftRecoveryStatus {
  isRecovering: boolean;
  recovered: {
    riskAssessment: boolean;
    suppliesPlan: boolean;
  };
  error: string | null;
}

export function useDraftRecovery(userId: string | undefined) {
  const [status, setStatus] = useState<DraftRecoveryStatus>({
    isRecovering: false,
    recovered: {
      riskAssessment: false,
      suppliesPlan: false,
    },
    error: null,
  });
  
  // Track if we're in "should recover" state - true only when userId exists and we haven't run
  const [shouldRecover, setShouldRecover] = useState(false);
  const hasRunRef = useRef(false);

  const recoverRiskDraft = useCallback(async (userId: string): Promise<boolean> => {
    try {
      // Check for completed risk result first
      const resultJson = localStorage.getItem(DRAFT_KEYS.riskResult);
      if (!resultJson) return false;

      const result = JSON.parse(resultJson);
      if (!result.answers || !result.readinessScore) return false;

      // Check if we already have a saved assessment
      const { data: existing } = await supabase
        .from('risk_assessments')
        .select('id, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Only sync if local result is newer or no cloud data
      if (existing) {
        const cloudTime = new Date(existing.updated_at).getTime();
        const localTime = new Date(result.updatedAt || 0).getTime();
        if (cloudTime >= localTime) {
          if (import.meta.env.DEV) console.log('[DraftRecovery] Cloud risk assessment is newer, skipping sync');
          return false;
        }
      }

      // Sync the draft to cloud
      const { error } = await supabase.from('risk_assessments').upsert({
        user_id: userId,
        inputs: result.answers as Json,
        score: result.readinessScore,
        risk_level: result.riskLevel?.toLowerCase(),
        breakdown: result.breakdown as Json,
        country: result.answers?.country || null,
        city: result.answers?.city || null,
      }, { onConflict: 'user_id' });

      if (error) {
        console.error('[DraftRecovery] Risk sync failed:', error);
        return false;
      }

      if (import.meta.env.DEV) console.log('[DraftRecovery] Risk assessment synced successfully');
      // Clear local draft after successful sync
      localStorage.removeItem(DRAFT_KEYS.riskResult);
      return true;
    } catch (e) {
      console.error('[DraftRecovery] Risk recovery error:', e);
      return false;
    }
  }, []);

  const recoverSuppliesDraft = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const draftJson = localStorage.getItem(DRAFT_KEYS.supplies);
      const stateJson = localStorage.getItem(DRAFT_KEYS.suppliesState);
      
      if (!draftJson && !stateJson) return false;

      const draft = draftJson ? JSON.parse(draftJson) : null;
      const state = stateJson ? JSON.parse(stateJson) : null;

      // Need at least answers to sync
      if (!draft?.answers?.householdSize) return false;

      // Check if we already have a saved plan
      const { data: existing } = await supabase
        .from('supplies_plans')
        .select('id, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Only sync if local is newer or no cloud data
      if (existing && state?.updatedAt) {
        const cloudTime = new Date(existing.updated_at).getTime();
        const localTime = new Date(state.updatedAt).getTime();
        if (cloudTime >= localTime) {
          if (import.meta.env.DEV) console.log('[DraftRecovery] Cloud supplies plan is newer, skipping sync');
          return false;
        }
      }

      // Sync the draft to cloud
      const planData = {
        user_id: userId,
        days: draft.answers.daysTarget || 14,
        household_size_bucket: draft.answers.householdSize,
        inputs: draft.answers as Json,
        plan: { 
          checkedItems: state?.checkedItems || {}, 
          checkedHardToSource: state?.checkedHardToSource || {} 
        } as Json,
        preparedness_pct: state?.preparedness || 0,
      };

      const { error } = existing
        ? await supabase.from('supplies_plans').update(planData).eq('user_id', userId)
        : await supabase.from('supplies_plans').insert(planData);

      if (error) {
        console.error('[DraftRecovery] Supplies sync failed:', error);
        return false;
      }

      if (import.meta.env.DEV) console.log('[DraftRecovery] Supplies plan synced successfully');
      return true;
    } catch (e) {
      console.error('[DraftRecovery] Supplies recovery error:', e);
      return false;
    }
  }, []);

  const recoverDrafts = useCallback(async (userId: string) => {
    if (hasRunRef.current) {
      setShouldRecover(false);
      return;
    }
    hasRunRef.current = true;
    setShouldRecover(false);

    setStatus(prev => ({ ...prev, isRecovering: true, error: null }));

    try {
      const [riskRecovered, suppliesRecovered] = await Promise.all([
        recoverRiskDraft(userId),
        recoverSuppliesDraft(userId),
      ]);

      setStatus({
        isRecovering: false,
        recovered: {
          riskAssessment: riskRecovered,
          suppliesPlan: suppliesRecovered,
        },
        error: null,
      });

      if (riskRecovered || suppliesRecovered) {
        if (import.meta.env.DEV) console.log('[DraftRecovery] Recovery complete:', { riskRecovered, suppliesRecovered });
      }
    } catch (e) {
      console.error('[DraftRecovery] Recovery failed:', e);
      setStatus(prev => ({
        ...prev,
        isRecovering: false,
        error: e instanceof Error ? e.message : 'Recovery failed',
      }));
    }
  }, [recoverRiskDraft, recoverSuppliesDraft]);

  // Trigger recovery when userId becomes available
  useEffect(() => {
    if (userId && !hasRunRef.current) {
      setShouldRecover(true);
      recoverDrafts(userId);
    } else if (!userId) {
      // No user, ensure we're not in recovering state
      setShouldRecover(false);
      setStatus(prev => prev.isRecovering ? { ...prev, isRecovering: false } : prev);
    }
  }, [userId, recoverDrafts]);

  // Reset when user changes
  useEffect(() => {
    return () => {
      hasRunRef.current = false;
    };
  }, [userId]);

  // Safety timeout - if recovering takes more than 5 seconds, force complete
  useEffect(() => {
    if (!status.isRecovering) return;
    
    const timeout = setTimeout(() => {
      console.warn('[DraftRecovery] Recovery timeout, forcing complete');
      setStatus(prev => ({ ...prev, isRecovering: false }));
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [status.isRecovering]);

  return {
    ...status,
    recoverDrafts: useCallback(() => {
      if (userId) {
        hasRunRef.current = false;
        recoverDrafts(userId);
      }
    }, [userId, recoverDrafts]),
  };
}
