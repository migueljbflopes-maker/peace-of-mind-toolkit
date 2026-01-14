import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Shield,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocale } from '@/i18n/useLocale';
import { usePreparednessJourney } from '@/hooks/usePreparednessJourney';
import { useDraftRecovery } from '@/hooks/useDraftRecovery';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { PreparednessJourney } from '@/components/dashboard/PreparednessJourney';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { toast } from 'sonner';


export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLocale();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { isPremium, loading: entitlementsLoading, refetch, devPremiumOverride, toggleDevPremium, isDevMode } = useEntitlements();
  
  // Preparedness Journey hook
  const journey = usePreparednessJourney(user?.id, isPremium);
  
  // Draft recovery hook - syncs local drafts to cloud after login
  const { isRecovering, recovered } = useDraftRecovery(user?.id);
  
  
  // Purchase confirmation state
  const [purchaseConfirming, setPurchaseConfirming] = useState(false);
  const [purchaseTimedOut, setPurchaseTimedOut] = useState(false);

  // Handle successful purchase redirect with instant verification + fallback polling
  useEffect(() => {
    const purchaseStatus = searchParams.get('purchase');
    const sessionId = searchParams.get('session_id');
    
    // Only trigger when we have purchase=success AND entitlements are done loading
    if (purchaseStatus !== 'success' || entitlementsLoading) return;

    // Clear the URL params immediately
    setSearchParams({}, { replace: true });
    
    // If already premium, just show success
    if (isPremium) {
      toast.success("Welcome to Premium!", {
        description: "Your purchase was successful. Enjoy your new features!",
      });
      return;
    }

    // Start confirmation flow
    setPurchaseConfirming(true);
    setPurchaseTimedOut(false);

    const verifyAndConfirm = async () => {
      // Try instant verification if we have session_id
      if (sessionId) {
        try {
          const { data, error } = await supabase.functions.invoke('stripe-verify-session', {
            body: { session_id: sessionId },
          });

          if (!error && data?.is_premium) {
            await refetch();
            setPurchaseConfirming(false);
            toast.success("Premium unlocked!", {
              description: "Your purchase was successful. Enjoy your new features!",
            });
            return;
          }
        } catch (err) {
          console.warn("Instant verification failed, falling back to polling", err);
        }
      }

      // Fallback: poll for premium status (capped at 10 seconds)
      let pollCount = 0;
      const maxPolls = 5; // 5 polls × 2s = 10 seconds
      const pollInterval = 2000;

      const pollTimer = setInterval(async () => {
        pollCount++;
        await refetch();
        
        // Check if premium is now active
        const { data } = await supabase
          .from('premium_entitlements')
          .select('is_premium')
          .eq('user_id', user?.id ?? '')
          .maybeSingle();

        if (data?.is_premium) {
          clearInterval(pollTimer);
          setPurchaseConfirming(false);
          toast.success("Welcome to Premium!", {
            description: "Your purchase was successful. Enjoy your new features!",
          });
          refetch();
          return;
        }

        if (pollCount >= maxPolls) {
          clearInterval(pollTimer);
          setPurchaseConfirming(false);
          setPurchaseTimedOut(true);
        }
      }, pollInterval);
    };

    verifyAndConfirm();
  }, [searchParams, setSearchParams, user?.id, isPremium, entitlementsLoading, refetch]);

  const handleRetryConfirmation = async () => {
    setPurchaseTimedOut(false);
    await refetch();
    
    if (isPremium) {
      toast.success("Premium activated!", {
        description: "Your premium status is now confirmed.",
      });
    } else {
      setPurchaseTimedOut(true);
    }
  };

  useEffect(() => {
    // Wait for BOTH auth AND entitlements to finish before redirecting
    if (authLoading || entitlementsLoading) return;
    
    if (!isAuthenticated) {
      navigate(`/login?return_url=/dashboard`);
    }
  }, [authLoading, entitlementsLoading, isAuthenticated, navigate]);


  // Show purchase confirming state
  if (purchaseConfirming) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
              <CardTitle>Confirming your purchase…</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Please wait while we verify your payment. This usually takes just a few seconds.
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Show purchase timeout state
  if (purchaseTimedOut) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <AlertTriangle className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Taking longer than expected</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We couldn't confirm your premium status yet. This can happen if payment processing is delayed. 
                You can try again or contact support if the issue persists.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={handleRetryConfirmation} className="w-full">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Retry confirmation
                </Button>
                <Link to="/pricing" className="w-full">
                  <Button variant="outline" className="w-full">
                    Back to Pricing
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Combined loading gate for auth + entitlements + recovery
  if (authLoading || entitlementsLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  // Show recovery state while syncing drafts
  if (isRecovering) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Recovering your data...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{t.dashboard.loginRequired}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{t.dashboard.loginPrompt}</p>
              <Link to="/login?return_url=/dashboard">
                <Button className="w-full">{t.dashboard.loginButton}</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <div className="container-wide section-padding py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">{t.dashboard.title}</h1>
            <p className="text-muted-foreground">{t.dashboard.subtitle}</p>
          </div>

          {/* Dev Premium Toggle */}
          {isDevMode && (
            <Card className="mb-6 border-dashed border-orange-300 bg-orange-50">
              <CardContent className="py-3 flex items-center justify-between">
                <Label htmlFor="dev-premium" className="text-sm text-orange-700">
                  🛠️ DEV: Simulate Premium
                </Label>
                <Switch
                  id="dev-premium"
                  checked={devPremiumOverride}
                  onCheckedChange={toggleDevPremium}
                />
              </CardContent>
            </Card>
          )}


          {/* Preparedness Journey */}
          <div className="mb-8">
            <DashboardHeader
              completedCount={journey.completedCount}
              totalCount={journey.totalCount}
              progressPercent={journey.progressPercent}
              loading={journey.loading}
            />
            <div className="mt-4">
              <PreparednessJourney
                steps={journey.steps}
                isPremium={isPremium}
                loading={journey.loading}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
