/**
 * Plan Card Component
 * Displays plan status and action buttons
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, MapPin, Sparkles, Edit, Clock } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { PlanType } from '@/lib/plansStore';
import { PlanStatus } from '@/hooks/usePlansSync';
import { formatDistanceToNow } from 'date-fns';

interface PlanCardProps {
  planType: PlanType;
  status: PlanStatus;
  onEdit: (planType: PlanType) => void;
  onGenerateDraft: (planType: PlanType) => void;
  isGenerating?: boolean;
}

export function PlanCard({ 
  planType, 
  status, 
  onEdit, 
  onGenerateDraft,
  isGenerating 
}: PlanCardProps) {
  const { t } = useLocale();
  
  const isPlanA = planType === 'A';
  const Icon = isPlanA ? Home : MapPin;
  const iconBgClass = isPlanA ? 'bg-primary/10' : 'bg-orange-100';
  const iconClass = isPlanA ? 'text-primary' : 'text-orange-600';
  const borderClass = isPlanA ? 'border-primary/30' : 'border-orange-300/50';
  
  const title = isPlanA ? t.plans.planA : t.plans.planB;
  const description = isPlanA ? t.plans.planADesc : t.plans.planBDesc;
  
  const getStatusBadge = () => {
    switch (status.status) {
      case 'not_started':
        return <Badge variant="secondary">{t.plans.statusNotStarted}</Badge>;
      case 'draft':
        return <Badge variant="outline" className="border-amber-300 text-amber-700">{t.plans.statusDraft}</Badge>;
      case 'updated':
        return <Badge variant="default" className="bg-emerald-500">{t.plans.statusUpdated}</Badge>;
    }
  };
  
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
          {getStatusBadge()}
        </div>
        
        {status.updatedAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
            <Clock className="h-3 w-3" />
            <span>
              {t.plans.lastUpdated}: {formatDistanceToNow(new Date(status.updatedAt), { addSuffix: true })}
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        <Button 
          className="w-full gap-2"
          onClick={() => onEdit(planType)}
          disabled={isGenerating}
        >
          <Edit className="h-4 w-4" />
          {t.plans.editPlan}
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full gap-2"
          onClick={() => onGenerateDraft(planType)}
          disabled={isGenerating}
        >
          <Sparkles className="h-4 w-4" />
          {isGenerating ? t.common.loading : t.plans.generateDraft}
        </Button>
      </CardContent>
    </Card>
  );
}
