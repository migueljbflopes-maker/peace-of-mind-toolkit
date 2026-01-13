/**
 * Global sync status indicator
 * Shows sync state for vault, plans, and drafts
 */

import { Cloud, CloudOff, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type SyncState = 'synced' | 'syncing' | 'pending' | 'offline';

interface SyncStatusIndicatorProps {
  state: SyncState;
  className?: string;
  showLabel?: boolean;
}

const stateConfig: Record<SyncState, { icon: typeof Cloud; color: string; label: string }> = {
  synced: {
    icon: Check,
    color: 'text-green-500',
    label: 'All data synced',
  },
  syncing: {
    icon: Loader2,
    color: 'text-amber-500',
    label: 'Syncing...',
  },
  pending: {
    icon: Cloud,
    color: 'text-amber-500',
    label: 'Changes pending sync',
  },
  offline: {
    icon: CloudOff,
    color: 'text-muted-foreground',
    label: 'Offline - changes saved locally',
  },
};

export function SyncStatusIndicator({ 
  state, 
  className,
  showLabel = false,
}: SyncStatusIndicatorProps) {
  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1.5', className)}>
            <Icon 
              className={cn(
                'h-4 w-4',
                config.color,
                state === 'syncing' && 'animate-spin'
              )} 
            />
            {showLabel && (
              <span className={cn('text-xs', config.color)}>
                {config.label}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Hook to compute overall sync state from multiple sources
export function computeSyncState(sources: {
  isOnline: boolean;
  isSyncing: boolean;
  hasUnsyncedChanges: boolean;
}): SyncState {
  if (!sources.isOnline) return 'offline';
  if (sources.isSyncing) return 'syncing';
  if (sources.hasUnsyncedChanges) return 'pending';
  return 'synced';
}
