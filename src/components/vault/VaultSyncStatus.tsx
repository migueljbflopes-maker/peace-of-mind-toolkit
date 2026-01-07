/**
 * Vault Sync Status Component
 */

import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/i18n/useLocale';

interface VaultSyncStatusProps {
  isOnline: boolean;
  isSyncing: boolean;
  hasUnsyncedChanges: boolean;
  onSync: () => void;
}

export function VaultSyncStatus({ isOnline, isSyncing, hasUnsyncedChanges, onSync }: VaultSyncStatusProps) {
  const { t } = useLocale();

  return (
    <div className="flex items-center gap-3">
      {/* Online/Offline indicator */}
      <div className="flex items-center gap-1.5 text-sm">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">{t.vault.sync.online}</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-amber-500" />
            <span className="text-amber-600">{t.vault.sync.offline}</span>
          </>
        )}
      </div>

      {/* Sync status */}
      {isOnline && (
        <div className="flex items-center gap-1.5">
          {hasUnsyncedChanges ? (
            <CloudOff className="h-4 w-4 text-amber-500" />
          ) : (
            <Cloud className="h-4 w-4 text-primary" />
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
            className="h-7 px-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      )}
    </div>
  );
}
