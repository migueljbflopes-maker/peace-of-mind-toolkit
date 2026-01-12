/**
 * Wizard Step 3: Resources & Preparedness
 */

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Wallet, FileText, Pill, Backpack } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import type { WizardStep3Resources as Step3Data } from '@/lib/planWizard2Types';

interface Props {
  data: Step3Data;
  onChange: (data: Step3Data) => void;
}

export function WizardStep3Resources({ data, onChange }: Props) {
  const { locale } = useLocale();

  const cashLabels = {
    en: {
      none: 'None / Very little',
      under_100: 'Under €100',
      '100_500': '€100 - €500',
      '500_plus': '€500+',
    },
    pt: {
      none: 'Nenhum / Muito pouco',
      under_100: 'Menos de €100',
      '100_500': '€100 - €500',
      '500_plus': '€500+',
    },
  };

  const bagLabels = {
    en: {
      none: 'No go-bag prepared',
      basic: 'Basic (essentials only)',
      advanced: 'Advanced (72h+ ready)',
    },
    pt: {
      none: 'Sem mochila preparada',
      basic: 'Básica (só essenciais)',
      advanced: 'Avançada (72h+ pronta)',
    },
  };

  const labels = locale === 'pt' ? cashLabels.pt : cashLabels.en;
  const bagLbls = locale === 'pt' ? bagLabels.pt : bagLabels.en;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {locale === 'pt'
          ? 'Avalie os seus recursos atuais para planos mais realistas.'
          : 'Assess your current resources for more realistic plans.'}
      </p>

      {/* Cash availability */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Wallet className="h-4 w-4 text-primary" />
          {locale === 'pt' ? 'Dinheiro físico disponível' : 'Cash on hand'}
        </div>
        <RadioGroup
          value={data.cashRange}
          onValueChange={(value) => onChange({ ...data, cashRange: value as Step3Data['cashRange'] })}
          className="grid grid-cols-2 gap-2"
        >
          {(['none', 'under_100', '100_500', '500_plus'] as const).map((value) => (
            <div key={value} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
              <RadioGroupItem value={value} id={`cash-${value}`} />
              <Label htmlFor={`cash-${value}`} className="flex-1 cursor-pointer text-sm">
                {labels[value]}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Documents ready */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">
              {locale === 'pt' ? 'Documentos prontos?' : 'Documents ready?'}
            </p>
            <p className="text-sm text-muted-foreground">
              {locale === 'pt' 
                ? 'Passaporte, BI, seguro acessíveis'
                : 'Passport, ID, insurance accessible'}
            </p>
          </div>
        </div>
        <Switch
          checked={data.docsReady}
          onCheckedChange={(checked) => onChange({ ...data, docsReady: checked })}
        />
      </div>

      {/* Medications needed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            <Pill className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {locale === 'pt' ? 'Medicação necessária?' : 'Medications needed?'}
              </p>
              <p className="text-sm text-muted-foreground">
                {locale === 'pt' 
                  ? 'Alguém no agregado precisa de medicação regular'
                  : 'Anyone in household needs regular medication'}
              </p>
            </div>
          </div>
          <Switch
            checked={data.medicationsNeeded}
            onCheckedChange={(checked) => onChange({ ...data, medicationsNeeded: checked })}
          />
        </div>
        
        {data.medicationsNeeded && (
          <Textarea
            value={data.medicationsList || ''}
            onChange={(e) => onChange({ ...data, medicationsList: e.target.value })}
            placeholder={locale === 'pt' 
              ? 'Tipos de medicação (sem detalhes pessoais)'
              : 'Types of medication (no personal details)'}
            rows={2}
          />
        )}
      </div>

      {/* Go-bag status */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Backpack className="h-4 w-4 text-primary" />
          {locale === 'pt' ? 'Estado da mochila de emergência' : 'Go-bag readiness'}
        </div>
        <RadioGroup
          value={data.goBagStatus}
          onValueChange={(value) => onChange({ ...data, goBagStatus: value as Step3Data['goBagStatus'] })}
          className="space-y-2"
        >
          {(['none', 'basic', 'advanced'] as const).map((value) => (
            <div key={value} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50">
              <RadioGroupItem value={value} id={`bag-${value}`} />
              <Label htmlFor={`bag-${value}`} className="flex-1 cursor-pointer text-sm">
                {bagLbls[value]}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}
