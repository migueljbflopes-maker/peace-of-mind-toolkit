/**
 * Vault Unlock Form Component
 * For returning users who already have encrypted data
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Lock, HelpCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { useVaultSession } from '@/hooks/useVaultSession';
import { getAllCachedSections } from '@/lib/vaultStorage';
import { VaultSetupForm } from './VaultSetupForm';
import { toast } from 'sonner';

interface VaultUnlockFormProps {
  onUnlock: () => void;
}

export function VaultUnlockForm({ onUnlock }: VaultUnlockFormProps) {
  const { t } = useLocale();
  const { unlock } = useVaultSession();
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [checkingFirstTime, setCheckingFirstTime] = useState(true);

  // Check if this is first-time setup
  useEffect(() => {
    const checkFirstTime = async () => {
      try {
        const cached = await getAllCachedSections();
        setIsFirstTime(cached.length === 0);
      } catch {
        setIsFirstTime(true);
      } finally {
        setCheckingFirstTime(false);
      }
    };
    checkFirstTime();
  }, []);

  const handleUnlock = async () => {
    if (!passphrase.trim()) return;
    
    setIsLoading(true);
    try {
      const cached = await getAllCachedSections();
      const testSalt = cached.length > 0 ? cached[0].saltB64 : undefined;
      
      const success = await unlock(passphrase, testSalt);
      
      if (success) {
        onUnlock();
      } else {
        toast.error(t.vault.wrongPassphrase);
      }
    } catch {
      toast.error(t.vault.wrongPassphrase);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking
  if (checkingFirstTime) {
    return (
      <div className="max-w-md mx-auto text-center py-8 text-muted-foreground">
        {t.common.loading}
      </div>
    );
  }

  // Show setup form for first-time users
  if (isFirstTime) {
    return <VaultSetupForm onSetup={onUnlock} />;
  }

  // Show unlock form for returning users
  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-2">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">{t.vault.title}</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {t.vault.lockedExplainer}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Input
              type={showPassphrase ? 'text' : 'password'}
              placeholder={t.vault.passphrasePlaceholder}
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
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
          
          <Button 
            className="w-full" 
            onClick={handleUnlock}
            disabled={!passphrase.trim() || isLoading}
          >
            {isLoading ? t.common.loading : t.vault.unlockVault}
          </Button>

          <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground">
                <HelpCircle className="h-4 w-4" />
                {t.vault.whatIsThis}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  {t.vault.whatIsThisModal.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>• {t.vault.whatIsThisModal.point1}</p>
                <p>• {t.vault.whatIsThisModal.point2}</p>
                <p>• {t.vault.whatIsThisModal.point3}</p>
                <p>• {t.vault.whatIsThisModal.point4}</p>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
