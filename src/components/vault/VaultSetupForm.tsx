/**
 * Vault Setup Form 2.0 - Enhanced with data loss warnings and storage mode
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { KeyRound, ShieldCheck, Eye, EyeOff, Heart } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { useVaultSession } from '@/hooks/useVaultSession';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { DataLossWarning } from './DataLossWarning';
import { StorageModeSelector } from './StorageModeSelector';
import { VaultStorageMode } from './types';
import { setVaultPreferences, markSetupComplete } from '@/lib/vaultPreferences';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  
  // New states for Vault 2.0
  const [storageMode, setStorageMode] = useState<VaultStorageMode>('device-cloud');
  const [acknowledgedWarning, setAcknowledgedWarning] = useState(false);
  const [sensitiveDataConsent, setSensitiveDataConsent] = useState(false);

  const isValid = 
    passphrase.length >= 6 && 
    passphrase === confirmPassphrase && 
    acknowledgedWarning &&
    sensitiveDataConsent;

  const handleSetup = async () => {
    if (!isValid) return;
    
    setIsLoading(true);
    try {
      // Save preferences first
      setVaultPreferences({
        storageMode,
        acknowledgedDataLossWarning: true,
      });
      
      // First-time setup - just unlock with the new passphrase
      const success = await unlock(passphrase);
      
      if (success) {
        markSetupComplete();
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
    <div className="max-w-lg mx-auto">
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
        <CardContent className="space-y-6">
          {/* Step 1: Storage Mode Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
              Modo de Armazenamento
            </div>
            <StorageModeSelector 
              value={storageMode} 
              onChange={setStorageMode} 
            />
          </div>

          {/* Step 2: Data Loss Warning */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
              Aviso de Segurança
            </div>
            <DataLossWarning 
              variant="setup" 
              acknowledged={acknowledgedWarning}
              onAcknowledge={setAcknowledgedWarning}
            />
          </div>

          {/* Step 3: Passphrase Creation */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">3</span>
              Criar Passphrase
            </div>

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
          </div>

          {/* GDPR Art. 9 Sensitive Data Consent */}
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50">
            <Heart className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
              <p className="mb-3">
                O Vault armazena <strong>dados pessoais sensíveis</strong> incluindo informação de saúde 
                (alergias, medicamentos), documentos de identidade e detalhes financeiros. Estes dados são encriptados 
                no teu dispositivo antes de serem guardados.
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
                  Compreendo e consinto o armazenamento dos meus dados sensíveis de saúde e identidade sob o{' '}
                  <Link to="/privacy" className="underline hover:text-primary" target="_blank">
                    Artigo 9 do GDPR
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

          {/* Footer Warning */}
          <DataLossWarning variant="footer" />
        </CardContent>
      </Card>
    </div>
  );
}
