import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Shield } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { useEntitlements } from '@/hooks/useEntitlements';

interface PremiumBundleCardProps {
  compact?: boolean;
}

export function PremiumBundleCard({ compact = false }: PremiumBundleCardProps) {
  const { t } = useLocale();
  const { isPremium } = useEntitlements();

  // Don't show purchase prompts to premium users
  if (isPremium) {
    return null;
  }
  const features = t.premium.features;

  const featureList = [
    features.redFolder,
    features.vault,
    features.plans,
    features.backup,
    features.insights,
    features.alerts,
  ];

  if (compact) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t.premium.title}</h3>
              <p className="text-sm text-muted-foreground">{t.premium.priceNote}</p>
            </div>
          </div>
          <Link to="/pricing">
            <Button className="w-full">{t.premium.unlockCta}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{t.premium.title}</CardTitle>
            <p className="text-2xl font-bold text-primary mt-1">{t.premium.price}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2.5">
          {featureList.map((feature, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">{feature}</span>
            </li>
          ))}
        </ul>
        <Link to="/pricing">
          <Button className="w-full" size="lg">
            {t.premium.unlockCta}
          </Button>
        </Link>
        <p className="text-xs text-center text-muted-foreground">
          {t.premium.priceNote}
        </p>
      </CardContent>
    </Card>
  );
}
