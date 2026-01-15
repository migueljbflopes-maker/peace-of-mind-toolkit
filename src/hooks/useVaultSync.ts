/**
 * Vault sync hook - handles syncing encrypted data between local cache and Supabase
 * Respects user's storage mode preference (device-only vs device-cloud)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { 
  getCachedSection, 
  getAllCachedSections, 
  saveSectionToCache, 
  markSectionSynced,
  getUnsyncedSections,
  VaultSectionCache 
} from '@/lib/vaultStorage';
import { EncryptedPayload } from '@/lib/crypto';
import { getStorageMode, VaultStorageMode } from '@/lib/vaultPreferences';

export type VaultSection = 'ids' | 'contacts' | 'medical' | 'finance' | 'devices';

export const VAULT_SECTIONS: VaultSection[] = ['ids', 'contacts', 'medical', 'finance', 'devices'];

export interface VaultSectionStatus {
  section: VaultSection;
  hasData: boolean;
  updatedAt: string | null;
  isSynced: boolean;
}

export function useVaultSync() {
  const { user, isAuthenticated } = useAuth();
  const { isPremium } = useEntitlements();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sectionStatuses, setSectionStatuses] = useState<VaultSectionStatus[]>([]);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  const [storageMode, setStorageModeState] = useState<VaultStorageMode>(getStorageMode());
  
  // Check if cloud sync is enabled based on user preference
  const isCloudSyncEnabled = storageMode === 'device-cloud';
  
  // Refresh storage mode when it might have changed
  const refreshStorageMode = useCallback(() => {
    setStorageModeState(getStorageMode());
  }, []);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load section statuses from local cache
  const loadSectionStatuses = useCallback(async () => {
    const cached = await getAllCachedSections();
    const statuses: VaultSectionStatus[] = VAULT_SECTIONS.map(section => {
      const sectionCache = cached.find(c => c.section === section);
      return {
        section,
        hasData: !!sectionCache,
        updatedAt: sectionCache?.updatedAt || null,
        isSynced: sectionCache ? (sectionCache.syncedAt !== null && 
          new Date(sectionCache.syncedAt) >= new Date(sectionCache.updatedAt)) : true,
      };
    });
    setSectionStatuses(statuses);
    
    const unsynced = await getUnsyncedSections();
    setHasUnsyncedChanges(unsynced.length > 0);
  }, []);

  useEffect(() => {
    loadSectionStatuses();
  }, [loadSectionStatuses]);

  // Get section data from local cache
  const getSection = useCallback(async (section: VaultSection): Promise<VaultSectionCache | null> => {
    return getCachedSection(section);
  }, []);

  // Save section locally and sync to Supabase if online and cloud sync is enabled
  const saveSection = useCallback(async (
    section: VaultSection, 
    payload: EncryptedPayload
  ): Promise<{ savedLocally: boolean; synced: boolean }> => {
    // Always save to local cache first
    await saveSectionToCache(section, payload, null);
    
    let synced = false;
    
    // Only sync to Supabase if cloud sync is enabled AND user is online/authenticated/premium
    if (isCloudSyncEnabled && isOnline && isAuthenticated && isPremium && user) {
      try {
        const { error } = await supabase
          .from('vault_items')
          .upsert({
            user_id: user.id,
            section,
            ciphertext: payload.ciphertextB64,
            iv: payload.ivB64,
            salt: payload.saltB64,
            version: payload.version,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,section',
          });
        
        if (!error) {
          await markSectionSynced(section);
          synced = true;
        }
      } catch {
        // Sync failed, will retry later
      }
    } else if (!isCloudSyncEnabled) {
      // In device-only mode, mark as "synced" locally (no cloud sync needed)
      await markSectionSynced(section);
      synced = true; // Consider it synced since user chose device-only
    }
    
    await loadSectionStatuses();
    return { savedLocally: true, synced };
  }, [isCloudSyncEnabled, isOnline, isAuthenticated, isPremium, user, loadSectionStatuses]);

  // Sync from Supabase to local cache (only if cloud sync enabled)
  const syncFromCloud = useCallback(async (): Promise<boolean> => {
    // Don't sync if user has device-only mode
    if (!isCloudSyncEnabled) return false;
    if (!isOnline || !isAuthenticated || !isPremium || !user) return false;
    
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('vault_items')
        .select('section, ciphertext, iv, salt, version, updated_at')
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      for (const item of data || []) {
        const cached = await getCachedSection(item.section);
        
        // If cloud is newer, update local cache
        if (!cached || new Date(item.updated_at) > new Date(cached.updatedAt)) {
          const payload: EncryptedPayload = {
            ciphertextB64: item.ciphertext,
            ivB64: item.iv,
            saltB64: item.salt,
            version: item.version,
          };
          await saveSectionToCache(item.section, payload, item.updated_at);
        }
      }
      
      await loadSectionStatuses();
      return true;
    } catch {
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isCloudSyncEnabled, isOnline, isAuthenticated, isPremium, user, loadSectionStatuses]);

  // Sync local changes to cloud (only if cloud sync enabled)
  const syncToCloud = useCallback(async (): Promise<boolean> => {
    // Don't sync if user has device-only mode
    if (!isCloudSyncEnabled) return false;
    if (!isOnline || !isAuthenticated || !isPremium || !user) return false;
    
    setIsSyncing(true);
    try {
      const unsynced = await getUnsyncedSections();
      
      for (const cached of unsynced) {
        const { error } = await supabase
          .from('vault_items')
          .upsert({
            user_id: user.id,
            section: cached.section,
            ciphertext: cached.ciphertextB64,
            iv: cached.ivB64,
            salt: cached.saltB64,
            version: cached.version,
            updated_at: cached.updatedAt,
          }, {
            onConflict: 'user_id,section',
          });
        
        if (!error) {
          await markSectionSynced(cached.section);
        }
      }
      
      await loadSectionStatuses();
      return true;
    } catch {
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isCloudSyncEnabled, isOnline, isAuthenticated, isPremium, user, loadSectionStatuses]);

  // Full sync (both directions)
  const sync = useCallback(async (): Promise<boolean> => {
    await syncFromCloud();
    await syncToCloud();
    return true;
  }, [syncFromCloud, syncToCloud]);

  return {
    isOnline,
    isSyncing,
    sectionStatuses,
    hasUnsyncedChanges,
    storageMode,
    isCloudSyncEnabled,
    getSection,
    saveSection,
    sync,
    syncFromCloud,
    syncToCloud,
    refresh: loadSectionStatuses,
    refreshStorageMode,
  };
}
