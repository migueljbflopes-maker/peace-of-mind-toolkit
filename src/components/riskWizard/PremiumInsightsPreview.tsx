import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, MapPin, ClipboardList, Sparkles, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PremiumInsightsPreviewProps {
  isPremium: boolean;
  city?: string;
  locationDrivers?: string[];
  actionPlan?: string[];
  onUnlock: () => void;
}

// Placeholder content for blur preview (never real data for free users)
const PLACEHOLDER_DRIVERS = [
  'Urban density affects resource distribution speed',
  'Regional power grid reliability assessment',
  'Local emergency response capacity analysis',
  'Climate-related risk factors for your area',
];

const PLACEHOLDER_ACTIONS = [
  'Create a household communication plan with backup contacts',
  'Build a 14-day water reserve (minimum 3L per person per day)',
  'Prepare a grab-bag with essential documents and supplies',
  'Identify two evacuation routes and a meeting point',
];

export default function PremiumInsightsPreview({
  isPremium,
  city,
  locationDrivers,
  actionPlan,
  onUnlock,
}: PremiumInsightsPreviewProps) {
  const navigate = useNavigate();

  // Only show real data if premium
  const displayDrivers = isPremium && locationDrivers?.length ? locationDrivers : PLACEHOLDER_DRIVERS;
  const displayActions = isPremium && actionPlan?.length ? actionPlan : PLACEHOLDER_ACTIONS;

  return (
    <Card className="p-5 mb-4 border-primary/20 bg-gradient-to-br from-primary/3 to-primary/8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold text-foreground">Premium Insights</h3>
        {!isPremium && (
          <span className="ml-auto px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
            <Lock className="h-3 w-3" /> Preview
          </span>
        )}
      </div>

      {/* City-specific drivers card */}
      <div className="relative mb-4">
        <div className={cn(
          "p-4 rounded-xl border border-border/50 bg-background/80",
          !isPremium && "select-none"
        )}>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              {city ? `Risk drivers for ${city}` : 'City-specific risk drivers'}
            </span>
          </div>
          <ul className="space-y-2">
            {displayDrivers.slice(0, 4).map((driver, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-2 flex-shrink-0" />
                <span className={cn(!isPremium && "blur-[6px]")}>{driver}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Blur overlay for non-premium */}
        {!isPremium && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[2px] rounded-xl">
            <Lock className="h-6 w-6 text-primary/60" />
          </div>
        )}
      </div>

      {/* 72-hour action plan card */}
      <div className="relative mb-4">
        <div className={cn(
          "p-4 rounded-xl border border-border/50 bg-background/80",
          !isPremium && "select-none"
        )}>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">72-hour action plan</span>
          </div>
          <ul className="space-y-2">
            {displayActions.slice(0, 4).map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 rounded-full border border-primary/30 text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <span className={cn(!isPremium && "blur-[6px]")}>{action}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Blur overlay for non-premium */}
        {!isPremium && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[2px] rounded-xl">
            <Lock className="h-6 w-6 text-primary/60" />
          </div>
        )}
      </div>

      {/* CTA for non-premium */}
      {!isPremium && (
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-3">
            Unlock personalized insights tailored to your situation
          </p>
          <Button 
            onClick={onUnlock}
            className="w-full"
            size="lg"
          >
            <Shield className="mr-2 h-4 w-4" />
            Unlock Premium (€49)
          </Button>
          <button
            onClick={() => navigate('/pricing')}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Learn more about Premium
          </button>
        </div>
      )}
    </Card>
  );
}
