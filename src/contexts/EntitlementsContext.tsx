import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

  // Fetch entitlements from database with timeout protection and session verification
  const fetchEntitlements = useCallback(async (userId?: string) => {
    const targetUserId = userId ?? user?.id;
    dbg('fetchEntitlements called:', { targetUserId });
    
    if (!targetUserId) {
      dbg('No user, resetting to defaults');
      setEntitlements(defaultEntitlements);
      localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
      setLoading(false);
      return;
    }

    // CRITICAL: Verify session is established in Supabase client before querying
    // This prevents RLS failures when auth.uid() is not yet available
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      dbg('Session error, cannot query:', sessionError.message);
      setLoading(false);
      return;
    }
    
    if (!session) {
      dbg('No valid session for query, RLS would fail');
      setLoading(false);
      return;
    }
    
    // Verify session matches target user to prevent cross-user queries
    if (session.user.id !== targetUserId) {
      dbg('Session user mismatch, skipping fetch:', {
        sessionUser: session.user.id,
        targetUser: targetUserId
      });
      setLoading(false);
      return;
    }

    dbg('Session verified, fetching from DB for user:', targetUserId);
    
    // Timeout promise to prevent infinite loading
    const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) => {
      setTimeout(() => {
        resolve({ 
          data: null, 
          error: new Error('Entitlements fetch timeout after 10s') 
        });
      }, 10000);
    });

    try {
      // Only select non-sensitive fields (no Stripe IDs)
      const queryPromise = supabase
        .from('premium_entitlements')
        .select('is_premium, plan_name, price_eur')
        .eq('user_id', targetUserId)
        .maybeSingle();

      // Race between query and timeout
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      dbg('DB result:', { data, error: error?.message ?? null });

      if (error) {
        // DEV-only: log RLS or other errors for debugging
        if (import.meta.env.DEV) {
          console.error('[Entitlements] select failed', error);
        }
        // On error/timeout, keep existing state but stop loading
        setLoading(false);
        return;
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
        userId: targetUserId,
        cachedAt: Date.now(),
        ...newEntitlements,
      };
      localStorage.setItem(ENTITLEMENTS_CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.error('[Entitlements] fetch error:', err);
      setEntitlements(defaultEntitlements);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Track if initial fetch has been done
  const hasFetchedRef = useRef(false);

  // Main effect: Handle auth state changes with cache validation
  useEffect(() => {
    dbg('Effect triggered:', { 
      authLoading, 
      currentUserId: user?.id ?? null, 
      previousUserId: lastUserIdRef.current,
      hasFetched: hasFetchedRef.current
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
      hasFetchedRef.current = false;
      return;
    }

    // Case 2: No user (initial state or after sign out)
    if (currentUserId === null) {
      dbg('CASE 2: No user');
      setEntitlements(defaultEntitlements);
      localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
      setLoading(false);
      lastUserIdRef.current = null;
      hasFetchedRef.current = false;
      return;
    }

    // Case 3: User changed or first load (different user signed in)
    if (currentUserId !== previousUserId) {
      dbg('CASE 3: User changed or first load, validating cache...');
      
      let cacheValid = false;
      
      // Validate cache userId matches current user
      try {
        const cached = localStorage.getItem(ENTITLEMENTS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as CachedEntitlements;
          if (parsed.userId !== currentUserId) {
            dbg('Cache userId mismatch, clearing:', { cached: parsed.userId, current: currentUserId });
            localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
          } else {
            // Cache is valid - use cached values immediately and STOP LOADING
            dbg('Using valid cached entitlements, stopping loading');
            setEntitlements({
              isPremium: parsed.isPremium,
              planName: parsed.planName,
              priceEur: parsed.priceEur,
            });
            setLoading(false); // CRITICAL: Stop loading immediately with cache
            cacheValid = true;
          }
        }
      } catch {
        localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
      }
      
      lastUserIdRef.current = currentUserId;
      hasFetchedRef.current = true;
      
      // Small delay to ensure Supabase session is fully synchronized before querying
      // This prevents race conditions where auth.uid() returns NULL in RLS checks
      setTimeout(() => {
        dbg('Delayed fetch triggered for user:', currentUserId);
        fetchEntitlements(currentUserId);
      }, 150);
      return;
    }

    // Case 4: Same user, already fetched - ensure loading is false
    dbg('CASE 4: Same user, setting loading false');
    setLoading(false);

  }, [authLoading, user, fetchEntitlements]);

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
    refetch: fetchEntitlements,
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
