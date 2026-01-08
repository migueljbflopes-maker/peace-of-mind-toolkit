import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useAuth } from './useAuth';

const ENTITLEMENTS_CACHE_KEY = 'resilient_entitlements';
const DEV_PREMIUM_KEY = 'resilient_dev_premium';

interface Entitlements {
  isPremium: boolean;
  planName: string;
  priceEur: number;
}

const defaultEntitlements: Entitlements = {
  isPremium: false,
  planName: 'Personalized Resiliency Plan',
  priceEur: 49,
};

/**
 * Hook para gerir entitlements premium.
 * Quando user e authLoading são passados externamente, usa esses valores.
 * Caso contrário, usa useAuth() internamente (retrocompatibilidade).
 */
export function useEntitlements(externalUser?: User | null, externalAuthLoading?: boolean) {
  // Se parâmetros externos são fornecidos, usa-os; senão usa useAuth internamente
  const internalAuth = useAuth();
  const user = externalUser !== undefined ? externalUser : internalAuth.user;
  const authLoading = externalAuthLoading !== undefined ? externalAuthLoading : internalAuth.loading;
  const [entitlements, setEntitlements] = useState<Entitlements>(() => {
    // Load from cache
    const cached = localStorage.getItem(ENTITLEMENTS_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        return defaultEntitlements;
      }
    }
    return defaultEntitlements;
  });
  const [loading, setLoading] = useState(true);

  // Dev-only premium simulation
  const [devPremiumOverride, setDevPremiumOverride] = useState(() => {
    if (import.meta.env.DEV) {
      return localStorage.getItem(DEV_PREMIUM_KEY) === 'true';
    }
    return false;
  });

  const toggleDevPremium = useCallback(() => {
    if (!import.meta.env.DEV) return;
    
    const newValue = !devPremiumOverride;
    setDevPremiumOverride(newValue);
    localStorage.setItem(DEV_PREMIUM_KEY, String(newValue));
  }, [devPremiumOverride]);

  // Fetch entitlements from database
  const fetchEntitlements = useCallback(async () => {
    if (!user) {
      setEntitlements(defaultEntitlements);
      localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
      setLoading(false);
      return;
    }

    try {
      // Only select non-sensitive fields (no Stripe IDs)
      const { data, error } = await supabase
        .from('premium_entitlements')
        .select('is_premium, plan_name, price_eur')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching entitlements:', error);
      }

      const newEntitlements: Entitlements = data
        ? {
            isPremium: data.is_premium,
            planName: data.plan_name,
            priceEur: data.price_eur,
          }
        : defaultEntitlements;

      setEntitlements(newEntitlements);
      localStorage.setItem(ENTITLEMENTS_CACHE_KEY, JSON.stringify(newEntitlements));
    } catch (err) {
      console.error('Error fetching entitlements:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchEntitlements();
    }
  }, [authLoading, fetchEntitlements]);

  // Effective premium status (considering dev override)
  const isPremium = import.meta.env.DEV && devPremiumOverride ? true : entitlements.isPremium;

  return {
    ...entitlements,
    isPremium,
    loading: loading || authLoading,
    refetch: fetchEntitlements,
    // Dev-only
    devPremiumOverride,
    toggleDevPremium,
    isDevMode: import.meta.env.DEV,
  };
}
