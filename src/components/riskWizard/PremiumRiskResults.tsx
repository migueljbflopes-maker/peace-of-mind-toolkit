import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, MapPin, Users, Car, Package, 
  Hospital, Siren, ShoppingCart, Zap,
  AlertTriangle, CheckCircle, ArrowRight,
  Save, Sparkles, Target, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AiInsights {
  summary: string;
  infrastructure_analysis: {
    hospitals: string;
    emergency_services: string;
    supply_chains: string;
    utilities: string;
  };
  regional_risks: Array<{
    risk: string;
    level: 'low' | 'medium' | 'high';
    details: string;
  }>;
  dimension_insights: {
    location: { score: number; analysis: string; recommendations: string[] };
    household: { score: number; analysis: string; recommendations: string[] };
    mobility: { score: number; analysis: string; recommendations: string[] };
    supplies: { score: number; analysis: string; recommendations: string[] };
  };
  top_priorities: string[];
  watchlist: string[];
}

// Fallback for old format
interface LegacyAiInsights {
  explanation?: string;
  top_priorities?: string[];
  watchlist?: string[];
  location_insights?: string[];
}

interface PremiumRiskResultsProps {
  score: number;
  riskLevel: string;
  city: string;
  country: string;
  breakdown: {
    location_context: number;
    household_complexity: number;
    mobility_constraints: number;
    preparedness_autonomy: number;
  };
  inputs: Record<string, unknown>;
  existingInsights?: AiInsights | LegacyAiInsights | null;
  onSaved?: () => void;
  onRetake?: () => void;
}

