import { Lock } from 'lucide-react';
import { PremiumBundleCard } from './PremiumBundleCard';
import { useLocale } from '@/i18n/useLocale';

interface PremiumLockedStateProps {
  title?: string;
}

export function PremiumLockedState({ title }: PremiumLockedStateProps) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {title || t.premium.lockedTitle}
        </h1>
        <p className="text-muted-foreground max-w-md">
          {t.premium.lockedDescription}
        </p>
      </div>
      <div className="w-full max-w-md">
        <PremiumBundleCard />
      </div>
    </div>
  );
}
