/**
 * Hook to check the configuration status of all dashboard features
 * Used to display visual indicators showing what's configured vs pending
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAllCachedSections } from '@/lib/vaultStorage';
import { getAllCachedPlans } from '@/lib/plansStore';

export interface DashboardReadiness {
  loading: boolean;
  vault: boolean;
  plans: boolean;
  redFolder: boolean;
  backup: boolean;
  panicSetup: boolean;
}

export function useDashboardReadiness(userId: string | undefined): DashboardReadiness {
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState<Omit<DashboardReadiness, 'loading'>>({
    vault: false,
    plans: false,
    redFolder: false,
    backup: false,
    panicSetup: false,
  });

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const checkReadiness = async () => {
      setLoading(true);

      try {
        // Check all sources in parallel
        const [vaultSections, cachedPlans, backupsRes, contactsRes] = await Promise.all([
          getAllCachedSections().catch(() => []),
          getAllCachedPlans().catch(() => []),
          supabase
            .from('backups')
            .select('id')
            .eq('user_id', userId)
            .limit(1),
          supabase
            .from('panic_contacts')
            .select('id')
            .eq('user_id', userId)
            .limit(1),
        ]);

        const hasVault = vaultSections.length > 0;
        const hasPlans = cachedPlans.length >= 2; // Need both Plan A and B
        const hasBackup = (backupsRes.data?.length ?? 0) > 0;
        const hasPanicSetup = (contactsRes.data?.length ?? 0) > 0;

        setReadiness({
          vault: hasVault,
          plans: hasPlans,
          redFolder: hasVault || hasPlans, // Ready if either exists
          backup: hasBackup,
          panicSetup: hasPanicSetup,
        });
      } catch (error) {
        console.error('Error checking dashboard readiness:', error);
      } finally {
        setLoading(false);
      }
    };

    checkReadiness();
  }, [userId]);

  // Safety timeout: never stay loading for more than 5 seconds
  useEffect(() => {
    if (!loading) return;
    
    const timeout = setTimeout(() => {
      console.warn('[DashboardReadiness] Loading timeout (5s), forcing complete');
      setLoading(false);
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, [loading]);

  return {
    loading,
    ...readiness,
  };
}
