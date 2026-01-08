import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  Shield, 
  CheckCircle2, 
  Lock, 
  Sparkles,
  ClipboardList,
  Contact,
  Stethoscope,
  Route,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { WizardResult, TopDriver } from './types';

interface WizardResultsProps {
  result: WizardResult;
  isPremium: boolean;
  onBack: () => void;
  onShowPaywall: () => void;
  onShowLogin: () => void;
}

export default function WizardResults({
  result,
  isPremium,
  onBack,
  onShowPaywall,
  onShowLogin,
}: WizardResultsProps) {
  const navigate = useNavigate();
  
  const scoreStyle = getScoreStyle(result.riskLevel);
  
  const breakdownItems = [
    { key: 'location_context', label: 'Location & Context', value: result.breakdown.location_context },
    { key: 'household_complexity', label: 'Household Needs', value: result.breakdown.household_complexity },
    { key: 'mobility_constraints', label: 'Mobility', value: result.breakdown.mobility_constraints },
    { key: 'preparedness_autonomy', label: 'Supplies & Readiness', value: result.breakdown.preparedness_autonomy },
  ];

  const premiumPreviewItems = [
    { icon: ClipboardList, label: 'Plan Summary' },
    { icon: Contact, label: 'Contacts' },
    { icon: Stethoscope, label: 'Medical' },
    { icon: CheckCircle2, label: 'Essentials' },
    { icon: Route, label: 'Plans A/B' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Your Readiness Check</h1>
        </div>

        {/* Score Card */}
        <Card className="p-4 mb-4 bg-[#F8FAFC] border-border/50">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-background border-2 border-primary/20">
              <span className="text-2xl font-bold text-foreground">{result.readinessScore}</span>
            </div>
            <div>
              <div className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                scoreStyle.bg, scoreStyle.color, scoreStyle.border
              )}>
                {result.readinessScore >= 60 ? 'Well Prepared' : result.readinessScore >= 30 ? 'Partially Ready' : 'Needs Attention'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Readiness Score</p>
            </div>
          </div>

          {/* 4-Dimension Breakdown Bars */}
          <div className="space-y-2">
            {breakdownItems.map(item => (
              <div key={item.key}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="text-foreground font-medium">{item.value}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary/70 rounded-full transition-all duration-500" 
                    style={{ width: `${item.value}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Drivers / Priorities */}
        <Card className="p-4 mb-4 bg-background border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-3">Top priorities</h3>
          <ul className="space-y-2">
            {result.topDrivers.map((driver, i) => (
              <li key={driver.key} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>{driver.priority}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Premium or Next Steps */}
        {isPremium ? (
          <Card className="p-5 mb-5 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Your Premium Features</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Continue building your personalized plan with your premium tools.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { icon: Lock, label: 'Vault', href: '/premium/vault' },
                { icon: Route, label: 'Plans A & B', href: '/premium/plans' },
                { icon: FileText, label: 'Red Folder', href: '/premium/red-folder' },
                { icon: Shield, label: 'Backup', href: '/premium/backup' },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => navigate(item.href)}
                  className="flex items-center gap-2 p-3 rounded-lg bg-background/60 border border-border/50 hover:border-primary/50 transition-colors text-left"
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </button>
              ))}
            </div>
            <Button onClick={() => navigate('/premium/plans')} className="w-full">
              Continue to Plans
            </Button>
          </Card>
        ) : (
          <Card className="p-5 mb-5 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/8 to-primary/5 shadow-md">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Personalized Resiliency Plan</h3>
              <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                Premium
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              Printable offline PDF + encrypted Vault + Plans A & B.
            </p>

            {/* Price badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                €49 one-time
              </span>
              <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-muted text-muted-foreground">
                No subscription
              </span>
            </div>

            {/* Feature list */}
            <ul className="space-y-2 mb-4">
              {[
                "Printable offline 'Red Folder' PDF",
                "Encrypted Vault (IDs, contacts, medical basics)",
                "Plans A & B (exit + emergency)",
                "Encrypted backup & restore",
                "Premium insights (personalized explanation + next steps)",
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {/* Preview grid */}
            <div className="grid grid-cols-5 gap-2 mb-5">
              {premiumPreviewItems.map((item, i) => (
                <div key={i} className="flex flex-col items-center p-2 rounded-lg bg-background/60 border border-border/50">
                  <item.icon className="h-5 w-5 text-primary/70 mb-1" />
                  <span className="text-[10px] text-muted-foreground text-center leading-tight">{item.label}</span>
                </div>
              ))}
            </div>

            {/* AI Insights locked teaser */}
            <div className="p-3 rounded-lg bg-background/50 border border-primary/10 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Personalized explanation & next steps</span>
                <span className="ml-auto flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-primary/10 text-primary">
                  <Lock className="h-3 w-3" />
                  Premium
                </span>
              </div>
            </div>

            {/* Primary CTA */}
            <Button 
              className="w-full mb-2" 
              size="lg"
              onClick={onShowPaywall}
            >
              <Shield className="mr-2 h-4 w-4" />
              Generate my Resiliency Plan (€49)
            </Button>

            {/* Secondary link */}
            <button 
              onClick={() => navigate('/tools/supplies')}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
            >
              Not now — continue to supplies
            </button>
          </Card>
        )}

        {/* Free next step CTA */}
        <Card className="p-4 mb-4 bg-background border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-foreground">Build your supplies plan</h4>
              <p className="text-xs text-muted-foreground">Free 14-day checklist based on your household</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/tools/supplies')}
            >
              Start
            </Button>
          </div>
        </Card>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center mb-4">
          This is a planning aid — always follow local authorities' guidance.
        </p>

        {/* Save link */}
        <div className="text-center">
          <button 
            onClick={onShowLogin}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Save & continue later
          </button>
        </div>
      </div>
    </div>
  );
}

function getScoreStyle(level: string) {
  switch (level) {
    case 'Low': return { color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' };
    case 'Medium': return { color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' };
    case 'High': return { color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' };
    default: return { color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' };
  }
}
