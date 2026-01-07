/**
 * Vault Setup Form - First-time passphrase creation
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, AlertTriangle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { useVaultSession } from '@/hooks/useVaultSession';
import { toast } from 'sonner';

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

  const isValid = passphrase.length >= 6 && passphrase === confirmPassphrase;

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
