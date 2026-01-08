import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  Shield, 
  CheckCircle2, 
  Lock, 
  Sparkles,
  MapPin,
  ClipboardList,
  ChevronDown,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { WizardResult } from './types';

interface WizardResultsProps {
  result: WizardResult;
  isPremium: boolean;
  onBack: () => void;
  onShowPaywall: () => void;
  onShowLogin: () => void;
}

// Placeholder content for blur preview (never real data for free users)
const PLACEHOLDER_DRIVERS = [
  'Urban density affects resource distribution speed',
  'Regional power grid reliability assessment',
  'Local emergency response capacity analysis',
];

const PLACEHOLDER_ACTIONS = [
  'Create a household communication plan with backup contacts',
  'Build a 14-day water reserve (minimum 3L per person per day)',
  'Prepare a grab-bag with essential documents and supplies',
];

export default function WizardResults({
  result,
  isPremium,
  onBack,
  onShowPaywall,
  onShowLogin,
}: WizardResultsProps) {
  const navigate = useNavigate();
  const [showResultsBadge, setShowResultsBadge] = useState(true);
  const [premiumCardVisible, setPremiumCardVisible] = useState(false);
  const [showAllPriorities, setShowAllPriorities] = useState(false);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const hasAnimatedRef = useRef(false);

  const scoreStyle = getScoreStyle(result.riskLevel);
  const scoreLabel = result.readinessScore >= 60 ? 'Well Prepared' : result.readinessScore >= 30 ? 'Partially Ready' : 'Needs Attention';
  
  const breakdownItems = [
    { key: 'location', label: 'Location', value: result.breakdown.location_context },
    { key: 'household', label: 'Household', value: result.breakdown.household_complexity },
    { key: 'mobility', label: 'Mobility', value: result.breakdown.mobility_constraints },
    { key: 'supplies', label: 'Supplies', value: result.breakdown.preparedness_autonomy },
  ];

  const locationLabel = [result.inputs.city, result.inputs.postal_code].filter(Boolean).join(', ');

  // Animation effects - run once on mount
  useEffect(() => {
    if (hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;
    
    // Hide badge after 3s
    const badgeTimer = setTimeout(() => setShowResultsBadge(false), 3000);
    
    // Show premium card with delay for slide-up effect
    const premiumTimer = setTimeout(() => setPremiumCardVisible(true), 300);
    
    // Simulate location context loading
    const contextTimer = setTimeout(() => setIsLoadingContext(false), 1500);
    
    return () => {
      clearTimeout(badgeTimer);
      clearTimeout(premiumTimer);
      clearTimeout(contextTimer);
    };
  }, []);

  // Visible priorities (2 above fold, rest in accordion)
  const visiblePriorities = result.topDrivers.slice(0, 2);
  const hiddenPriorities = result.topDrivers.slice(2);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Hero Visual Strip */}
      <div className="md:hidden bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 px-4 py-2.5 flex items-center gap-3 border-b border-border/30">
        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <p className="text-xs text-muted-foreground leading-tight">
          <span className="font-medium text-foreground">Preparedness is a sprint.</span> Small steps this week make a big difference.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-3 py-3 md:px-4 md:py-4">
        {/* Results Ready Badge - animated */}
        {showResultsBadge && (
          <div className="flex justify-center mb-2 animate-fade-in">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary animate-scale-in">
              <Sparkles className="h-3.5 w-3.5" />
              Your results are ready
            </div>
          </div>
        )}

        {/* Back button */}
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        {/* Hero Section - Desktop: 2 columns, Mobile: stacked */}
        <div className="grid md:grid-cols-[1fr,auto] gap-3 mb-3">
          {/* Left: Score + Breakdown */}
          <Card className="p-3 md:p-4 bg-gradient-to-br from-muted/30 to-muted/10 border-border/50">
            <div className="flex items-start gap-3">
              {/* Score ring - compact */}
              <div className="relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 flex-shrink-0">
                <svg className="w-14 h-14 md:w-16 md:h-16 transform -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="24"
                    stroke="currentColor"
                    strokeWidth="5"
                    fill="none"
                    className="text-muted/50"
                  />
                  <circle
                    cx="50%"
                    cy="50%"
                    r="24"
                    stroke="currentColor"
                    strokeWidth="5"
                    fill="none"
                    strokeLinecap="round"
                    className="text-primary transition-all duration-700"
                    strokeDasharray={`${(result.readinessScore / 100) * 151} 151`}
                  />
                </svg>
                <span className="absolute text-lg md:text-xl font-bold text-foreground">{result.readinessScore}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border mb-1",
                  scoreStyle.bg, scoreStyle.color, scoreStyle.border
                )}>
                  {scoreLabel}
                </div>
                
                {/* Compact breakdown bars */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2">
                  {breakdownItems.map(item => (
                    <div key={item.key}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="text-foreground font-medium">{item.value}%</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-700" 
                          style={{ width: `${item.value}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Why this score - compact, max 3 bullets */}
            {locationLabel && (
              <div className="mt-3 pt-3 border-t border-border/30">
                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">Why this score for {locationLabel}</span>
                </div>
                
                {isLoadingContext ? (
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
                      <div className="w-2.5 h-2.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                      <span>Analyzing location context…</span>
                    </div>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    <li className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <div className="w-1 h-1 rounded-full bg-primary/70 mt-1.5 flex-shrink-0" />
                      <span>Your score is based on your preparedness answers</span>
                    </li>
                    <li className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <div className="w-1 h-1 rounded-full bg-primary/70 mt-1.5 flex-shrink-0" />
                      <span>Household size and mobility factors considered</span>
                    </li>
                    <li className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <div className="w-1 h-1 rounded-full bg-primary/70 mt-1.5 flex-shrink-0" />
                      <span>Supply readiness affects overall resilience</span>
                    </li>
                  </ul>
                )}
              </div>
            )}
          </Card>

          {/* Desktop: Side illustration */}
          <div className="hidden md:flex flex-col items-center justify-center w-32 p-3 rounded-xl bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 border border-border/30">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-2">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <p className="text-[10px] text-center text-muted-foreground leading-tight">
              Small steps today build lasting resilience
            </p>
          </div>
        </div>

        {/* Top Priorities - compact, 2 visible */}
        <Card className="p-3 mb-3 bg-background border-border/50">
          <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Top priorities
          </h3>
          <ul className="space-y-1.5">
            {visiblePriorities.map((driver, i) => (
              <li key={driver.key} className="flex items-start gap-2 text-xs">
                <div className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <span className="text-muted-foreground leading-tight">{driver.priority}</span>
              </li>
            ))}
          </ul>
          
          {hiddenPriorities.length > 0 && (
            <button
              onClick={() => setShowAllPriorities(!showAllPriorities)}
              className="flex items-center gap-1 mt-2 text-[10px] text-primary hover:text-primary/80 transition-colors"
            >
              <ChevronDown className={cn("h-3 w-3 transition-transform", showAllPriorities && "rotate-180")} />
              {showAllPriorities ? 'Hide' : `See ${hiddenPriorities.length} more`}
            </button>
          )}
          
          {showAllPriorities && (
            <ul className="space-y-1.5 mt-2 pt-2 border-t border-border/30 animate-fade-in">
              {hiddenPriorities.map((driver, i) => (
                <li key={driver.key} className="flex items-start gap-2 text-xs">
                  <div className="w-4 h-4 rounded-full bg-muted text-muted-foreground text-[10px] font-medium flex items-center justify-center flex-shrink-0">
                    {i + 3}
                  </div>
                  <span className="text-muted-foreground leading-tight">{driver.priority}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Premium Insights Section - slide-up animation */}
        <div
          className={cn(
            "transition-all duration-500 ease-out",
            premiumCardVisible 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-3"
          )}
        >
          <Card className="p-3 md:p-4 border-primary/20 bg-gradient-to-br from-primary/3 via-background to-primary/5 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Personalized Risk Analysis Insights & Plan</h3>
                <p className="text-[10px] text-muted-foreground">City-specific drivers + 72h plan + Plan A/B routes</p>
              </div>
              {!isPremium && (
                <span className="px-2 py-0.5 text-[9px] font-semibold rounded-full bg-primary text-primary-foreground">
                  Premium
                </span>
              )}
            </div>

            {/* Two blurred preview blocks */}
            <div className="grid md:grid-cols-2 gap-2 mb-3">
              {/* City Risk Drivers */}
              <div className="relative p-3 rounded-lg border border-border/50 bg-background/60">
                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">City Risk Drivers (deep dive)</span>
                </div>
                <ul className="space-y-1">
                  {(isPremium ? (result as any).locationDrivers || PLACEHOLDER_DRIVERS : PLACEHOLDER_DRIVERS).slice(0, 3).map((driver: string, i: number) => (
                    <li key={i} className={cn(
                      "text-[11px] text-muted-foreground flex items-start gap-1.5",
                      !isPremium && "select-none"
                    )}>
                      <div className="w-1 h-1 rounded-full bg-primary/60 mt-1.5 flex-shrink-0" />
                      <span className={cn(!isPremium && "blur-[5px]")}>{driver}</span>
                    </li>
                  ))}
                </ul>
                
                {!isPremium && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/80 to-background/40 rounded-lg">
                    <Lock className="h-5 w-5 text-primary/50" />
                  </div>
                )}
              </div>

              {/* Action Plan */}
              <div className="relative p-3 rounded-lg border border-border/50 bg-background/60">
                <div className="flex items-center gap-1.5 mb-2">
                  <ClipboardList className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">Action plan (72h + 14 days)</span>
                </div>
                <ul className="space-y-1">
                  {(isPremium ? (result as any).actionPlan || PLACEHOLDER_ACTIONS : PLACEHOLDER_ACTIONS).slice(0, 3).map((action: string, i: number) => (
                    <li key={i} className={cn(
                      "text-[11px] text-muted-foreground flex items-start gap-1.5",
                      !isPremium && "select-none"
                    )}>
                      <div className="w-3.5 h-3.5 rounded-full border border-primary/30 text-[8px] flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </div>
                      <span className={cn(!isPremium && "blur-[5px]")}>{action}</span>
                    </li>
                  ))}
                </ul>
                
                {!isPremium && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/80 to-background/40 rounded-lg">
                    <Lock className="h-5 w-5 text-primary/50" />
                  </div>
                )}
              </div>
            </div>

            {/* CTA for non-premium */}
            {!isPremium && (
              <div className="flex flex-col sm:flex-row items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/10">
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-xs font-medium text-foreground">Unlock Premium</p>
                  <p className="text-[10px] text-muted-foreground">€49 one-time · No subscription</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={onShowPaywall}
                    size="sm"
                    className="h-8 text-xs px-4"
                  >
                    <Shield className="mr-1.5 h-3.5 w-3.5" />
                    Unlock now
                  </Button>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                  >
                    See what's included
                  </button>
                </div>
              </div>
            )}

            {/* Premium user: show features access */}
            {isPremium && (
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/premium/vault')}
                  className="h-7 text-xs"
                >
                  <Lock className="mr-1 h-3 w-3" /> Vault
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/premium/plans')}
                  className="h-7 text-xs"
                >
                  <ClipboardList className="mr-1 h-3 w-3" /> Plans
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/premium/red-folder')}
                  className="h-7 text-xs"
                >
                  <AlertTriangle className="mr-1 h-3 w-3" /> Red Folder
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Free next step - minimal */}
        <div className="flex items-center justify-between gap-3 p-2.5 mt-3 rounded-lg bg-muted/30 border border-border/30">
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" />
            <div>
              <span className="text-xs font-medium text-foreground">Build supplies plan</span>
              <span className="text-[10px] text-muted-foreground ml-1">Free</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/tools/supplies')}
            className="h-7 text-xs"
          >
            Start
          </Button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
          <p>Planning aid — follow local authorities' guidance.</p>
          <button 
            onClick={onShowLogin}
            className="hover:text-foreground underline transition-colors"
          >
            Save progress
          </button>
        </div>
      </div>
    </div>
  );
}

function getScoreStyle(level: string) {
  switch (level) {
    case 'Low': return { color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200' };
    case 'Medium': return { color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200' };
    case 'High': return { color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200' };
    default: return { color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' };
  }
}
