import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  Package,
  Lock,
  FileText,
  FolderOpen,
  Save,
  RefreshCw,
  MapPin,
  Eye,
  Lightbulb
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WizardResult } from './types';
import { useLocale } from '@/i18n/useLocale';

interface AiInsights {
  explanation: string;
  top_priorities: string[];
  watchlist: string[];
  location_insights: string[];
}

interface PremiumRiskResultsProps {
  result: WizardResult;
  userId: string;
  onRetake: () => void;
}

export default function PremiumRiskResults({ result, userId, onRetake }: PremiumRiskResultsProps) {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const [aiInsights, setAiInsights] = useState<AiInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const t = locale === 'pt' ? {
    aiInsights: 'Insights Personalizados',
    loading: 'A analisar a sua situação...',
    topPriorities: 'Principais Prioridades',
    watchlist: 'Sinais a Monitorizar',
    locationInsights: 'Insights da Localização',
    save: 'Guardar Avaliação',
    saved: 'Guardado!',
    saving: 'A guardar...',
    retake: 'Refazer Avaliação',
    nextSteps: 'Próximos Passos',
    supplies: 'Provisões 14 Dias',
    suppliesDesc: 'Planear mantimentos',
    vault: 'Cofre Seguro',
    vaultDesc: 'Proteger documentos',
    plans: 'Planos A/B',
    plansDesc: 'Criar estratégias',
    redFolder: 'Red Folder',
    redFolderDesc: 'Exportar PDF',
    readinessScore: 'Pontuação de Preparação',
    riskLevel: 'Nível de Risco',
    low: 'Baixo',
    medium: 'Médio',
    high: 'Alto',
  } : {
    aiInsights: 'Personalized Insights',
    loading: 'Analyzing your situation...',
    topPriorities: 'Top Priorities',
    watchlist: 'Signals to Watch',
    locationInsights: 'Location Insights',
    save: 'Save Assessment',
    saved: 'Saved!',
    saving: 'Saving...',
    retake: 'Retake Assessment',
    nextSteps: 'Next Steps',
    supplies: '14-Day Supplies',
    suppliesDesc: 'Plan essentials',
    vault: 'Secure Vault',
    vaultDesc: 'Protect documents',
    plans: 'Plans A/B',
    plansDesc: 'Create strategies',
    redFolder: 'Red Folder',
    redFolderDesc: 'Export PDF',
    readinessScore: 'Readiness Score',
    riskLevel: 'Risk Level',
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  };

  const riskLevelLabel = result.riskLevel === 'Low' ? t.low : result.riskLevel === 'Medium' ? t.medium : t.high;

  useEffect(() => {
    fetchAiInsights();
  }, []);

  const fetchAiInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-risk-insights', {
        body: {
          score: result.readinessScore,
          riskLevel: result.riskLevel,
          city: result.inputs.city || 'Unknown',
          country: result.inputs.country_code || 'Unknown',
          breakdown: result.breakdown,
          inputs: result.inputs,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setAiInsights(data);
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
      toast.error(locale === 'pt' ? 'Erro ao obter insights' : 'Failed to get insights');
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // First check if record exists
      const { data: existing } = await supabase
        .from('risk_assessments')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('risk_assessments')
          .update({
            country: result.inputs.country_code,
            city: result.inputs.city,
            score: result.readinessScore,
            risk_level: result.riskLevel,
            inputs: JSON.parse(JSON.stringify(result.inputs)),
            breakdown: JSON.parse(JSON.stringify(result.breakdown)),
            ai_insights: aiInsights ? JSON.parse(JSON.stringify(aiInsights)) : null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('risk_assessments')
          .insert([{
            user_id: userId,
            country: result.inputs.country_code,
            city: result.inputs.city,
            score: result.readinessScore,
            risk_level: result.riskLevel,
            inputs: JSON.parse(JSON.stringify(result.inputs)),
            breakdown: JSON.parse(JSON.stringify(result.breakdown)),
            ai_insights: aiInsights ? JSON.parse(JSON.stringify(aiInsights)) : null,
          }]);
        if (error) throw error;
      }

      setHasSaved(true);
      toast.success(locale === 'pt' ? 'Avaliação guardada!' : 'Assessment saved!');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error(locale === 'pt' ? 'Erro ao guardar' : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const getScoreColor = () => {
    if (result.readinessScore >= 70) return 'text-emerald-600';
    if (result.readinessScore >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = () => {
    if (result.readinessScore >= 70) return 'bg-emerald-50 border-emerald-200';
    if (result.readinessScore >= 40) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  const nextSteps = [
    { icon: Package, label: t.supplies, desc: t.suppliesDesc, path: '/tools/supplies' },
    { icon: Lock, label: t.vault, desc: t.vaultDesc, path: '/premium/vault' },
    { icon: FileText, label: t.plans, desc: t.plansDesc, path: '/premium/plans' },
    { icon: FolderOpen, label: t.redFolder, desc: t.redFolderDesc, path: '/premium/red-folder' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Score Card */}
      <Card className={`border-2 ${getScoreBg()}`}>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`text-5xl font-bold ${getScoreColor()}`}>
                {result.readinessScore}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.readinessScore}</p>
                <Badge variant={result.riskLevel === 'Low' ? 'default' : result.riskLevel === 'Medium' ? 'secondary' : 'destructive'}>
                  {t.riskLevel}: {riskLevelLabel}
                </Badge>
              </div>
            </div>

            {result.inputs.city && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{result.inputs.city}, {result.inputs.country_code}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{t.aiInsights}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingInsights ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{t.loading}</span>
              </div>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : aiInsights ? (
            <>
              {/* Explanation */}
              <p className="text-muted-foreground leading-relaxed">
                {aiInsights.explanation}
              </p>

              {/* Top Priorities */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h4 className="font-medium">{t.topPriorities}</h4>
                </div>
                <ul className="space-y-2">
                  {aiInsights.top_priorities.map((priority, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{priority}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Watchlist */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <h4 className="font-medium">{t.watchlist}</h4>
                </div>
                <ul className="space-y-2">
                  {aiInsights.watchlist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Location Insights */}
              {aiInsights.location_insights.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <h4 className="font-medium">{t.locationInsights}</h4>
                  </div>
                  <ul className="space-y-2">
                    {aiInsights.location_insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <Button variant="outline" onClick={fetchAiInsights}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {locale === 'pt' ? 'Tentar novamente' : 'Try again'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={handleSave} 
          disabled={isSaving || hasSaved || isLoadingInsights}
          className="flex-1"
        >
          {hasSaved ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t.saved}
            </>
          ) : isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              {t.saving}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {t.save}
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onRetake}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t.retake}
        </Button>
      </div>

      {/* Next Steps Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{t.nextSteps}</h3>
        <div className="grid grid-cols-2 gap-4">
          {nextSteps.map((step) => (
            <Card 
              key={step.path}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(step.path)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{step.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{step.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
