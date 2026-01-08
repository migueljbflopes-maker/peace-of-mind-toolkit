import React, { useEffect, useState } from 'react';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface InterstitialStepProps {
  sectionId: string;
  title: string;
  subtitle: string;
  whyMatters: string;
  tip: string;
  onComplete: () => void;
  duration?: number; // ms, default 3000
}

const sectionColors: Record<string, { bg: string; accent: string; icon: string }> = {
  location: { bg: 'from-blue-500/10 to-blue-600/5', accent: 'bg-blue-500', icon: 'text-blue-500' },
  household: { bg: 'from-violet-500/10 to-violet-600/5', accent: 'bg-violet-500', icon: 'text-violet-500' },
  mobility: { bg: 'from-amber-500/10 to-amber-600/5', accent: 'bg-amber-500', icon: 'text-amber-500' },
  preparedness: { bg: 'from-emerald-500/10 to-emerald-600/5', accent: 'bg-emerald-500', icon: 'text-emerald-500' },
};

export default function InterstitialStep({
  sectionId,
  title,
  subtitle,
  whyMatters,
  tip,
  onComplete,
  duration = 3500,
}: InterstitialStepProps) {
  const [progress, setProgress] = useState(0);
  const colors = sectionColors[sectionId] || sectionColors.location;

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      
      if (elapsed >= duration) {
        clearInterval(interval);
        onComplete();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-8">
      {/* Gradient background card */}
      <div className={cn(
        "w-full max-w-md p-6 rounded-2xl bg-gradient-to-br border border-border/50 shadow-sm",
        colors.bg
      )}>
        {/* Section badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className={cn("w-2 h-2 rounded-full", colors.accent)} />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {sectionId === 'location' ? 'Section 1' : 
             sectionId === 'household' ? 'Section 2' : 
             sectionId === 'mobility' ? 'Section 3' : 'Section 4'}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-6">{subtitle}</p>

        {/* Why this matters */}
        <div className="p-3 rounded-lg bg-background/60 border border-border/50 mb-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Why this matters:</span> {whyMatters}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">Updating your risk model…</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Tip */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <Lightbulb className={cn("h-4 w-4 mt-0.5 flex-shrink-0", colors.icon)} />
          <p className="text-xs text-foreground leading-relaxed">
            <span className="font-medium">Tip:</span> {tip}
          </p>
        </div>
      </div>

      {/* Skip button */}
      <button
        onClick={onComplete}
        className="mt-4 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Skip <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}
