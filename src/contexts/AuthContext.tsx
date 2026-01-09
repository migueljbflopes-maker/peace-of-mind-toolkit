import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Cache keys that need to be cleared on sign out
const ENTITLEMENTS_CACHE_KEY = 'resilient_entitlements';
const DEV_PREMIUM_KEY = 'resilient_dev_premium';

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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
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
   * Helper to clear all auth-related caches from localStorage.
   * Called on sign-out to prevent stale premium/entitlement state.
   */
  const clearAuthCaches = useCallback(() => {
    localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
    // Only clear dev premium in dev mode, but safe to always remove
    if (import.meta.env.DEV) {
      localStorage.removeItem(DEV_PREMIUM_KEY);
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
   * FIX #2: Robust sign-out that clears all caches and forces immediate UI update
   */
  const signOut = useCallback(async () => {
    // Clear caches BEFORE calling supabase.signOut to ensure
    // they're cleared even if signOut has issues
    clearAuthCaches();
    
    const { error } = await supabase.auth.signOut();
    
    // ALWAYS clear state immediately, regardless of error
    // This ensures UI updates even if there's a network issue
    setUser(null);
    setSession(null);
    setLoading(false);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
    
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
