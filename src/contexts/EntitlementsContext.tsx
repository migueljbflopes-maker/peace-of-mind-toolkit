import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Session } from '@supabase/supabase-js';

const ENTITLEMENTS_CACHE_KEY = 'resilient_entitlements';
const DEV_PREMIUM_KEY = 'resilient_dev_premium';

// DEV-only logging helper
const dbg = (...args: any[]) => {
  if (import.meta.env.DEV) console.log('[Entitlements]', ...args);
};

interface Entitlements {
  isPremium: boolean;
  planName: string;
  priceEur: number;
}

// Cached entitlements with userId scoping to prevent stale data across user switches
interface CachedEntitlements {
  userId: string;
  cachedAt: number;
  isPremium: boolean;
  planName: string;
  priceEur: number;
}

const defaultEntitlements: Entitlements = {
  isPremium: false,
  planName: 'Personalized Resiliency Plan',
  priceEur: 49,
};

interface EntitlementsContextType extends Entitlements {
  loading: boolean;
  refetch: () => Promise<void>;
  devPremiumOverride: boolean;
  toggleDevPremium: () => void;
  isDevMode: boolean;
}

const EntitlementsContext = createContext<EntitlementsContextType | undefined>(undefined);

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const { user, session, loading: authLoading } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlements>(defaultEntitlements);
  const [loading, setLoading] = useState(true);
  
  // Track last user ID to detect user changes
  const lastUserIdRef = useRef<string | null>(null);
  // Track if a fetch is currently in progress
  const fetchInProgressRef = useRef(false);

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
  const fetchEntitlements = useCallback(async (currentSession: Session | null) => {
    dbg('fetchEntitlements called:', { userId: user?.id ?? null, hasSession: !!currentSession });
    
    if (!user || !currentSession) {
      dbg('No user or session, resetting to defaults');
      setEntitlements(defaultEntitlements);
      localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
      setLoading(false);
      fetchInProgressRef.current = false;
      return;
    }

    // Mark fetch as in progress
    fetchInProgressRef.current = true;
    setLoading(true);
    dbg('Fetching from DB for user:', user.id);
    
    try {
      // Create a timeout promise to prevent indefinite hanging
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => {
        setTimeout(() => {
          resolve({ data: null, error: new Error('Query timeout after 10 seconds') });
        }, 10000);
      });

      // Create the actual query promise
      const queryPromise = supabase
        .from('premium_entitlements')
        .select('is_premium, plan_name, price_eur')
        .eq('user_id', user.id)
        .maybeSingle();

      // Race between query and timeout
      const result = await Promise.race([queryPromise, timeoutPromise]);
      const { data, error } = result;

      dbg('DB result:', { data, error: error?.message ?? null });

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

      dbg('Final state:', newEntitlements);
      setEntitlements(newEntitlements);
      
      // Save cache with userId scoping
      const cacheData: CachedEntitlements = {
        userId: user.id,
        cachedAt: Date.now(),
        ...newEntitlements,
      };
      localStorage.setItem(ENTITLEMENTS_CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.error('[Entitlements] fetch error:', err);
      setEntitlements(defaultEntitlements);
    } finally {
      fetchInProgressRef.current = false;
      setLoading(false);
    }
  }, [user]);

  // Wrapper for refetch that uses current session
  const refetch = useCallback(async () => {
    await fetchEntitlements(session);
  }, [fetchEntitlements, session]);

  // Main effect: Handle auth state changes with cache validation
  useEffect(() => {
    dbg('Effect triggered:', { 
      authLoading, 
      currentUserId: user?.id ?? null, 
      previousUserId: lastUserIdRef.current 
    });

    // Wait for auth to finish loading
    if (authLoading) {
      dbg('Auth still loading, waiting...');
      return;
    }

    const currentUserId = user?.id ?? null;
    const previousUserId = lastUserIdRef.current;

    // Case 1: User signed out (was logged in, now null)
    if (previousUserId !== null && currentUserId === null) {
      dbg('CASE 1: User signed out');
      setEntitlements(defaultEntitlements);
      localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
      setLoading(false);
      lastUserIdRef.current = null;
      return;
    }

    // Case 2: No user (initial state or after sign out)
    if (currentUserId === null) {
      dbg('CASE 2: No user');
      setEntitlements(defaultEntitlements);
      localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
      setLoading(false);
      lastUserIdRef.current = null;
      return;
    }

    // Case 3: User changed or first load (different user signed in)
    if (currentUserId !== previousUserId) {
      dbg('CASE 3: User changed or first load, validating cache...');
      
      // Validate cache userId matches current user
      try {
        const cached = localStorage.getItem(ENTITLEMENTS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as CachedEntitlements;
          if (parsed.userId !== currentUserId) {
            dbg('Cache userId mismatch, clearing:', { cached: parsed.userId, current: currentUserId });
            localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
          }
        }
      } catch {
        localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
      }
      
      lastUserIdRef.current = currentUserId;
      fetchEntitlements(session);
      return;
    }

    // Case 4: Same user, already loaded - ensure loading is false only if no fetch in progress
    // This can happen on re-renders after fetchEntitlements completed
    dbg('CASE 4: Same user, fetch in progress:', fetchInProgressRef.current);
    if (loading && !fetchInProgressRef.current) {
      dbg('No fetch in progress but loading is true, setting to false');
      setLoading(false);
    }

  }, [authLoading, user, session, fetchEntitlements, loading]);

  // Effective premium status (considering dev override)
  const isPremium = import.meta.env.DEV && devPremiumOverride ? true : entitlements.isPremium;
  const combinedLoading = authLoading || loading;

  dbg('Returning:', { 
    isPremium, 
    loading: combinedLoading,
    devPremiumOverride,
    rawIsPremium: entitlements.isPremium
  });

  const value: EntitlementsContextType = {
    ...entitlements,
    isPremium,
    loading: combinedLoading,
    refetch,
    devPremiumOverride,
    toggleDevPremium,
    isDevMode: import.meta.env.DEV,
  };

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  const context = useContext(EntitlementsContext);
  if (context === undefined) {
    throw new Error('useEntitlements must be used within an EntitlementsProvider');
  }
  return context;
}
