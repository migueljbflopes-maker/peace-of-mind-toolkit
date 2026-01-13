import { CheckCircle2, Target } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardHeaderProps {
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  loading: boolean;
}

export function DashboardHeader({
  completedCount,
  totalCount,
  progressPercent,
  loading,
}: DashboardHeaderProps) {
  const isComplete = completedCount === totalCount && totalCount > 0;

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-6 transition-colors',
        isComplete && 'border-green-500/50 bg-green-500/5'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isComplete ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {isComplete ? 'Fully Prepared!' : 'Your Preparedness Journey'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isComplete
                ? 'You have completed all steps'
                : 'Follow these steps to be ready for anything'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span
            className={cn(
              'text-2xl font-bold',
              isComplete ? 'text-green-500' : 'text-primary'
            )}
          >
            {completedCount}/{totalCount}
          </span>
          <p className="text-sm text-muted-foreground">{progressPercent}% complete</p>
        </div>
      </div>
      <Progress
        value={progressPercent}
        className={cn('h-2', isComplete && '[&>div]:bg-green-500')}
      />
    </div>
  );
}
