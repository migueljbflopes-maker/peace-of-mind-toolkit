import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye, EyeOff, Shield, AlertTriangle, ChevronRight, Copy, Download } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { useVaultKey } from '@/contexts/VaultKeyContext';
import { toast } from 'sonner';

interface Props {
  onNext: () => void;
}

/**
 * Onboarding Step 1 — Master Password setup or unlock.
 *
 * Three sub-states, driven by VaultKeyContext.status:
 *  - 'needs-setup'    → create + confirm Master Password, then show Recovery Phrase
 *  - 'needs-unlock'   → returning user must unlock with their Master Password
 *  - 'unlocked'       → success card, click to continue
 */
export default function OnboardingStep1Vault({ onNext }: Props) {
  const { t } = useLocale();
  const { status, isUnlocked, setup, unlock } = useVaultKey();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Recovery phrase shown right after first-time setup
  const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);
  const [phraseAcknowledged, setPhraseAcknowledged] = useState(false);

  // ── Loading from server ────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardDescription>{t.common.loading}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (isUnlocked && !recoveryPhrase) {
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

  // ── Recovery phrase reveal (post-setup) ────────────────────────────────────
  if (recoveryPhrase) {
    const handleCopy = async () => {
      await navigator.clipboard.writeText(recoveryPhrase);
      toast.success(t.vault?.recovery?.copied || 'Recovery phrase copied');
    };
    const handleDownload = () => {
      const blob = new Blob([recoveryPhrase], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'recovery-phrase.txt';
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Shield className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle>{t.vault?.recovery?.title || 'Save your Recovery Phrase'}</CardTitle>
          <CardDescription>
            {t.vault?.recovery?.description ||
              'These 24 words are the ONLY way to recover your vault if you forget your Master Password. Store them somewhere safe and offline.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
            {recoveryPhrase.split(' ').map((word, i) => (
              <div key={i} className="flex items-baseline gap-1">
                <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                <span>{word}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              {t.common.copy || 'Copy'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              {t.common.download || 'Download'}
            </Button>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {t.vault?.recovery?.warning ||
                'We cannot recover this for you. Without it, forgotten passwords mean lost data forever.'}
            </AlertDescription>
          </Alert>

          <label className="flex items-start gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={phraseAcknowledged}
              onChange={(e) => setPhraseAcknowledged(e.target.checked)}
              className="mt-1"
            />
            <span>
              {t.vault?.recovery?.acknowledge ||
                'I have saved my Recovery Phrase in a safe place.'}
            </span>
          </label>

          <Button
            className="w-full"
            size="lg"
            disabled={!phraseAcknowledged}
            onClick={() => {
              setRecoveryPhrase(null);
              onNext();
            }}
          >
            {t.common.continue}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Setup or Unlock form ───────────────────────────────────────────────────
  const isSetup = status === 'needs-setup';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(t.vault.setup.tooShort);
      return;
    }

    if (isSetup && password !== confirmPassword) {
      setError(t.vault.setup.noMatch);
      return;
    }

    setLoading(true);
    try {
      if (isSetup) {
        const result = await setup(password);
        if (result.ok) {
          setRecoveryPhrase(result.recoveryPhrase);
        } else {
          setError(result.error);
        }
      } else {
        const result = await unlock(password);
        if (!result.ok) {
          setError(result.error);
        }
      }
    } catch {
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
        <CardTitle>
          {isSetup
            ? (t.onboarding?.step1Title || 'Secure your Vault')
            : (t.vault?.unlockVault || 'Unlock your Vault')}
        </CardTitle>
        <CardDescription>
          {isSetup
            ? (t.onboarding?.step1Desc || 'Your Vault is encrypted on this device. Choose a Master Password to unlock it.')
            : (t.vault?.lockedExplainer || 'Enter your Master Password to access your encrypted vault.')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSetup && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                {t.vault.setup.warning}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">
              {isSetup ? t.vault.setup.createPassphrase : (t.vault?.passphrase || 'Master Password')}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.vault.setup.passphrasePlaceholder}
                className="pr-10"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {isSetup && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.vault.setup.confirmPassphrase}</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.vault.setup.confirmPlaceholder}
              />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {t.vault.setup.securityNote}
          </p>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading
              ? t.common.loading
              : isSetup
                ? (t.onboarding?.setPassphraseContinue || 'Set Master Password & continue')
                : (t.vault?.unlock || 'Unlock')}
            {!loading && <ChevronRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
