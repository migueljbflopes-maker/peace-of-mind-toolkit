import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Check,
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

interface PhaseCardProps {
  group: PhaseGroup;
  isActive: boolean;
  hasCurrent: boolean;
  onClick: () => void;
}

function PhaseCard({ group, isActive, hasCurrent, onClick }: PhaseCardProps) {
  const PhaseIcon = PHASE_ICONS[group.phase];
  const isComplete = group.completedCount === group.totalCount;
  const hasProgress = group.completedCount > 0 && !isComplete;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-200 text-center w-full',
        'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20',
        isComplete && 'border-green-500 bg-green-50 dark:bg-green-950/20',
        hasCurrent && !isComplete && 'border-primary bg-primary/5',
        !isComplete && !hasCurrent && 'border-border bg-card hover:border-muted-foreground/30',
        isActive && 'ring-2 ring-primary/30 shadow-lg'
      )}
    >
      {/* Icon with progress ring */}
      <div className="relative mb-2">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
            isComplete && 'bg-green-500/20',
            hasCurrent && !isComplete && 'bg-primary/20',
            !isComplete && !hasCurrent && 'bg-muted'
          )}
        >
          <PhaseIcon
            className={cn(
              'h-6 w-6',
              isComplete && 'text-green-600 dark:text-green-400',
              hasCurrent && !isComplete && 'text-primary',
              !isComplete && !hasCurrent && 'text-muted-foreground'
            )}
          />
        </div>
        {/* Complete checkmark */}
        {isComplete && (
          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 ring-2 ring-background">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      {/* Phase label */}
      <h4
        className={cn(
          'font-semibold text-sm mb-1',
          isComplete && 'text-green-700 dark:text-green-400',
          hasCurrent && !isComplete && 'text-primary',
          !isComplete && !hasCurrent && 'text-foreground'
        )}
      >
        {PHASE_LABELS[group.phase]}
      </h4>

      {/* Progress badge */}
      <Badge
        variant={isComplete ? 'default' : hasProgress ? 'secondary' : 'outline'}
        className={cn(
          'text-xs',
          isComplete && 'bg-green-500 hover:bg-green-500'
        )}
      >
        {isComplete ? (
          <span className="flex items-center gap-1">
            <Check className="h-3 w-3" /> Done
          </span>
        ) : (
          `${group.completedCount}/${group.totalCount}`
        )}
      </Badge>

      {/* Current indicator */}
      {hasCurrent && !isComplete && (
        <div className="absolute -top-1 -right-1">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        </div>
      )}
    </button>
  );
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

  // Find the first phase with a current step, or first incomplete phase
  const initialPhase = phaseGroups.find(
    (g) => g.steps.some((s) => s.isCurrent) || g.completedCount < g.totalCount
  )?.phase || 'assess';

  const [activePhase, setActivePhase] = useState<JourneyStep['phase'] | null>(initialPhase);

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Phase cards skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border-2 bg-card p-4">
              <div className="flex flex-col items-center">
                <Skeleton className="h-12 w-12 rounded-full mb-2" />
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-5 w-10" />
              </div>
            </div>
          ))}
        </div>
        {/* Steps skeleton */}
        <div className="rounded-lg border bg-card p-4 space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleStepClick = (step: JourneyStep) => {
    if (step.isLocked) return;

    if (step.isPremium && !isPremium) {
      navigate(`/pricing?return_url=${encodeURIComponent(step.href)}`);
    } else {
      navigate(step.href);
    }
  };

  const handlePhaseClick = (phase: JourneyStep['phase']) => {
    setActivePhase(activePhase === phase ? null : phase);
  };

  const activeGroup = phaseGroups.find((g) => g.phase === activePhase);

  return (
    <div className="space-y-4">
      {/* Phase cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {phaseGroups.map((group) => {
          const hasCurrent = group.steps.some((s) => s.isCurrent);
          return (
            <PhaseCard
              key={group.phase}
              group={group}
              isActive={activePhase === group.phase}
              hasCurrent={hasCurrent}
              onClick={() => handlePhaseClick(group.phase)}
            />
          );
        })}
      </div>

      {/* Expandable steps panel */}
      {activePhase && activeGroup && (
        <div className="animate-in slide-in-from-top-2 fade-in-0 duration-200 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b">
            {(() => {
              const PhaseIcon = PHASE_ICONS[activeGroup.phase];
              return (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <PhaseIcon className="h-4 w-4 text-primary" />
                </div>
              );
            })()}
            <h3 className="font-semibold text-foreground">
              {PHASE_LABELS[activeGroup.phase]}
            </h3>
            <span className="text-sm text-muted-foreground">
              — {activeGroup.completedCount}/{activeGroup.totalCount} complete
            </span>
          </div>
          <div className="space-y-2">
            {activeGroup.steps.map((step) => (
              <StepRow
                key={step.id}
                step={step}
                isPremium={isPremium}
                onClick={() => handleStepClick(step)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
