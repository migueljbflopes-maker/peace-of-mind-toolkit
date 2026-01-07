import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye, EyeOff, Shield, AlertTriangle, ChevronRight } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { useVaultSession } from '@/hooks/useVaultSession';

interface Props {
  onNext: () => void;
}

export default function OnboardingStep1Vault({ onNext }: Props) {
  const { t } = useLocale();
  const { isUnlocked, unlock } = useVaultSession();
  
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already unlocked, show success and continue button
  if (isUnlocked) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Shield className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle>{t.onboarding?.vaultReady || 'Vault is ready'}</CardTitle>
          <CardDescription>{t.onboarding?.vaultReadyDesc || 'Your vault is unlocked and ready to use.'}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={onNext} size="lg">
            {t.common.continue}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (passphrase.length < 6) {
      setError(t.vault.setup.tooShort);
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setError(t.vault.setup.noMatch);
      return;
    }

    setLoading(true);
    try {
      const success = await unlock(passphrase);
      if (success) {
        onNext();
      } else {
        setError(t.vault.wrongPassphrase);
      }
    } catch (err) {
      setError(t.vault.setup.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>{t.onboarding?.step1Title || 'Secure your Vault'}</CardTitle>
        <CardDescription>{t.onboarding?.step1Desc || 'Your Vault is encrypted on this device. Choose a passphrase to unlock it.'}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              {t.vault.setup.warning}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="passphrase">{t.vault.setup.createPassphrase}</Label>
            <div className="relative">
              <Input
                id="passphrase"
                type={showPassphrase ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder={t.vault.setup.passphrasePlaceholder}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowPassphrase(!showPassphrase)}
              >
                {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassphrase">{t.vault.setup.confirmPassphrase}</Label>
            <Input
              id="confirmPassphrase"
              type={showPassphrase ? 'text' : 'password'}
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              placeholder={t.vault.setup.confirmPlaceholder}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {t.vault.setup.securityNote}
          </p>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? t.common.loading : (t.onboarding?.setPassphraseContinue || 'Set passphrase & continue')}
            {!loading && <ChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
