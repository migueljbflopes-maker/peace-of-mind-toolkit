/**
 * Vault sync hook - handles syncing encrypted data between local cache and Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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

  // Save section locally and sync to Supabase if online
  const saveSection = useCallback(async (
    section: VaultSection, 
    payload: EncryptedPayload
  ): Promise<{ savedLocally: boolean; synced: boolean }> => {
    // Always save to local cache first
    await saveSectionToCache(section, payload, null);
    
    let synced = false;
    
    // Sync to Supabase if online and authenticated
    if (isOnline && isAuthenticated && isPremium && user) {
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
    }
    
    await loadSectionStatuses();
    return { savedLocally: true, synced };
  }, [isOnline, isAuthenticated, isPremium, user, loadSectionStatuses]);

  // Sync from Supabase to local cache
  const syncFromCloud = useCallback(async (): Promise<boolean> => {
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
  }, [isOnline, isAuthenticated, isPremium, user, loadSectionStatuses]);

  // Sync local changes to cloud
  const syncToCloud = useCallback(async (): Promise<boolean> => {
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
  }, [isOnline, isAuthenticated, isPremium, user, loadSectionStatuses]);

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
    getSection,
    saveSection,
    sync,
    syncFromCloud,
    syncToCloud,
    refresh: loadSectionStatuses,
  };
}
