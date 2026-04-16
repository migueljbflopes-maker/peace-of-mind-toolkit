import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Home, 
  Route, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  Pencil,
  RefreshCw,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { getPlan, updateGeneratedPlans } from '@/lib/planWizard2Store';
import { useEntitlements } from '@/hooks/useEntitlements';
import { useLocale } from '@/i18n/useLocale';
import { PremiumLockedState } from '@/components/PremiumLockedState';
import { LoginGateCard } from '@/components/LoginGateCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { GeneratedPlanA, GeneratedPlanB } from '@/lib/planWizard2Types';
import { PlanResultsView } from '@/components/planWizard2/PlanResultsView';

export default function Plans() {
  const { user, loading: authLoading } = useAuth();
  const { isPremium, loading: entLoading } = useEntitlements();
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  
  const [hasRiskAssessment, setHasRiskAssessment] = useState<boolean | null>(null);
  const [plans, setPlans] = useState<{
    planA: GeneratedPlanA | null;
    planB: GeneratedPlanB | null;
  } | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<'A' | 'B' | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Save handler for inline editing (declared before any early return to keep hook order stable)
  const handleSavePlans = useCallback(async (planA: GeneratedPlanA, planB: GeneratedPlanB) => {
    if (!user) return;
    await updateGeneratedPlans(user.id, planA, planB);
    setPlans({ planA, planB });
  }, [user]);

  // Check risk assessment and load plans
  useEffect(() => {
    if (user && isPremium) {
      // Check risk assessment
      supabase
        .from('risk_assessments')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .then(({ data }) => {
          setHasRiskAssessment((data?.length ?? 0) > 0);
        });

      // Load plans
      getPlan(user.id).then((existingPlan) => {
        if (existingPlan?.plan_a_json && existingPlan?.plan_b_json) {
          setPlans({
            planA: existingPlan.plan_a_json,
            planB: existingPlan.plan_b_json,
          });
        } else {
          setPlans({ planA: null, planB: null });
        }
        setLoadingPlans(false);
      });
    } else if (!authLoading && !entLoading) {
      setLoadingPlans(false);
    }
  }, [user, isPremium, authLoading, entLoading]);

  if (authLoading || entLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">{t.common.loading}</div>
        </main>
        <Footer />
      </div>
    );
  }

  // Login check BEFORE premium check
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container-wide section-padding py-8">
          <LoginGateCard feature={t.plans.title} />
        </main>
        <Footer />
      </div>
    );
  }

  // Expanded view - show full plan details
  if (expandedPlan && plans) {
    const selectedPlan = expandedPlan === 'A' ? plans.planA : plans.planB;
    
    if (selectedPlan && plans.planA && plans.planB) {
      return (
        <div className="min-h-screen bg-background flex flex-col">
          <Navbar />
          <main className="flex-1 container-wide section-padding py-8">
            <PlanResultsView
              planA={plans.planA}
              planB={plans.planB}
              onRegenerate={() => navigate('/premium/plans/wizard')}
              onEdit={() => navigate('/premium/plans/wizard')}
              onPrint={() => window.print()}
              onShare={() => navigate('/premium/red-folder')}
              onBack={() => setExpandedPlan(null)}
              onSave={handleSavePlans}
            />
          </main>
          <Footer />
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        {!isPremium ? (
          <PremiumLockedState title={t.plans.title} />
        ) : (
          <div className="container-wide section-padding py-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/dashboard')}
                  className="mr-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  {t.common.back}
                </Button>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">{t.plans.title}</h1>
              </div>
              <p className="text-muted-foreground">{t.plans.subtitle}</p>
            </div>

            {/* Risk Assessment Check */}
            {hasRiskAssessment === false && (
              <Card className="mb-6 border-amber-200 bg-amber-50/50">
                <CardContent className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-6">
                  <div className="p-3 rounded-full bg-amber-100">
                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900 mb-1">
                      {locale === 'pt' ? 'Avaliação de Risco Necessária' : 'Risk Assessment Required'}
                    </h3>
                    <p className="text-sm text-amber-700">
                      {t.plans.requiresRiskAssessment}
                    </p>
                  </div>
                  <Button 
                    onClick={() => navigate('/tools/risk')}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {t.plans.startRiskAssessment}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Loading state for plans */}
            {loadingPlans && hasRiskAssessment !== false && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-pulse text-muted-foreground">{t.common.loading}</div>
              </div>
            )}

            {/* Plans content */}
            {!loadingPlans && hasRiskAssessment !== false && (
              <>
                {/* Tip */}
                <Alert className="mb-6 border-muted bg-muted/30">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <AlertDescription className="text-muted-foreground">
                    {t.plans.tip}
                  </AlertDescription>
                </Alert>

                {/* Plans Grid */}
                <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
                  {/* Plan A Card */}
                  <PlanSummaryCard
                    type="A"
                    title={t.plans.planA}
                    description={t.plans.planADesc}
                    icon={Home}
                    plan={plans?.planA}
                    emptyOverview={t.plans.planAOverviewEmpty}
                    onViewDetails={() => setExpandedPlan('A')}
                    onCreatePlan={() => navigate('/premium/plans/wizard')}
                    onEdit={() => navigate('/premium/plans/wizard')}
                    locale={locale}
                    t={t}
                  />

                  {/* Plan B Card */}
                  <PlanSummaryCard
                    type="B"
                    title={t.plans.planB}
                    description={t.plans.planBDesc}
                    icon={Route}
                    plan={plans?.planB}
                    emptyOverview={t.plans.planBOverviewEmpty}
                    onViewDetails={() => setExpandedPlan('B')}
                    onCreatePlan={() => navigate('/premium/plans/wizard')}
                    onEdit={() => navigate('/premium/plans/wizard')}
                    locale={locale}
                    t={t}
                  />
                </div>

                {/* Regenerate button if both plans exist */}
                {plans?.planA && plans?.planB && (
                  <div className="mt-8 flex justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => navigate('/premium/plans/wizard')}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {t.plans.regeneratePlans}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

// Plan Summary Card Component
interface PlanSummaryCardProps {
  type: 'A' | 'B';
  title: string;
  description: string;
  icon: React.ElementType;
  plan: GeneratedPlanA | GeneratedPlanB | null | undefined;
  emptyOverview: string;
  onViewDetails: () => void;
  onCreatePlan: () => void;
  onEdit: () => void;
  locale: string;
  t: any;
}

function PlanSummaryCard({
  type,
  title,
  description,
  icon: Icon,
  plan,
  emptyOverview,
  onViewDetails,
  onCreatePlan,
  onEdit,
  locale,
  t,
}: PlanSummaryCardProps) {
  const hasPlan = plan && 'overview' in plan && plan.overview;
  const colorClass = type === 'A' 
    ? 'border-green-200 bg-green-50/30' 
    : 'border-amber-200 bg-amber-50/30';
  const iconBgClass = type === 'A' ? 'bg-green-100' : 'bg-amber-100';
  const iconColorClass = type === 'A' ? 'text-green-700' : 'text-amber-700';
  const badgeVariant = hasPlan ? 'default' : 'secondary';

  return (
    <Card className={colorClass}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${iconBgClass}`}>
              <Icon className={`h-5 w-5 ${iconColorClass}`} />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription className="text-sm mt-1">{description}</CardDescription>
            </div>
          </div>
          <Badge variant={badgeVariant} className="shrink-0">
            {hasPlan 
              ? (locale === 'pt' ? 'Criado' : 'Created')
              : (locale === 'pt' ? 'Não criado' : 'Not created')
            }
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overview text */}
        <div className="p-3 rounded-lg bg-background/80 border min-h-[80px]">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {hasPlan && 'overview' in plan ? plan.overview : emptyOverview}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {hasPlan ? (
            <>
              <Button 
                variant="default" 
                className="flex-1"
                onClick={onViewDetails}
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                {t.plans.viewDetails}
              </Button>
              <Button 
                variant="outline" 
                size="icon"
                onClick={onEdit}
                title={t.plans.edit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button 
              variant="default" 
              className="w-full"
              onClick={onCreatePlan}
            >
              {t.plans.createPlans}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
