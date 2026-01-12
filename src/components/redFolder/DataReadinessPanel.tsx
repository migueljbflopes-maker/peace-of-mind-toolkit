import { CheckCircle2, XCircle, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataReadiness } from '@/hooks/useRedFolderData';
import { useLocale } from '@/i18n/useLocale';

interface DataReadinessPanelProps {
  readiness: DataReadiness;
}

export function DataReadinessPanel({ readiness }: DataReadinessPanelProps) {
  const { t, locale } = useLocale();
  const navigate = useNavigate();

  const items = [
    { 
      key: 'riskAssessment', 
      label: t.redFolder.readiness.risk, 
      found: readiness.riskAssessment,
      editPath: '/tools/risk',
    },
    { 
      key: 'suppliesPlan', 
      label: t.redFolder.readiness.supplies, 
      found: readiness.suppliesPlan,
      editPath: '/tools/supplies',
    },
    { 
      key: 'vaultIds', 
      label: `${t.vault.sections.ids}`, 
      found: readiness.vaultIds,
      editPath: '/premium/vault',
    },
    { 
      key: 'vaultContacts', 
      label: `${t.vault.sections.contacts}`, 
      found: readiness.vaultContacts,
      editPath: '/premium/vault',
    },
    { 
      key: 'vaultMedical', 
      label: `${t.vault.sections.medical}`, 
      found: readiness.vaultMedical,
      editPath: '/premium/vault',
    },
    { 
      key: 'planA', 
      label: t.plans.planA, 
      found: readiness.planA,
      editPath: '/premium/plans/wizard',
    },
    { 
      key: 'planB', 
      label: t.plans.planB, 
      found: readiness.planB,
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
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-3">
              {item.found ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
              <span className={`text-sm flex-1 ${item.found ? 'text-foreground' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => navigate(item.editPath)}
              >
                <Edit className="h-3 w-3 mr-1" />
                {locale === 'pt' ? 'Editar' : 'Edit'}
              </Button>
            </li>
          ))}
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
