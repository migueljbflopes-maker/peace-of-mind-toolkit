/**
 * Vault Unlock Form Component
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Lock, HelpCircle, ShieldCheck } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { useVaultSession } from '@/hooks/useVaultSession';
import { getAllCachedSections } from '@/lib/vaultStorage';
import { toast } from 'sonner';

interface VaultUnlockFormProps {
  onUnlock: () => void;
}

export function VaultUnlockForm({ onUnlock }: VaultUnlockFormProps) {
  const { t } = useLocale();
  const { unlock } = useVaultSession();
  const [passphrase, setPassphrase] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const handleUnlock = async () => {
    if (!passphrase.trim()) return;
    
    setIsLoading(true);
    try {
      // Get existing cached sections to test passphrase against
      const cached = await getAllCachedSections();
      const testSalt = cached.length > 0 ? cached[0].saltB64 : undefined;
      
      // For first-time users without cached data, just accept the passphrase
      // They'll set their passphrase on first save
      const success = await unlock(passphrase, testSalt);
      
      if (success || cached.length === 0) {
        // Force unlock for first-time users
        if (cached.length === 0) {
          await unlock(passphrase);
        }
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
          <Input
            type="password"
            placeholder={t.vault.passphrasePlaceholder}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
          />
          
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
