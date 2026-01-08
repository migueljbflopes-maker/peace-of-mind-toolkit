import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Shield,
  AlertTriangle,
  Package,
  Lock,
  FileText,
  Archive,
  Bell,
  Loader2,
  ChevronRight,
  MapPin,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocale } from '@/i18n/useLocale';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { supabase } from '@/integrations/supabase/client';
import { PremiumBundleCard } from '@/components/PremiumBundleCard';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { toast } from 'sonner';

interface RiskAssessment {
  id: string;
  created_at: string;
  country: string | null;
  city: string | null;
  score: number | null;
  risk_level: string | null;
}

interface SuppliesPlan {
  id: string;
  created_at: string;
  days: number;
  preparedness_pct: number | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useLocale();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { isPremium, loading: entitlementsLoading, refetch, devPremiumOverride, toggleDevPremium, isDevMode } = useEntitlements();
  const { needsOnboarding, loading: onboardingLoading } = useOnboardingState();
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [plans, setPlans] = useState<SuppliesPlan[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Purchase confirmation state
  const [purchaseConfirming, setPurchaseConfirming] = useState(false);
  const [purchaseTimedOut, setPurchaseTimedOut] = useState(false);

  // Handle successful purchase redirect with polling
  useEffect(() => {
    const purchaseStatus = searchParams.get('purchase');
    if (purchaseStatus !== 'success') return;

    // Clear the URL param immediately
    setSearchParams({}, { replace: true });
    
    // If already premium, just show success
    if (isPremium && !entitlementsLoading) {
      toast.success("Welcome to Premium!", {
        description: "Your purchase was successful. Enjoy your new features!",
      });
      return;
    }

    // Start polling for premium status
    setPurchaseConfirming(true);
    setPurchaseTimedOut(false);

    let pollCount = 0;
    const maxPolls = 10; // 10 polls × 2s = 20 seconds
    const pollInterval = 2000;

    const pollTimer = setInterval(async () => {
      pollCount++;
      await refetch();
      
      // Check if premium is now active (need to re-check from DB)
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
        refetch(); // Final refresh
        return;
      }

      if (pollCount >= maxPolls) {
        clearInterval(pollTimer);
        setPurchaseConfirming(false);
        setPurchaseTimedOut(true);
      }
    }, pollInterval);

    return () => clearInterval(pollTimer);
  }, [searchParams, setSearchParams, user?.id]);

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
    if (!authLoading && !isAuthenticated) {
      navigate(`/login?return_url=/dashboard`);
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    setLoadingData(true);

    const [assessmentsRes, plansRes] = await Promise.all([
      supabase
        .from('risk_assessments')
        .select('id, created_at, country, city, score, risk_level')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('supplies_plans')
        .select('id, created_at, days, preparedness_pct')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    if (assessmentsRes.data) setAssessments(assessmentsRes.data);
    if (plansRes.data) setPlans(plansRes.data);
    setLoadingData(false);
  };

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

  if (authLoading || entitlementsLoading || onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  const premiumShortcuts = [
    { label: t.premium.shortcuts.vault, href: '/premium/vault', icon: Lock },
    { label: t.premium.shortcuts.plans, href: '/premium/plans', icon: FileText },
    { label: t.premium.shortcuts.redFolder, href: '/premium/red-folder', icon: FileText },
    { label: t.premium.shortcuts.backup, href: '/premium/backup', icon: Archive },
    { label: t.premium.shortcuts.alerts, href: '/news/weekly', icon: Bell },
  ];

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

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column: Saved Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Saved Assessments */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      {t.dashboard.savedAssessments}
                    </CardTitle>
                    <Link to="/tools/risk">
                      <Button variant="ghost" size="sm">
                        {t.dashboard.startAssessment}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : assessments.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">{t.dashboard.noAssessments}</p>
                  ) : (
                    <ul className="space-y-2">
                      {assessments.map((a) => (
                        <li key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {a.city && a.country ? `${a.city}, ${a.country}` : a.country || 'Assessment'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(a.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {a.score !== null && (
                              <Badge variant={a.risk_level === 'low' ? 'secondary' : a.risk_level === 'high' ? 'destructive' : 'default'}>
                                {a.score}%
                              </Badge>
                            )}
                            <Button variant="ghost" size="sm">{t.common.open}</Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Saved Plans */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      {t.dashboard.savedPlans}
                    </CardTitle>
                    <Link to="/tools/supplies">
                      <Button variant="ghost" size="sm">
                        {t.dashboard.startPlan}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : plans.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">{t.dashboard.noPlans}</p>
                  ) : (
                    <ul className="space-y-2">
                      {plans.map((p) => (
                        <li key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <div>
                            <p className="text-sm font-medium">{p.days}-Day Plan</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(p.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {p.preparedness_pct !== null && (
                              <Badge variant="secondary">{p.preparedness_pct}% ready</Badge>
                            )}
                            <Button variant="ghost" size="sm">{t.common.open}</Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Premium */}
            <div className="space-y-6">
              {/* Onboarding CTA for Premium users */}
              {isPremium && needsOnboarding && (
                <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{t.onboarding.finishSetup}</CardTitle>
                    </div>
                    <CardDescription>{t.onboarding.finishSetupDesc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link to="/premium/onboarding">
                      <Button className="w-full">
                        {t.common.continue}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t.dashboard.premiumSection}</CardTitle>
                </CardHeader>
                <CardContent>
                  {isPremium ? (
                    <div className="space-y-2">
                      {premiumShortcuts.map((item) => (
                        <Link key={item.href} to={item.href}>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                              <item.icon className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium">{item.label}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <PremiumBundleCard compact />
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
