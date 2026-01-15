/**
 * Vault Preferences - Storage mode and user preferences
 */

import { VaultPreferences, VaultStorageMode } from '@/components/vault/types';

const VAULT_PREFERENCES_KEY = 'vault_preferences';

const DEFAULT_PREFERENCES: VaultPreferences = {
  storageMode: 'device-cloud', // Default to cloud backup for peace of mind
  acknowledgedDataLossWarning: false,
  setupCompletedAt: null,
};

export function getVaultPreferences(): VaultPreferences {
  try {
    const stored = localStorage.getItem(VAULT_PREFERENCES_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch {
    console.error('Failed to read vault preferences');
  }
  return { ...DEFAULT_PREFERENCES };
}

export function setVaultPreferences(prefs: Partial<VaultPreferences>): void {
  try {
    const current = getVaultPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(VAULT_PREFERENCES_KEY, JSON.stringify(updated));
  } catch {
    console.error('Failed to save vault preferences');
  }
}

export function setStorageMode(mode: VaultStorageMode): void {
  setVaultPreferences({ storageMode: mode });
}

export function getStorageMode(): VaultStorageMode {
  return getVaultPreferences().storageMode;
}

export function markSetupComplete(): void {
  setVaultPreferences({ 
    setupCompletedAt: new Date().toISOString(),
    acknowledgedDataLossWarning: true 
  });
}

export function isDeviceOnlyMode(): boolean {
  return getStorageMode() === 'device-only';
}

export function shouldSyncToCloud(): boolean {
  return getStorageMode() === 'device-cloud';
}
