/**
 * Wizard Step 4: Scenario Selection
 */

import { useLocale } from '@/i18n/useLocale';
import { 
  EmergencyScenario, 
  SCENARIO_LABELS, 
  SCENARIO_ICONS,
  WizardStep4Scenarios as Step4Data 
} from '@/lib/planWizard2Types';

interface Props {
  data: Step4Data;
  onChange: (data: Step4Data) => void;
}

const ALL_SCENARIOS: EmergencyScenario[] = [
  'war', 'flood', 'wildfire', 'earthquake', 'storm', 'blackout', 'civil_unrest', 'chemical'
];

export function WizardStep4Scenarios({ data, onChange }: Props) {
  const { locale } = useLocale();
  const labels = SCENARIO_LABELS[locale as 'en' | 'pt'] || SCENARIO_LABELS.en;

  const toggleScenario = (scenario: EmergencyScenario) => {
    const current = data.selectedScenarios || [];
    if (current.includes(scenario)) {
      onChange({ selectedScenarios: current.filter(s => s !== scenario) });
    } else {
      onChange({ selectedScenarios: [...current, scenario] });
    }
  };

  const selectAll = () => {
    onChange({ selectedScenarios: [...ALL_SCENARIOS] });
  };

  const clearAll = () => {
    onChange({ selectedScenarios: [] });
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          {locale === 'pt'
            ? 'Selecione os cenários de emergência para os quais quer preparar planos. Pode selecionar múltiplos.'
            : 'Select the emergency scenarios you want to prepare plans for. You can select multiple.'}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={selectAll}
          className="text-sm text-primary hover:underline"
        >
          {locale === 'pt' ? 'Selecionar todos' : 'Select all'}
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          type="button"
          onClick={clearAll}
          className="text-sm text-muted-foreground hover:underline"
        >
          {locale === 'pt' ? 'Limpar' : 'Clear'}
        </button>
      </div>

      {/* Scenario grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {ALL_SCENARIOS.map((scenario) => {
          const isSelected = (data.selectedScenarios || []).includes(scenario);
          return (
            <button
              key={scenario}
              type="button"
              onClick={() => toggleScenario(scenario)}
              className={`
                flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all
                ${isSelected 
                  ? 'border-primary bg-primary/10 text-foreground' 
                  : 'border-muted bg-muted/30 text-muted-foreground hover:border-primary/50 hover:bg-muted/50'}
              `}
            >
              <span className="text-2xl">{SCENARIO_ICONS[scenario]}</span>
              <span className="text-xs font-medium text-center leading-tight">
                {labels[scenario]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selection count */}
      <div className="text-center">
        <span className={`text-sm ${data.selectedScenarios.length === 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {data.selectedScenarios.length === 0
            ? (locale === 'pt' ? '⚠️ Selecione pelo menos um cenário' : '⚠️ Select at least one scenario')
            : (locale === 'pt' 
                ? `${data.selectedScenarios.length} cenário(s) selecionado(s)`
                : `${data.selectedScenarios.length} scenario(s) selected`)}
        </span>
      </div>
    </div>
  );
}
