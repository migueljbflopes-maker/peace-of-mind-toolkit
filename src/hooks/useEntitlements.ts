import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
 * Usa o AuthContext global para garantir estado consistente.
 * 
 * FIX #1: Robust handling of user changes and sign-out:
 * - Clears cache and resets state when user changes or signs out
 * - Uses useRef to track last user ID for change detection
 * - Only fetches after auth is stable
 */
export function useEntitlements() {
  const { user, loading: authLoading } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlements>(defaultEntitlements);
  const [loading, setLoading] = useState(true);
  
  // Track last user ID to detect user changes
  const lastUserIdRef = useRef<string | null>(null);

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

    setLoading(true);
    try {
      // Only select non-sensitive fields (no Stripe IDs)
      const { data, error } = await supabase
        .from('premium_entitlements')
        .select('is_premium, plan_name, price_eur')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        // DEV-only: log RLS or other errors for debugging
        if (import.meta.env.DEV) {
          console.error('[Entitlements] select failed', error);
        }
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
      console.error('[Entitlements] fetch error:', err);
      setEntitlements(defaultEntitlements);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Main effect: Handle auth state changes
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    const currentUserId = user?.id ?? null;
    const previousUserId = lastUserIdRef.current;

    // Case 1: User signed out (was logged in, now null)
    if (previousUserId !== null && currentUserId === null) {
      // Clear everything immediately
      setEntitlements(defaultEntitlements);
      localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
      setLoading(false);
      lastUserIdRef.current = null;
      return;
    }

    // Case 2: No user (initial state or after sign out)
    if (currentUserId === null) {
      setEntitlements(defaultEntitlements);
      localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
      setLoading(false);
      lastUserIdRef.current = null;
      return;
    }

    // Case 3: User changed (different user signed in)
    if (currentUserId !== previousUserId) {
      // Clear cache for previous user before fetching
      localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
      lastUserIdRef.current = currentUserId;
      fetchEntitlements();
      return;
    }

    // Case 4: Same user, already loaded - no action needed
    // (this handles re-renders without refetching)

  }, [authLoading, user, fetchEntitlements]);

  // Effective premium status (considering dev override)
  const isPremium = import.meta.env.DEV && devPremiumOverride ? true : entitlements.isPremium;

  return {
    ...entitlements,
    isPremium,
    // Combined loading: true if auth OR entitlements are loading
    loading: authLoading || loading,
    refetch: fetchEntitlements,
    // Dev-only
    devPremiumOverride,
    toggleDevPremium,
    isDevMode: import.meta.env.DEV,
  };
}
