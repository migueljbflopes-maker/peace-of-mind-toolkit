/**
 * DEV-only debug panel for auth and entitlements troubleshooting.
 * Shows current auth state, entitlements, cache info, and action buttons.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp, RefreshCw, Trash2, LogOut, Bug, Zap } from 'lucide-react';

// Only render in DEV mode
if (!import.meta.env.DEV) {
  throw new Error('AuthDebugPanel should only be imported in DEV mode');
}

const ENTITLEMENTS_CACHE_KEY = 'resilient_entitlements';
const DEV_PREMIUM_KEY = 'resilient_dev_premium';

interface CacheInfo {
  exists: boolean;
  userId?: string;
  isPremium?: boolean;
  cachedAt?: string;
  raw?: string;
}

function getCacheInfo(): CacheInfo {
  try {
    const raw = localStorage.getItem(ENTITLEMENTS_CACHE_KEY);
    if (!raw) return { exists: false };
    
    const parsed = JSON.parse(raw);
    return {
      exists: true,
      userId: parsed.userId ?? '(legacy format)',
      isPremium: parsed.isPremium,
      cachedAt: parsed.cachedAt 
        ? new Date(parsed.cachedAt).toLocaleTimeString() 
        : '(legacy format)',
      raw: raw.substring(0, 100) + (raw.length > 100 ? '...' : ''),
    };
  } catch {
    return { exists: false };
  }
}

export default function AuthDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo>(() => getCacheInfo());
  
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth();
  const { 
    isPremium, 
    planName, 
    priceEur, 
    loading: entLoading, 
    refetch,
    devPremiumOverride,
    toggleDevPremium,
  } = useEntitlements();

  // Get Supabase host
  const supabaseHost = (() => {
    try {
      return new URL(import.meta.env.VITE_SUPABASE_URL).host;
    } catch {
      return 'unknown';
    }
  })();

  // Refresh cache info periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCacheInfo(getCacheInfo());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefetch = async () => {
    await refetch();
    setCacheInfo(getCacheInfo());
  };

  const handleClearCache = () => {
    localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
    localStorage.removeItem(DEV_PREMIUM_KEY);
    setCacheInfo(getCacheInfo());
  };

  const handleForceRefresh = async () => {
    // Clear all caches
    localStorage.removeItem(ENTITLEMENTS_CACHE_KEY);
    localStorage.removeItem(DEV_PREMIUM_KEY);
    setCacheInfo(getCacheInfo());
    // Force refetch from database
    await refetch();
    setCacheInfo(getCacheInfo());
  };

  const handleForceSignOut = async () => {
    await signOut();
  };

  const StatusDot = ({ ok, loading }: { ok: boolean; loading?: boolean }) => (
    <span 
      className={`inline-block w-2 h-2 rounded-full ${
        loading ? 'bg-yellow-500 animate-pulse' : ok ? 'bg-green-500' : 'bg-red-500'
      }`}
    />
  );

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-mono text-xs">
      <Card className="bg-background/95 backdrop-blur border-2 border-primary/30 shadow-lg overflow-hidden max-w-sm">
        {/* Header - always visible */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-2 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-primary" />
            <span className="font-semibold text-primary">Auth Debug</span>
            <StatusDot ok={isAuthenticated} loading={authLoading} />
            <StatusDot ok={isPremium} loading={entLoading} />
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Expanded content */}
        {isOpen && (
          <div className="p-3 border-t border-border space-y-3">
            {/* Supabase Host */}
            <div>
              <div className="text-muted-foreground mb-1">Supabase Host</div>
              <div className="text-foreground break-all">{supabaseHost}</div>
            </div>

            {/* Auth State */}
            <div>
              <div className="text-muted-foreground mb-1">Auth State</div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <StatusDot ok={!authLoading} loading={authLoading} />
                  <span>authLoading: {String(authLoading)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusDot ok={isAuthenticated} />
                  <span>isAuthenticated: {String(isAuthenticated)}</span>
                </div>
                <div className="text-foreground">
                  user.id: {user?.id?.substring(0, 8) ?? 'null'}...
                </div>
                <div className="text-foreground truncate">
                  user.email: {user?.email ?? 'null'}
                </div>
              </div>
            </div>

            {/* Entitlements State */}
            <div>
              <div className="text-muted-foreground mb-1">Entitlements State</div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <StatusDot ok={!entLoading} loading={entLoading} />
                  <span>entLoading: {String(entLoading)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusDot ok={isPremium} />
                  <span className={isPremium ? 'text-green-600' : 'text-foreground'}>
                    isPremium: {String(isPremium)}
                  </span>
                </div>
                <div className="text-foreground">planName: {planName}</div>
                <div className="text-foreground">priceEur: €{priceEur}</div>
                <div className="flex items-center gap-2">
                  <span>devPremiumOverride: {String(devPremiumOverride)}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 px-1 text-xs"
                    onClick={toggleDevPremium}
                  >
                    toggle
                  </Button>
                </div>
              </div>
            </div>

            {/* Cache Info */}
            <div>
              <div className="text-muted-foreground mb-1">Cache (resilient_entitlements)</div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <StatusDot ok={cacheInfo.exists} />
                  <span>exists: {String(cacheInfo.exists)}</span>
                </div>
                {cacheInfo.exists && (
                  <>
                    <div className="text-foreground">
                      cached.userId: {cacheInfo.userId?.substring(0, 8)}...
                    </div>
                    <div className="text-foreground">
                      cached.isPremium: {String(cacheInfo.isPremium)}
                    </div>
                    <div className="text-foreground">
                      cached.cachedAt: {cacheInfo.cachedAt}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <Button 
                variant="default" 
                size="sm" 
                className="h-7 text-xs gap-1 bg-primary"
                onClick={handleForceRefresh}
              >
                <Zap className="h-3 w-3" />
                Force Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs gap-1"
                onClick={handleRefetch}
              >
                <RefreshCw className="h-3 w-3" />
                Refetch
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs gap-1"
                onClick={handleClearCache}
              >
                <Trash2 className="h-3 w-3" />
                Clear Cache
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                onClick={handleForceSignOut}
              >
                <LogOut className="h-3 w-3" />
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
