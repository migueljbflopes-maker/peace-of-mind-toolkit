import { forwardRef, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocale } from '@/i18n/useLocale';
import { supabase } from '@/integrations/supabase/client';
import { PremiumBundleCard } from '@/components/PremiumBundleCard';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

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

const Dashboard = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { isPremium, loading: entitlementsLoading, devPremiumOverride, toggleDevPremium, isDevMode } = useEntitlements();

  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [plans, setPlans] = useState<SuppliesPlan[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !entitlementsLoading && !isAuthenticated) {
      navigate(`/login?return_url=/dashboard`);
    }
  }, [authLoading, entitlementsLoading, isAuthenticated, navigate]);

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

  if (authLoading || entitlementsLoading) {
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
    <div ref={ref} className="min-h-screen bg-background flex flex-col">
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
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
