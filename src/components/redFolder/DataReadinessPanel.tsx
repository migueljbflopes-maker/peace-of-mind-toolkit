import { CheckCircle2, XCircle, Edit, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataReadiness } from '@/hooks/useRedFolderData';
import { useLocale } from '@/i18n/useLocale';
import { formatDistanceToNow } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';

interface DataReadinessPanelProps {
  readiness: DataReadiness;
}

export function DataReadinessPanel({ readiness }: DataReadinessPanelProps) {
  const { t, locale } = useLocale();
  const navigate = useNavigate();

  const formatUpdatedAt = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { 
        addSuffix: true, 
        locale: locale === 'pt' ? pt : enUS 
      });
    } catch {
      return null;
    }
  };

  const items = [
    { 
      key: 'riskAssessment', 
      label: t.redFolder.readiness.risk, 
      found: readiness.riskAssessment,
      updatedAt: readiness.riskUpdatedAt,
      editPath: '/tools/risk',
    },
    { 
      key: 'suppliesPlan', 
      label: t.redFolder.readiness.supplies, 
      found: readiness.suppliesPlan,
      updatedAt: readiness.suppliesUpdatedAt,
      editPath: '/tools/supplies',
    },
    { 
      key: 'vaultIds', 
      label: t.vault.sections.ids, 
      found: readiness.vaultIds,
      editPath: '/premium/vault',
    },
    { 
      key: 'vaultContacts', 
      label: t.vault.sections.contacts, 
      found: readiness.vaultContacts,
      editPath: '/premium/vault',
    },
    { 
      key: 'vaultMedical', 
      label: t.vault.sections.medical, 
      found: readiness.vaultMedical,
      editPath: '/premium/vault',
    },
    { 
      key: 'planA', 
      label: t.plans.planA, 
      found: readiness.planA,
      updatedAt: readiness.plansUpdatedAt,
      editPath: '/premium/plans/wizard',
    },
    { 
      key: 'planB', 
      label: t.plans.planB, 
      found: readiness.planB,
      updatedAt: readiness.plansUpdatedAt,
      editPath: '/premium/plans/wizard',
    },
  ];

  const foundCount = items.filter(i => i.found).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{t.redFolder.dataReadiness}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {foundCount}/{items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item) => {
            const updatedText = item.found && item.updatedAt ? formatUpdatedAt(item.updatedAt) : null;
            
            return (
              <li key={item.key} className="flex items-start gap-3">
                {item.found ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm block ${item.found ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {item.label}
                  </span>
                  {updatedText && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {updatedText}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs flex-shrink-0"
                  onClick={() => navigate(item.editPath)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  {locale === 'pt' ? 'Editar' : 'Edit'}
                </Button>
              </li>
            );
          })}
        </ul>
        {foundCount < items.length && (
          <p className="text-xs text-muted-foreground mt-4">
            {t.redFolder.missingDataNote}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