const getRiskLevelColor = (level: string) => {
  switch (level.toLowerCase()) {
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'high': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
};

const LOADING_MESSAGES = [
  'Analyzing your location...',
  'Checking regional infrastructure...',
  'Evaluating natural hazards...',
  'Assessing geopolitical risks...',
  'Generating personalized insights...',
  'Preparing your report...'
];

export function PremiumRiskResults({
  score,
  riskLevel,
  city,
  country,
  breakdown,
  inputs,
  existingInsights,
  onSaved,
  onRetake
}: PremiumRiskResultsProps) {
  const navigate = useNavigate();
  const [insights, setInsights] = useState<AiInsights | null>(null);
  const [loading, setLoading] = useState(!existingInsights);
  const [saving, setSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(!!existingInsights);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);

  // Animate loading progress
  useEffect(() => {
    if (!loading) {
      setLoadingProgress(0);
      return;
    }
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 1.5;
      if (progress >= 95) {
        clearInterval(interval);
        return;
      }
      setLoadingProgress(progress);
      const msgIndex = Math.min(Math.floor(progress / 17), LOADING_MESSAGES.length - 1);
      setLoadingMessage(LOADING_MESSAGES[msgIndex]);
    }, 150);
    
    return () => clearInterval(interval);
  }, [loading]);

  // Check if insights are in new format
  const isNewFormat = (data: unknown): data is AiInsights => {
    return data !== null && typeof data === 'object' && 'infrastructure_analysis' in data;
  };

  // Auto-save function (silent, no navigation)
  const autoSaveAssessment = async (aiInsights: AiInsights) => {
    if (hasSaved) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing } = await supabase
        .from('risk_assessments')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const assessmentData = {
        user_id: user.id,
        city,
        country,
        score,
        risk_level: riskLevel,
        inputs: JSON.parse(JSON.stringify(inputs)),
        breakdown: JSON.parse(JSON.stringify(breakdown)),
        ai_insights: JSON.parse(JSON.stringify(aiInsights)),
        updated_at: new Date().toISOString()
      };

      if (existing) {
        await supabase
          .from('risk_assessments')
          .update(assessmentData)
          .eq('id', existing.id);
      } else {
        await supabase
          .from('risk_assessments')
          .insert(assessmentData);
      }

      setHasSaved(true);
      toast.success('Assessment saved automatically');
      onSaved?.();
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  };

  useEffect(() => {
    if (existingInsights && isNewFormat(existingInsights)) {
      setInsights(existingInsights);
      setLoading(false);
      setHasSaved(true);
      return;
    }

    // Fetch new insights if none exist or old format
    const fetchInsights = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-risk-insights', {
          body: { score, riskLevel, city, country, breakdown, inputs }
        });

        if (error) throw error;
        setInsights(data);
        
        // Auto-save when new insights are fetched
        if (data) {
          autoSaveAssessment(data);
        }
      } catch (err) {
        console.error('Failed to fetch AI insights:', err);
        toast.error('Could not load AI insights. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [score, riskLevel, city, country, breakdown, inputs, existingInsights]);

  // Manual save for cases where auto-save didn't trigger
  const handleManualSave = async () => {
    if (hasSaved || !insights) return;
    setSaving(true);
    await autoSaveAssessment(insights);
    setSaving(false);
  };

  const nextSteps = [
    { icon: Package, label: 'Supplies Planner', path: '/tools/supplies', desc: 'Build your 14-day kit' },
    { icon: Shield, label: 'Vault', path: '/premium/vault', desc: 'Secure documents' },
    { icon: Target, label: 'Emergency Plans', path: '/premium/plans', desc: 'Create A/B plans' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Score Hero */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-muted/30">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 border-4 border-primary/20">
              <span className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}</span>
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl font-bold text-foreground">{riskLevel}</h2>
              <div className="flex items-center justify-center md:justify-start gap-2 mt-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{city}, {country}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading Progress Bar */}
      {loading && (
        <Card className="border-primary/20">
          <CardContent className="py-10">
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <Shield className="h-12 w-12 text-primary animate-pulse" />
                <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 text-primary animate-spin" />
              </div>
              <div className="w-full max-w-md space-y-3">
                <Progress value={loadingProgress} className="h-2" />
                <p className="text-center text-sm text-muted-foreground animate-pulse">
                  {loadingMessage}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Analyzing {city}, {country}...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Summary */}
      {!loading && insights?.summary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Personalized Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{insights.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Infrastructure Analysis */}
      {!loading && insights?.infrastructure_analysis && (
        <>
          <h3 className="text-lg font-semibold flex items-center gap-2 mt-8">
            <MapPin className="h-5 w-5 text-primary" />
            Infrastructure in {city}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4">
                <Hospital className="h-6 w-6 text-red-500 mb-2" />
                <h4 className="font-medium text-sm">Medical</h4>
                <p className="text-xs text-muted-foreground mt-1">{insights.infrastructure_analysis.hospitals}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <Siren className="h-6 w-6 text-blue-500 mb-2" />
                <h4 className="font-medium text-sm">Emergency Services</h4>
                <p className="text-xs text-muted-foreground mt-1">{insights.infrastructure_analysis.emergency_services}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <ShoppingCart className="h-6 w-6 text-green-500 mb-2" />
                <h4 className="font-medium text-sm">Supply Chains</h4>
                <p className="text-xs text-muted-foreground mt-1">{insights.infrastructure_analysis.supply_chains}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <Zap className="h-6 w-6 text-amber-500 mb-2" />
                <h4 className="font-medium text-sm">Utilities</h4>
                <p className="text-xs text-muted-foreground mt-1">{insights.infrastructure_analysis.utilities}</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Regional Risks */}
      {!loading && insights?.regional_risks && insights.regional_risks.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Regional Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.regional_risks.map((risk, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge className={`${getRiskLevelColor(risk.level)} capitalize shrink-0`}>
                    {risk.level}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{risk.risk}</span>
                    <p className="text-sm text-muted-foreground mt-0.5">{risk.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dimension Breakdown */}
      {!loading && insights?.dimension_insights && (
        <>
          <h3 className="text-lg font-semibold flex items-center gap-2 mt-8">
            <Target className="h-5 w-5 text-primary" />
            Your Assessment Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-medium">Location</span>
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(insights.dimension_insights.location.score)}`}>
                    {insights.dimension_insights.location.score}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{insights.dimension_insights.location.analysis}</p>
                <ul className="space-y-1">
                  {insights.dimension_insights.location.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5">
                      <CheckCircle className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Household */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="font-medium">Household</span>
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(insights.dimension_insights.household.score)}`}>
                    {insights.dimension_insights.household.score}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{insights.dimension_insights.household.analysis}</p>
                <ul className="space-y-1">
                  {insights.dimension_insights.household.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5">
                      <CheckCircle className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Mobility */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-primary" />
                    <span className="font-medium">Mobility</span>
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(insights.dimension_insights.mobility.score)}`}>
                    {insights.dimension_insights.mobility.score}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{insights.dimension_insights.mobility.analysis}</p>
                <ul className="space-y-1">
                  {insights.dimension_insights.mobility.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5">
                      <CheckCircle className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Supplies */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="font-medium">Supplies</span>
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(insights.dimension_insights.supplies.score)}`}>
                    {insights.dimension_insights.supplies.score}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{insights.dimension_insights.supplies.analysis}</p>
                <ul className="space-y-1">
                  {insights.dimension_insights.supplies.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5">
                      <CheckCircle className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Top Priorities */}
      {!loading && insights?.top_priorities && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Top 3 Priorities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {insights.top_priorities.map((priority, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-sm">{priority}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="pt-4 space-y-3">
        <Button 
          size="lg" 
          className="w-full h-14 text-lg font-semibold gap-3"
          onClick={() => navigate('/dashboard')}
          disabled={loading}
        >
          Continue to Dashboard
          <ArrowRight className="h-5 w-5" />
        </Button>
        
        {onRetake && (
          <Button 
            variant="outline"
            size="lg" 
            className="w-full"
            onClick={onRetake}
          >
            Retake Assessment
          </Button>
        )}
        
        {hasSaved && (
          <p className="text-center text-sm text-muted-foreground">
            ✓ Assessment saved automatically
          </p>
        )}
      </div>

      {/* Next Steps */}
      <div className="pt-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Continue Your Journey</h3>
        <div className="grid grid-cols-3 gap-3">
          {nextSteps.map((step) => (
            <Button
              key={step.path}
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1"
              onClick={() => navigate(step.path)}
            >
              <step.icon className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">{step.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
