import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CheckCircle2,
  Circle,
  Lock,
  AlertTriangle,
  Target,
  Package,
  Shield,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { JourneyStep } from '@/hooks/usePreparednessJourney';

interface PreparednessJourneyProps {
  steps: JourneyStep[];
  isPremium: boolean;
  loading: boolean;
}

const PHASE_ICONS = {
  assess: Target,
  prepare: Package,
  secure: Shield,
  activate: Zap,
};

const PHASE_LABELS = {
  assess: 'Assess',
  prepare: 'Prepare',
  secure: 'Secure',
  activate: 'Activate',
};

interface PhaseGroup {
  phase: JourneyStep['phase'];
  steps: JourneyStep[];
  completedCount: number;
  totalCount: number;
}

function groupByPhase(steps: JourneyStep[]): PhaseGroup[] {
  const phases: JourneyStep['phase'][] = ['assess', 'prepare', 'secure', 'activate'];
  return phases.map((phase) => {
    const phaseSteps = steps.filter((s) => s.phase === phase);
    return {
      phase,
      steps: phaseSteps,
      completedCount: phaseSteps.filter((s) => s.isComplete).length,
      totalCount: phaseSteps.length,
    };
  });
}

function StepRow({
  step,
  isPremium,
  onClick,
}: {
  step: JourneyStep;
  isPremium: boolean;
  onClick: () => void;
}) {
  const isDisabled = step.isLocked || (step.isPremium && !isPremium);
  const showPremiumLock = step.isPremium && !isPremium && !step.isComplete;

  return (
    <TooltipProvider>
      <div
        onClick={isDisabled && step.isLocked ? undefined : onClick}
        className={cn(
          'group flex items-center gap-4 rounded-lg border p-4 transition-all',
          step.isComplete && 'border-green-500/30 bg-green-500/5',
          step.isCurrent &&
            !step.isComplete &&
            'border-primary/50 bg-primary/5 ring-1 ring-primary/20',
          !step.isComplete &&
            !step.isCurrent &&
            !isDisabled &&
            'border-border hover:border-primary/30 hover:bg-accent/50',
          step.isLocked && 'opacity-60 cursor-not-allowed',
          !step.isLocked && 'cursor-pointer'
        )}
      >
        {/* Status Icon */}
        <div className="flex-shrink-0">
          {step.isComplete ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
          ) : step.isLocked ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{step.lockReason}</p>
              </TooltipContent>
            </Tooltip>
          ) : showPremiumLock ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
              <Lock className="h-4 w-4 text-amber-500" />
            </div>
          ) : step.isCurrent ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Circle className="h-4 w-4 text-primary fill-primary/20" />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Circle className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4
              className={cn(
                'font-medium text-sm',
                step.isComplete && 'text-green-700 dark:text-green-400',
                step.isCurrent && !step.isComplete && 'text-primary'
              )}
            >
              {step.label}
            </h4>
            {step.isCurrent && !step.isComplete && (
              <Badge variant="default" className="text-xs">
                Next
              </Badge>
            )}
            {step.warning && !step.isComplete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{step.warning}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {step.description}
          </p>
        </div>

        {/* Right side */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {showPremiumLock ? (
            <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600">
              Premium
            </Badge>
          ) : step.isComplete ? (
            <Badge
              variant="outline"
              className="text-xs border-green-500/50 text-green-600"
            >
              Done
            </Badge>
          ) : null}
          {!step.isLocked && (
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export function PreparednessJourney({
  steps,
  isPremium,
  loading,
}: PreparednessJourneyProps) {
  const navigate = useNavigate();
  const phaseGroups = groupByPhase(steps);

  // Determine which phases should be open by default
  const defaultOpenPhases = phaseGroups
    .filter((g) => g.completedCount < g.totalCount || g.steps.some((s) => s.isCurrent))
    .map((g) => g.phase);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const handleStepClick = (step: JourneyStep) => {
    if (step.isLocked) return;

    if (step.isPremium && !isPremium) {
      // Redirect to pricing with return URL
      navigate(`/pricing?return_url=${encodeURIComponent(step.href)}`);
    } else {
      navigate(step.href);
    }
  };

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultOpenPhases}
      className="space-y-3"
    >
      {phaseGroups.map((group) => {
        const PhaseIcon = PHASE_ICONS[group.phase];
        const isPhaseComplete = group.completedCount === group.totalCount;

        return (
          <AccordionItem
            key={group.phase}
            value={group.phase}
            className={cn(
              'rounded-lg border bg-card overflow-hidden',
              isPhaseComplete && 'border-green-500/30'
            )}
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-accent/50">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full',
                    isPhaseComplete ? 'bg-green-500/10' : 'bg-primary/10'
                  )}
                >
                  <PhaseIcon
                    className={cn(
                      'h-4 w-4',
                      isPhaseComplete ? 'text-green-500' : 'text-primary'
                    )}
                  />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-sm">
                    {PHASE_LABELS[group.phase]}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {group.completedCount}/{group.totalCount} complete
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-2 pt-2">
                {group.steps.map((step) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    isPremium={isPremium}
                    onClick={() => handleStepClick(step)}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
