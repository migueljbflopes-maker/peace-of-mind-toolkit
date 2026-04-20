import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ENTITLEMENTS_CACHE_KEY = 'resilient_entitlements';
const DEV_PREMIUM_KEY = 'resilient_dev_premium';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache expiration

// DEV-only logging helper
// TEMP: forced ON for diagnostic — remove the `|| true` once the loading bug is fixed
const dbg = (...args: any[]) => {
  if (import.meta.env.DEV || true) console.log('[Entitlements]', ...args);
};

interface Entitlements {
  isPremium: boolean;
  planName: string;
  priceEur: number;
}

// Cached entitlements with userId scoping and timestamp for expiration
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
  refetch: (userId?: string) => Promise<void>;
  invalidateAndRefetch: () => Promise<void>;
  devPremiumOverride: boolean;
  toggleDevPremium: () => void;
  isDevMode: boolean;
}

const EntitlementsContext = createContext<EntitlementsContextType | undefined>(undefined);

/**
 * Check if cached entitlements are valid (correct user & not expired)
 */
const getValidCache = (userId: string): CachedEntitlements | null => {
  try {
    const cached = localStorage.getItem(ENTITLEMENTS_CACHE_KEY);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached) as CachedEntitlements;
    
    // Check userId match
    if (parsed.userId !== userId) {
      dbg('Cache userId mismatch:', { cached: parsed.userId, current: userId });
      localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
      return null;
    }
    
    // Check expiration
    const age = Date.now() - parsed.cachedAt;
    if (age > CACHE_TTL_MS) {
      dbg('Cache expired:', { age: Math.round(age / 1000) + 's', ttl: Math.round(CACHE_TTL_MS / 1000) + 's' });
      localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
      return null;
    }
    
    return parsed;
  } catch {
    localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
    return null;
  }
};

/**
 * Clear entitlements cache
 */
export const clearEntitlementsCache = () => {
  dbg('Clearing entitlements cache');
  localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
};

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

  /**
   * Wait for session with exponential backoff retries
   * Returns session or null if all retries exhausted
   */
  const waitForSession = async (targetUserId: string, maxRetries = 3): Promise<boolean> => {
    const backoffDelays = [200, 600, 1200]; // ms
    dbg('waitForSession START', { targetUserId, maxRetries });

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let session: any = null;
      let error: any = null;
      try {
        const result = await supabase.auth.getSession();
        session = result.data?.session ?? null;
        error = result.error ?? null;
      } catch (e) {
        dbg('waitForSession getSession THREW on attempt', attempt, e);
        error = e;
      }

      dbg('waitForSession attempt', attempt, {
        hasSession: !!session,
        sessionUserId: session?.user?.id ?? null,
        targetUserId,
        match: session?.user?.id === targetUserId,
        errorMsg: error?.message ?? null,
      });

      if (error) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, backoffDelays[attempt] || 1200));
          continue;
        }
        dbg('waitForSession FAIL: error after all retries');
        return false;
      }

      if (session && session.user.id === targetUserId) {
        dbg('waitForSession OK on attempt', attempt);
        return true;
      }

      if (attempt < maxRetries) {
        dbg('waitForSession not ready, retry', attempt + 1, 'after', backoffDelays[attempt], 'ms');
        await new Promise(r => setTimeout(r, backoffDelays[attempt] || 1200));
      }
    }

    dbg('waitForSession FAIL: never matched after', maxRetries, 'retries');
    return false;
  };

  // Fetch entitlements from database with retry logic
  const fetchEntitlements = useCallback(async (userId?: string, skipCacheWrite = false) => {
    const targetUserId = userId ?? user?.id;
    dbg('fetchEntitlements called:', { targetUserId, skipCacheWrite });
    
    if (!targetUserId) {
      dbg('No user, resetting to defaults');
      setEntitlements(defaultEntitlements);
      localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
      setLoading(false);
      return;
    }

    // Wait for session with retries - DON'T write false cache if session unavailable
    const sessionReady = await waitForSession(targetUserId);
    
    if (!sessionReady) {
      dbg('Session not ready after retries - keeping current state, NOT writing false cache');
      // Don't set entitlements to default - keep whatever we have (or cache)
      // This prevents transient failures from marking user as non-premium
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
        // On error/timeout, keep existing state but stop loading - DON'T write false cache
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
      
      // Save cache with userId scoping (unless skipCacheWrite)
      if (!skipCacheWrite) {
        const cacheData: CachedEntitlements = {
          userId: targetUserId,
          cachedAt: Date.now(),
          ...newEntitlements,
        };
        localStorage.setItem(ENTITLEMENTS_CACHE_KEY, JSON.stringify(cacheData));
      }
    } catch (err) {
      console.error('[Entitlements] fetch error:', err);
      // On catch, DON'T reset to default - keep existing state
      dbg('Fetch error, keeping existing state');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  /**
   * Invalidate cache and immediately refetch from server
   * Use after login, purchase success, claim, etc.
   */
  const invalidateAndRefetch = useCallback(async () => {
    dbg('invalidateAndRefetch called');
    clearEntitlementsCache();
    setLoading(true);
    await fetchEntitlements(user?.id, false);
  }, [fetchEntitlements, user?.id]);

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
      
      // Check if we have valid (non-expired) cache for this user BEFORE clearing
      const validCache = getValidCache(currentUserId);
      
      if (validCache) {
        // Cache is valid - use cached values immediately and STOP LOADING
        dbg('Using valid cached entitlements, stopping loading');
        setEntitlements({
          isPremium: validCache.isPremium,
          planName: validCache.planName,
          priceEur: validCache.priceEur,
        });
        setLoading(false); // CRITICAL: Stop loading immediately with cache
      } else {
        // No valid cache - clear any stale cache for other users
        clearEntitlementsCache();
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
    invalidateAndRefetch,
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
