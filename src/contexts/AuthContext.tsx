import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { syncPlanFromCloud } from '@/lib/planWizard2Store';
import { clearEntitlementsCache } from '@/contexts/EntitlementsContext';

// Cache keys that need to be cleared on sign out
const ENTITLEMENTS_CACHE_KEY = 'resilient_entitlements';
const DEV_PREMIUM_KEY = 'resilient_dev_premium';

// DEV-only logging helper (no tokens/sessions logged)
const dbg = (...args: any[]) => {
  if (import.meta.env.DEV) console.log('[Auth]', ...args);
};

// Post-login sync function - runs in background
const triggerPostLoginSync = async (userId: string) => {
  dbg('triggerPostLoginSync: starting for', userId);
  
  try {
    // Sync premium plans from cloud (non-blocking)
    syncPlanFromCloud(userId).then((plan) => {
      if (plan) {
        dbg('triggerPostLoginSync: premium plan synced');
      }
    }).catch((e) => {
      console.warn('[Auth] Premium plan sync failed:', e);
    });

    // Note: Draft recovery is handled by useDraftRecovery hook in Dashboard
    // Vault sync is handled by useVaultSync hook in Vault page
    
    dbg('triggerPostLoginSync: background sync initiated');
  } catch (e) {
    console.warn('[Auth] Post-login sync error:', e);
  }
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signInWithMagicLink: (email: string, returnUrl?: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // DEV: Log Supabase project on mount
    if (import.meta.env.DEV) {
      try {
        const host = new URL(import.meta.env.VITE_SUPABASE_URL).host;
        console.log('[Auth] Supabase project:', host);
      } catch {}
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        dbg('onAuthStateChange:', { event, userId: session?.user?.id ?? null });
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle profile creation and sync after sign-in (deferred to avoid deadlock)
        if (event === 'SIGNED_IN' && session?.user) {
          // Clear entitlements cache on login to force fresh fetch
          clearEntitlementsCache();
          
          setTimeout(() => {
            // Ensure profile exists (auto-create if missing)
            ensureUserProfile(session.user.id);
            // Trigger background sync of cloud data
            triggerPostLoginSync(session.user.id);
          }, 0);
        }
      }
    );

    // THEN check for existing session and ensure profile exists
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      dbg('getSession result:', { userId: session?.user?.id ?? null, hasSession: !!session });
      
      // If session exists, ensure user profile exists (auto-create if missing)
      if (session?.user?.id) {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        // Profile missing? Auto-create instead of logout
        if (!profile && !profileError) {
          dbg('Profile missing, auto-creating for user:', session.user.id);
          const created = await ensureUserProfile(session.user.id);
          dbg('Profile auto-create result:', created);
          // Continue authenticated regardless of result
        }
        
        // Log profile check errors but DON'T sign out - keep session valid
        if (profileError) {
          console.warn('[Auth] Profile check error (continuing anyway):', profileError.message);
        }
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Ensures user profile exists - creates if missing via upsert.
   * Returns true if profile exists/was created, false on error.
   * NEVER signs out on failure - keeps session valid.
   */
  const ensureUserProfile = async (userId: string): Promise<boolean> => {
    const storedLocale = localStorage.getItem('resilient_locale') || 'en';
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          { 
            user_id: userId, 
            locale: storedLocale,
          },
          { onConflict: 'user_id', ignoreDuplicates: false } // false to ensure update
        );
      
      if (error) {
        console.error('[Auth] Profile upsert failed:', error.message);
        return false;
      }
      
      dbg('ensureUserProfile: success for', userId);
      return true;
    } catch (e) {
      console.error('[Auth] Profile upsert error:', e);
      return false;
    }
  };

/**
   * Helper to clear ALL auth-related caches from localStorage.
   * Called on sign-out to prevent stale premium/entitlement state.
   * Also clears supabase auth tokens as safety net.
   */
  const clearAuthCaches = useCallback(() => {
    try {
      localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
      localStorage.removeItem(DEV_PREMIUM_KEY);
      
      // Safety net: remove any supabase auth tokens (key format may vary)
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
          localStorage.removeItem(k);
        }
        if (k.includes('supabase') && k.includes('auth')) {
          localStorage.removeItem(k);
        }
      });
    } catch (e) {
      console.warn('[Auth] cache clear failed', e);
    }
  }, []);

  // Magic Link sign-in
  const signInWithMagicLink = useCallback(async (email: string, returnUrl?: string) => {
    const baseUrl = window.location.origin;
    const callbackUrl = returnUrl 
      ? `${baseUrl}/auth/callback?return_url=${encodeURIComponent(returnUrl)}`
      : `${baseUrl}/auth/callback`;
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl,
      },
    });
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      return { error };
    }
    return { error: null };
  }, [toast]);

  // Legacy password sign-in (kept for compatibility)
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      return { error };
    }
    return { error: null };
  }, [toast]);

  // Legacy password sign-up (kept for compatibility)
  const signUp = useCallback(async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      return { error };
    }
    return { error: null };
  }, [toast]);

/**
   * HARD logout: clears local session deterministically, even if network fails.
   * Uses scope:'local' to ensure local session is removed regardless of API.
   * Sets loading=false BEFORE redirect to ensure UI shows correct state.
   */
  const signOut = useCallback(async () => {
    dbg('signOut: initiated');
    
    // Clear user/session immediately (don't set loading=true to avoid stuck state)
    setUser(null);
    setSession(null);
    dbg('signOut: state cleared');
    
    // Clear caches BEFORE supabase call
    clearAuthCaches();
    dbg('signOut: caches cleared (pre-supabase)');
    
    // Wrap in try-catch to ensure redirect happens even if supabase fails
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      dbg('signOut: supabase result', { error: error?.message ?? null });
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
      }
    } catch (e) {
      dbg('signOut: supabase call failed', e);
    }
    
    // Clear caches AFTER as safety net
    clearAuthCaches();
    dbg('signOut: caches cleared (post-supabase)');
    
    // Set loading FALSE before redirect to ensure UI shows login button
    setLoading(false);
    dbg('signOut: loading set to false');
    
    // ALWAYS redirect - use replace to prevent back-button issues
    dbg('signOut: redirecting to /');
    window.location.replace('/');
    
    return { error: null };
  }, [toast, clearAuthCaches]);

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signInWithMagicLink,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
