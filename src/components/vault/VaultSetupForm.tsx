/**
 * Vault Setup Form - First-time passphrase creation
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { KeyRound, AlertTriangle, ShieldCheck, Eye, EyeOff, Heart } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { useVaultSession } from '@/hooks/useVaultSession';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface VaultSetupFormProps {
  onSetup: () => void;
}

export function VaultSetupForm({ onSetup }: VaultSetupFormProps) {
  const { t } = useLocale();
  const { unlock } = useVaultSession();
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sensitiveDataConsent, setSensitiveDataConsent] = useState(false);

  const isValid = passphrase.length >= 6 && passphrase === confirmPassphrase && sensitiveDataConsent;

  const handleSetup = async () => {
    if (!isValid) return;
    
    setIsLoading(true);
    try {
      // First-time setup - just unlock with the new passphrase
      const success = await unlock(passphrase);
      
      if (success) {
        toast.success(t.vault.setup.success);
        onSetup();
      } else {
        toast.error(t.vault.setup.error);
      }
    } catch {
      toast.error(t.vault.setup.error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-2">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">{t.vault.setup.title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {t.vault.setup.subtitle}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning Alert */}
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
              {t.vault.setup.warning}
            </AlertDescription>
          </Alert>

          {/* Passphrase Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.vault.setup.createPassphrase}</label>
            <div className="relative">
              <Input
                type={showPassphrase ? 'text' : 'password'}
                placeholder={t.vault.setup.passphrasePlaceholder}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassphrase(!showPassphrase)}
              >
                {showPassphrase ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {passphrase.length > 0 && passphrase.length < 6 && (
              <p className="text-xs text-destructive">{t.vault.setup.tooShort}</p>
            )}
          </div>

          {/* Confirm Passphrase Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.vault.setup.confirmPassphrase}</label>
            <Input
              type={showPassphrase ? 'text' : 'password'}
              placeholder={t.vault.setup.confirmPlaceholder}
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
            />
            {confirmPassphrase.length > 0 && passphrase !== confirmPassphrase && (
              <p className="text-xs text-destructive">{t.vault.setup.noMatch}</p>
            )}
          </div>

          {/* Security Note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
            <span>{t.vault.setup.securityNote}</span>
          </div>

          {/* GDPR Art. 9 Sensitive Data Consent */}
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50">
            <Heart className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
              <p className="mb-3">
                The Vault stores <strong>sensitive personal data</strong> including health information 
                (allergies, medications), identity documents, and financial details. This data is encrypted 
                on your device before storage.
              </p>
              <div className="flex items-start gap-3 mt-2 pt-2 border-t border-amber-300 dark:border-amber-800">
                <Checkbox
                  id="sensitive-consent"
                  checked={sensitiveDataConsent}
                  onCheckedChange={(checked) => setSensitiveDataConsent(!!checked)}
                  className="mt-0.5 border-amber-400"
                />
                <Label 
                  htmlFor="sensitive-consent" 
                  className="text-amber-900 dark:text-amber-100 cursor-pointer leading-relaxed"
                >
                  I understand and consent to storing my sensitive health and identity data under{' '}
                  <Link to="/privacy" className="underline hover:text-primary" target="_blank">
                    GDPR Article 9
                  </Link>
                </Label>
              </div>
            </AlertDescription>
          </Alert>

          <Button 
            className="w-full" 
            onClick={handleSetup}
            disabled={!isValid || isLoading}
          >
            {isLoading ? t.common.loading : t.vault.setup.createVault}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
