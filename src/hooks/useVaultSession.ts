/**
 * React hook for vault session state
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  vaultSession, 
  isVaultUnlocked as checkVaultUnlocked, 
  unlockVault as doUnlockVault, 
  lockVault as doLockVault,
  getVaultPassphrase,
  recordVaultActivity 
} from '@/lib/vaultSession';

export function useVaultSession() {
  const [isUnlocked, setIsUnlocked] = useState(checkVaultUnlocked());
  const [timeUntilLock, setTimeUntilLock] = useState(vaultSession.getTimeUntilLock());

  // Subscribe to vault state changes
  useEffect(() => {
    const unsubscribe = vaultSession.subscribe((unlocked) => {
      setIsUnlocked(unlocked);
    });

    return unsubscribe;
  }, []);

  // Update time until lock periodically
  useEffect(() => {
    if (!isUnlocked) return;

    const interval = setInterval(() => {
      setTimeUntilLock(vaultSession.getTimeUntilLock());
    }, 1000);

    return () => clearInterval(interval);
  }, [isUnlocked]);

  // Record activity on user interactions
  const recordActivity = useCallback(() => {
    recordVaultActivity();
    setTimeUntilLock(vaultSession.getTimeUntilLock());
  }, []);

  const unlock = useCallback(async (
    passphrase: string, 
    testPayload?: { saltB64: string; ivB64: string; ciphertextB64: string }
  ): Promise<boolean> => {
    const success = await doUnlockVault(passphrase, testPayload);
    if (success) {
      setTimeUntilLock(vaultSession.getTimeUntilLock());
    }
    return success;
  }, []);

  const lock = useCallback(() => {
    doLockVault();
    setTimeUntilLock(0);
  }, []);

  const getPassphrase = useCallback((): string | null => {
    return getVaultPassphrase();
  }, []);

  return {
    isUnlocked,
    timeUntilLock,
    unlock,
    lock,
    getPassphrase,
    recordActivity,
  };
}
