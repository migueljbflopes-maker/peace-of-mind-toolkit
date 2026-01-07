import { CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataReadiness } from '@/hooks/useRedFolderData';
import { useLocale } from '@/i18n/useLocale';

interface DataReadinessPanelProps {
  readiness: DataReadiness;
}

export function DataReadinessPanel({ readiness }: DataReadinessPanelProps) {
  const { t } = useLocale();

  const items = [
    { key: 'riskAssessment', label: t.redFolder.readiness.risk, found: readiness.riskAssessment },
    { key: 'suppliesPlan', label: t.redFolder.readiness.supplies, found: readiness.suppliesPlan },
    { key: 'vaultIds', label: `${t.vault.sections.ids}`, found: readiness.vaultIds },
    { key: 'vaultContacts', label: `${t.vault.sections.contacts}`, found: readiness.vaultContacts },
    { key: 'vaultMedical', label: `${t.vault.sections.medical}`, found: readiness.vaultMedical },
    { key: 'planA', label: t.plans.planA, found: readiness.planA },
    { key: 'planB', label: t.plans.planB, found: readiness.planB },
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
              <span className={`text-sm ${item.found ? 'text-foreground' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
              <span className={`text-xs ml-auto ${item.found ? 'text-green-600' : 'text-muted-foreground'}`}>
                {item.found ? t.redFolder.found : t.redFolder.notFound}
              </span>
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
