/**
 * Wizard Step 5: Personal Priorities
 */

import { useLocale } from '@/i18n/useLocale';
import { 
  Priority, 
  PRIORITY_LABELS,
  WizardStep5Priorities as Step5Data 
} from '@/lib/planWizard2Types';

interface Props {
  data: Step5Data;
  onChange: (data: Step5Data) => void;
}

const ALL_PRIORITIES: Priority[] = [
  'speed', 'privacy', 'low_cost', 'avoid_crowds', 
  'stay_near_home', 'cross_border_ok', 'family_first', 'pets_priority'
];

const PRIORITY_ICONS: Record<Priority, string> = {
  speed: '⚡',
  privacy: '🔒',
  low_cost: '💰',
  avoid_crowds: '👥',
  stay_near_home: '🏠',
  cross_border_ok: '🌍',
  family_first: '👨‍👩‍👧',
  pets_priority: '🐾',
};

export function WizardStep5Priorities({ data, onChange }: Props) {
  const { locale } = useLocale();
  const labels = PRIORITY_LABELS[locale as 'en' | 'pt'] || PRIORITY_LABELS.en;

  const togglePriority = (priority: Priority) => {
    const current = data.selectedPriorities || [];
    if (current.includes(priority)) {
      onChange({ selectedPriorities: current.filter(p => p !== priority) });
    } else {
      onChange({ selectedPriorities: [...current, priority] });
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          {locale === 'pt'
            ? 'O que é mais importante para si numa emergência? Estas prioridades ajudam a personalizar as decisões nos seus planos.'
            : 'What matters most to you in an emergency? These priorities help customize decisions in your plans.'}
        </p>
      </div>

      {/* Priority grid */}
      <div className="grid sm:grid-cols-2 gap-3">
        {ALL_PRIORITIES.map((priority) => {
          const isSelected = (data.selectedPriorities || []).includes(priority);
          return (
            <button
              key={priority}
              type="button"
              onClick={() => togglePriority(priority)}
              className={`
                flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left
                ${isSelected 
                  ? 'border-primary bg-primary/10' 
                  : 'border-muted bg-muted/30 hover:border-primary/50 hover:bg-muted/50'}
              `}
            >
              <span className="text-xl">{PRIORITY_ICONS[priority]}</span>
              <span className={`text-sm font-medium ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                {labels[priority]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Optional note */}
      <p className="text-xs text-center text-muted-foreground">
        {locale === 'pt'
          ? 'Opcional: selecione as que mais se aplicam a si.'
          : 'Optional: select the ones that apply most to you.'}
      </p>
    </div>
  );
}
