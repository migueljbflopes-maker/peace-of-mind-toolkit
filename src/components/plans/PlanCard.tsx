/**
 * Plan Card Component
 * Displays plan status and action buttons for wizard-based plans
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, MapPin, Eye, Plus } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { PlanType } from '@/lib/plansStore';

interface PlanCardProps {
  planType: PlanType;
  hasGeneratedPlan?: boolean;
  summary?: string;
  onViewPlan?: () => void;
  onStartWizard?: () => void;
}

export function PlanCard({ 
  planType, 
  hasGeneratedPlan,
  summary,
  onViewPlan,
  onStartWizard,
}: PlanCardProps) {
  const { t, locale } = useLocale();
  
  const isPlanA = planType === 'A';
  const Icon = isPlanA ? Home : MapPin;
  const iconBgClass = isPlanA ? 'bg-primary/10' : 'bg-orange-100';
  const iconClass = isPlanA ? 'text-primary' : 'text-orange-600';
  const borderClass = isPlanA ? 'border-primary/30' : 'border-orange-300/50';
  
  const title = isPlanA ? t.plans.planA : t.plans.planB;
  const description = isPlanA ? t.plans.planADesc : t.plans.planBDesc;
  
  return (
    <Card className={`border-2 border-dashed ${borderClass}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${iconBgClass}`}>
              <Icon className={`h-5 w-5 ${iconClass}`} />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          {hasGeneratedPlan ? (
            <Badge variant="default" className="bg-emerald-500">
              {locale === 'pt' ? 'Criado' : 'Created'}
            </Badge>
          ) : (
            <Badge variant="secondary">
              {locale === 'pt' ? 'Por criar' : 'Not created'}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Summary preview */}
        {summary && hasGeneratedPlan && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {summary}
          </p>
        )}
        
        {hasGeneratedPlan ? (
          <Button 
            className="w-full gap-2"
            onClick={onViewPlan}
          >
            <Eye className="h-4 w-4" />
            {locale === 'pt' ? 'Ver Plano' : 'View Plan'}
          </Button>
        ) : (
          <Button 
            className="w-full gap-2"
            onClick={onStartWizard}
          >
            <Plus className="h-4 w-4" />
            {locale === 'pt' ? 'Criar Plano' : 'Create Plan'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
