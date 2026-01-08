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
  AlertCircle,
  FolderHeart,
  Users,
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
  const { isPremium, loading: entitlementsLoading, refetch, devPremiumOverride, toggleDevPremium, isDevMode } = useEntitlements(user, authLoading);
  const { needsOnboarding } = useOnboardingState(user?.id);
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [plans, setPlans] = useState<SuppliesPlan[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Purchase confirmation state
  const [purchaseConfirming, setPurchaseConfirming] = useState(false);
  const [purchaseTimedOut, setPurchaseTimedOut] = useState(false);

  // Handle successful purchase redirect with instant verification + fallback polling
  useEffect(() => {
    const purchaseStatus = searchParams.get('purchase');
    const sessionId = searchParams.get('session_id');
    
    if (purchaseStatus !== 'success') return;

    // Clear the URL params immediately
    setSearchParams({}, { replace: true });
    
    // If already premium, just show success
    if (isPremium && !entitlementsLoading) {
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

  if (authLoading) {
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

  const safeToolkitShortcuts = [
    { label: t.premium.shortcuts.vault, href: '/premium/vault', icon: Lock },
    { label: t.premium.shortcuts.plans, href: '/premium/plans', icon: FileText },
    { label: t.premium.shortcuts.redFolder, href: '/premium/red-folder', icon: FolderHeart },
    { label: t.premium.shortcuts.backup, href: '/premium/backup', icon: Archive },
  ];

  const panicButtonShortcuts = [
    { label: 'Setup Contacts', href: '/panic/setup', icon: Users },
    { label: 'Test Panic Button', href: '/panic/test', icon: AlertCircle },
    { label: 'Activation History', href: '/panic/history', icon: Bell },
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

          {/* Onboarding CTA for Premium users */}
          {isPremium && needsOnboarding && (
            <Card className="mb-6 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
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

          {/* Section 1: Free Tools - Risk Calculator & Supplies Planner */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Your Preparedness Tools
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Risk Assessments */}
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
                      {assessments.slice(0, 3).map((a) => (
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
                          {a.score !== null && (
                            <Badge variant={a.risk_level === 'low' ? 'secondary' : a.risk_level === 'high' ? 'destructive' : 'default'}>
                              {a.score}%
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              {/* Supplies Plans */}
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
                      {plans.slice(0, 3).map((p) => (
                        <li key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <div>
                            <p className="text-sm font-medium">{p.days}-Day Plan</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(p.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {p.preparedness_pct !== null && (
                            <Badge variant="secondary">{p.preparedness_pct}% ready</Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Section 2: Premium Features */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {isPremium ? 'Your Premium Features' : 'Premium Features'}
              {!isPremium && (
                <Badge variant="outline" className="ml-2 text-xs">€49 one-time</Badge>
              )}
            </h2>

            {isPremium ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Safe Toolkit */}
                <Card className="border-primary/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-base">Safe Toolkit</CardTitle>
                    </div>
                    <CardDescription>Encrypted vault and personalized plans</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {safeToolkitShortcuts.map((item) => (
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
                  </CardContent>
                </Card>

                {/* Panic Button */}
                <Card className="border-destructive/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-destructive/10">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      </div>
                      <CardTitle className="text-base">Panic Button</CardTitle>
                    </div>
                    <CardDescription>Emergency response and continuity</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {panicButtonShortcuts.map((item) => (
                        <Link key={item.href} to={item.href}>
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                              <item.icon className="h-4 w-4 text-destructive" />
                              <span className="text-sm font-medium">{item.label}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Safe Toolkit Locked */}
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <CardTitle className="text-base">Safe Toolkit</CardTitle>
                    </div>
                    <CardDescription>Encrypted vault, Plans A & B, Red Folder PDF</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Lock className="h-3.5 w-3.5" />
                        Encrypted Vault for sensitive data
                      </li>
                      <li className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" />
                        AI-generated Plans A & B
                      </li>
                      <li className="flex items-center gap-2">
                        <FolderHeart className="h-3.5 w-3.5" />
                        Printable Red Folder PDF
                      </li>
                    </ul>
                    <Link to="/pricing">
                      <Button size="sm" className="w-full mt-2">
                        Unlock Safe Toolkit
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                {/* Panic Button Locked */}
                <Card className="border-destructive/20 bg-gradient-to-br from-destructive/5 to-background">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-destructive/10">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      </div>
                      <CardTitle className="text-base">Panic Button</CardTitle>
                    </div>
                    <CardDescription>One-action emergency response</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" />
                        Emergency contacts setup
                      </li>
                      <li className="flex items-center gap-2">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Instant location sharing
                      </li>
                      <li className="flex items-center gap-2">
                        <Bell className="h-3.5 w-3.5" />
                        Continuity check-ins
                      </li>
                    </ul>
                    <Link to="/pricing">
                      <Button size="sm" variant="outline" className="w-full mt-2 border-destructive/30 hover:bg-destructive/5">
                        Unlock Panic Button
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
