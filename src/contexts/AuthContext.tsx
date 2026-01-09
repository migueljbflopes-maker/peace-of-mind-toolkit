import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Cache keys that need to be cleared on sign out
const ENTITLEMENTS_CACHE_KEY = 'resilient_entitlements';
const DEV_PREMIUM_KEY = 'resilient_dev_premium';

// DEV-only logging helper (no tokens/sessions logged)
const dbg = (...args: any[]) => {
  if (import.meta.env.DEV) console.log('[Auth]', ...args);
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
        
        // Handle profile upsert after sign-in (deferred to avoid deadlock)
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            upsertUserProfile(session.user.id);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      dbg('getSession result:', { userId: session?.user?.id ?? null, hasSession: !!session });
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Upsert user profile with locale from localStorage fallback
  const upsertUserProfile = async (userId: string) => {
    const storedLocale = localStorage.getItem('resilient_locale') || 'en';
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          { 
            user_id: userId, 
            locale: storedLocale,
          },
          { onConflict: 'user_id', ignoreDuplicates: true }
        );
      
      if (error && !error.message.includes('duplicate')) {
        console.error('Failed to upsert user profile:', error);
      }
    } catch (e) {
      console.error('Profile upsert error:', e);
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
   * Keeps loading=true during process to prevent UI flicker.
   */
  const signOut = useCallback(async () => {
    dbg('signOut: initiated');
    
    // Keep loading TRUE during signout to prevent UI inconsistencies
    setLoading(true);
    
    // Clear user/session immediately
    setUser(null);
    setSession(null);
    dbg('signOut: state cleared (user/session null)');
    
    // Clear caches BEFORE supabase call
    clearAuthCaches();
    dbg('signOut: caches cleared (pre-supabase)');
    
    // Use scope:'local' to ensure local session cleared even if network fails
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    dbg('signOut: supabase result', { error: error?.message ?? null });
    
    // Clear caches AFTER as well (belt and suspenders)
    clearAuthCaches();
    dbg('signOut: caches cleared (post-supabase)');
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
    
    // Force reload to clear any stale in-memory state - ALWAYS redirect
    dbg('signOut: redirecting to /');
    window.location.assign('/');
    
    return { error };
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
