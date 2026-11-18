/**
 * RecoveryKitRenewalCard
 *
 * "Create a new Recovery Kit" for a vault that is already unlocked (backlog
 * F-10): for users who lost their kit, and for accounts whose master password
 * was created by the earlier version that never showed one.
 *
 * Asks for the Master Password again, then hands the new words to the page
 * through `onReady`. The page shows them with RecoveryKitPanel; the recovery
 * columns on the server are replaced only when the user confirms there. Until
 * then the previous kit keeps working.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LifeBuoy, Loader2 } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { useVaultKey, type PendingRecoveryKit } from '@/contexts/VaultKeyContext';
import { recoveryKitErrorMessage } from './recoveryKitMessages';

interface RecoveryKitRenewalCardProps {
  /** New words, in memory only, and the write that makes them the kit. */
  onReady: (kit: PendingRecoveryKit) => void;
}

export function RecoveryKitRenewalCard({ onReady }: RecoveryKitRenewalCardProps) {
  const { t } = useLocale();
  const { beginRecoveryKitRenewal } = useVaultKey();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    setOpen(false);
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    const result = await beginRecoveryKitRenewal(password);
    setBusy(false);
    if (result.ok === true) {
      close();
      onReady(result);
    } else {
      setPassword('');
      setError(recoveryKitErrorMessage(t, result));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <LifeBuoy className="h-4 w-4" />
          {t.recoveryKit.cardTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t.recoveryKit.cardDescription}</p>
        <p className="text-xs text-muted-foreground">{t.recoveryKit.cardReplaces}</p>
        <Button variant="outline" className="w-full gap-2" onClick={() => setOpen(true)}>
          <LifeBuoy className="h-4 w-4" />
          {t.recoveryKit.cardButton}
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.recoveryKit.dialogTitle}</DialogTitle>
            <DialogDescription>{t.recoveryKit.dialogDescription}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="renew-kit-master-password">{t.recoveryKit.dialogPasswordLabel}</Label>
              <Input
                id="renew-kit-master-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={busy}
                autoFocus
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={!password || busy}>
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t.recoveryKit.dialogChecking}
                </>
              ) : (
                t.recoveryKit.dialogContinue
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
