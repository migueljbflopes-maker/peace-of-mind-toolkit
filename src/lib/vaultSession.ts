/**
 * Vault session state management
 * 
 * SECURITY: 
 * - Passphrase is NEVER persisted
 * - Derived key is kept in memory only
 * - Auto-lock after 10 minutes of inactivity
 */

import { decryptJSON } from './crypto';

const AUTO_LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

type VaultSessionListener = (unlocked: boolean) => void;

class VaultSession {
  private derivedKey: CryptoKey | null = null;
  private passphrase: string | null = null;
  private autoLockTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<VaultSessionListener> = new Set();
  private lastActivity: number = Date.now();

  isUnlocked(): boolean {
    // For first-time users, derivedKey will be null but passphrase will be set
    return this.passphrase !== null;
  }

  async unlock(passphrase: string, testPayload?: { saltB64: string; ivB64: string; ciphertextB64: string }): Promise<boolean> {
    try {
      // If we have encrypted data, try to decrypt to validate passphrase
      // AES-GCM will fail with auth tag mismatch if passphrase is wrong
      if (testPayload) {
        await decryptJSON({
          saltB64: testPayload.saltB64,
          ivB64: testPayload.ivB64,
          ciphertextB64: testPayload.ciphertextB64,
          version: 1
        }, passphrase);
      }
      
      // Store passphrase in memory (never persisted)
      this.passphrase = passphrase;
      this.derivedKey = null; // Will derive on-demand per section
      
      this.resetAutoLockTimer();
      this.notifyListeners();
      return true;
    } catch {
      // Decryption failed = wrong passphrase (AES-GCM auth failure)
      return false;
    }
  }

  lock(): void {
    this.passphrase = null;
    this.derivedKey = null;
    this.clearAutoLockTimer();
    this.notifyListeners();
  }

  getPassphrase(): string | null {
    if (!this.isUnlocked()) return null;
    this.recordActivity();
    return this.passphrase;
  }

  // Record user activity to reset auto-lock timer
  recordActivity(): void {
    this.lastActivity = Date.now();
    if (this.isUnlocked()) {
      this.resetAutoLockTimer();
    }
  }

  private resetAutoLockTimer(): void {
    this.clearAutoLockTimer();
    this.autoLockTimer = setTimeout(() => {
      this.lock();
    }, AUTO_LOCK_TIMEOUT_MS);
  }

  private clearAutoLockTimer(): void {
    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer);
      this.autoLockTimer = null;
    }
  }

  // Subscribe to lock/unlock state changes
  subscribe(listener: VaultSessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const unlocked = this.isUnlocked();
    this.listeners.forEach(listener => listener(unlocked));
  }

  // Get time until auto-lock (for UI display)
  getTimeUntilLock(): number {
    if (!this.isUnlocked()) return 0;
    const elapsed = Date.now() - this.lastActivity;
    return Math.max(0, AUTO_LOCK_TIMEOUT_MS - elapsed);
  }
}

// Singleton instance
export const vaultSession = new VaultSession();

// React hook helpers
export function isVaultUnlocked(): boolean {
  return vaultSession.isUnlocked();
}

export async function unlockVault(
  passphrase: string, 
  testPayload?: { saltB64: string; ivB64: string; ciphertextB64: string }
): Promise<boolean> {
  return vaultSession.unlock(passphrase, testPayload);
}

export function lockVault(): void {
  vaultSession.lock();
}

export function getVaultPassphrase(): string | null {
  return vaultSession.getPassphrase();
}

export function recordVaultActivity(): void {
  vaultSession.recordActivity();
}
