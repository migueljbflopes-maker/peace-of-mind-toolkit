import React from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  sectionTitle?: string;
  readinessPreview?: number | null;
}

export default function WizardProgress({
  currentStep,
  totalSteps,
  sectionTitle,
  readinessPreview,
}: WizardProgressProps) {
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;
  
  return (
    <div className="space-y-3">
      {/* Top row: section + step counter + readiness chip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {sectionTitle && (
            <span className="text-xs font-medium text-primary uppercase tracking-wide">
              {sectionTitle}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Readiness preview chip */}
          {readinessPreview !== null && (
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
              readinessPreview >= 60 
                ? "bg-green-100 text-green-700 border border-green-200" 
                : readinessPreview >= 30 
                ? "bg-amber-100 text-amber-700 border border-amber-200"
                : "bg-muted text-muted-foreground border border-border"
            )}>
              <span className="w-2 h-2 rounded-full bg-current opacity-60" />
              <span>{readinessPreview}% ready</span>
            </div>
          )}
          
          {/* Step counter */}
          <span className="text-sm text-muted-foreground font-medium">
            {currentStep + 1} / {totalSteps}
          </span>
        </div>
      </div>
      
      {/* Progress bar */}
      <Progress value={progressPercent} className="h-1.5" />
    </div>
  );
}
