import React, { useEffect, useState } from 'react';
import { Check, Loader2, Shield, MapPin, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface AnalyzingScreenProps {
  onComplete: () => void;
  city?: string;
  duration?: number; // ms, default 4000
}

const steps = [
  { id: 'scoring', label: 'Scoring readiness', icon: Shield },
  { id: 'location', label: 'Checking location context', icon: MapPin },
  { id: 'steps', label: 'Building next steps', icon: ClipboardList },
];

export default function AnalyzingScreen({
  onComplete,
  city,
  duration = 4500,
}: AnalyzingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    const startTime = Date.now();
    const stepDuration = duration / steps.length;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);

      // Mark steps as complete
      const currentStep = Math.floor(elapsed / stepDuration);
      const newCompleted = steps.slice(0, currentStep).map(s => s.id);
      setCompletedSteps(newCompleted);

      if (elapsed >= duration) {
        clearInterval(interval);
        setCompletedSteps(steps.map(s => s.id));
        setTimeout(onComplete, 300);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onComplete]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm text-center">
        {/* Main spinner */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-muted" />
          <div 
            className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"
            style={{ animationDuration: '1s' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-foreground mb-2">
          Analyzing your risk & readiness
        </h2>
        {city && (
          <p className="text-sm text-muted-foreground mb-6">
            for {city}
          </p>
        )}

        {/* Progress bar */}
        <Progress value={progress} className="h-2 mb-6" />

        {/* Step checklist */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isComplete = completedSteps.includes(step.id);
            const isCurrent = !isComplete && completedSteps.length === index;
            
            return (
              <div 
                key={step.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all duration-300",
                  isComplete ? "bg-primary/5" : isCurrent ? "bg-muted/50" : "opacity-50"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                  isComplete ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <step.icon className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  isComplete ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Calm message */}
        <p className="text-xs text-muted-foreground mt-6">
          This takes just a moment…
        </p>
      </div>
    </div>
  );
}
