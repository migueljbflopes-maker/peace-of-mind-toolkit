/**
 * Plans sync hook - handles syncing encrypted plans between local cache and Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { 
  getCachedPlan, 
  getAllCachedPlans, 
  savePlanToCache, 
  markPlanSynced,
  getUnsyncedPlans,
  PlanCache,
  PlanType 
} from '@/lib/plansStore';
import { EncryptedPayload } from '@/lib/crypto';

export interface PlanStatus {
  planType: PlanType;
  hasData: boolean;
  updatedAt: string | null;
  isSynced: boolean;
  status: 'not_started' | 'draft' | 'updated';
}

export function usePlansSync() {
  const { user, isAuthenticated } = useAuth();
  const { isPremium } = useEntitlements();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [planStatuses, setPlanStatuses] = useState<PlanStatus[]>([]);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load plan statuses from local cache
  const loadPlanStatuses = useCallback(async () => {
    const cached = await getAllCachedPlans();
    const statuses: PlanStatus[] = (['A', 'B'] as PlanType[]).map(planType => {
      const planCache = cached.find(c => c.planType === planType);
      const hasData = !!planCache;
      const isSynced = planCache 
        ? (planCache.syncedAt !== null && new Date(planCache.syncedAt) >= new Date(planCache.updatedAt)) 
        : true;
      
      let status: 'not_started' | 'draft' | 'updated' = 'not_started';
      if (hasData) {
        status = isSynced ? 'updated' : 'draft';
      }
      
      return {
        planType,
        hasData,
        updatedAt: planCache?.updatedAt || null,
        isSynced,
        status,
      };
    });
    setPlanStatuses(statuses);
    
    const unsynced = await getUnsyncedPlans();
    setHasUnsyncedChanges(unsynced.length > 0);
  }, []);

  useEffect(() => {
    loadPlanStatuses();
  }, [loadPlanStatuses]);

  // Get plan data from local cache
  const getPlan = useCallback(async (planType: PlanType): Promise<PlanCache | null> => {
    return getCachedPlan(planType);
  }, []);

  // Save plan locally and sync to Supabase if online
  const savePlan = useCallback(async (
    planType: PlanType, 
    payload: EncryptedPayload
  ): Promise<{ savedLocally: boolean; synced: boolean }> => {
    // Always save to local cache first
    await savePlanToCache(planType, payload, null);
    
    let synced = false;
    
    // Sync to Supabase if online and authenticated
    if (isOnline && isAuthenticated && isPremium && user) {
      try {
        const { error } = await supabase
          .from('plan_items')
          .upsert({
            user_id: user.id,
            plan_type: planType,
            ciphertext: payload.ciphertextB64,
            iv: payload.ivB64,
            salt: payload.saltB64,
            version: payload.version,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,plan_type',
          });
        
        if (!error) {
          await markPlanSynced(planType);
          synced = true;
        }
      } catch {
        // Sync failed, will retry later
      }
    }
    
    await loadPlanStatuses();
    return { savedLocally: true, synced };
  }, [isOnline, isAuthenticated, isPremium, user, loadPlanStatuses]);

  // Sync from Supabase to local cache
  const syncFromCloud = useCallback(async (): Promise<boolean> => {
    if (!isOnline || !isAuthenticated || !isPremium || !user) return false;
    
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('plan_items')
        .select('plan_type, ciphertext, iv, salt, version, updated_at')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      for (const item of data || []) {
        const cached = await getCachedPlan(item.plan_type as PlanType);
        
        // If cloud is newer, update local cache
        if (!cached || new Date(item.updated_at) > new Date(cached.updatedAt)) {
          const payload: EncryptedPayload = {
            ciphertextB64: item.ciphertext,
            ivB64: item.iv,
            saltB64: item.salt,
            version: item.version,
          };
          await savePlanToCache(item.plan_type as PlanType, payload, item.updated_at);
        }
      }
      
      await loadPlanStatuses();
      return true;
    } catch {
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isAuthenticated, isPremium, user, loadPlanStatuses]);

  // Sync local changes to cloud
  const syncToCloud = useCallback(async (): Promise<boolean> => {
    if (!isOnline || !isAuthenticated || !isPremium || !user) return false;
    
    setIsSyncing(true);
    try {
      const unsynced = await getUnsyncedPlans();
      
      for (const cached of unsynced) {
        const { error } = await supabase
          .from('plan_items')
          .upsert({
            user_id: user.id,
            plan_type: cached.planType,
            ciphertext: cached.ciphertextB64,
            iv: cached.ivB64,
            salt: cached.saltB64,
            version: cached.version,
            updated_at: cached.updatedAt,
          }, {
            onConflict: 'user_id,plan_type',
          });
        
        if (!error) {
          await markPlanSynced(cached.planType);
        }
      }
      
      await loadPlanStatuses();
      return true;
    } catch {
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isAuthenticated, isPremium, user, loadPlanStatuses]);

  // Full sync (both directions)
  const sync = useCallback(async (): Promise<boolean> => {
    await syncFromCloud();
    await syncToCloud();
    return true;
  }, [syncFromCloud, syncToCloud]);

  return {
    isOnline,
    isSyncing,
    planStatuses,
    hasUnsyncedChanges,
    getPlan,
    savePlan,
    sync,
    syncFromCloud,
    syncToCloud,
    refresh: loadPlanStatuses,
  };
}
