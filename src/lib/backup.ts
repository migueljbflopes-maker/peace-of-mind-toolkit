/**
 * Encrypted Backup & Restore Module
 * 
 * SECURITY:
 * - Backup bundle contains ciphertext payloads only (already encrypted per-section)
 * - Bundle is encrypted AGAIN as a whole (defense-in-depth)
 * - Server stores only double-encrypted ciphertext
 * - Passphrase never transmitted or stored
 */

import { supabase } from '@/integrations/supabase/client';
import { encryptJSON, decryptJSON, EncryptedPayload } from './crypto';
import { getAllCachedSections, saveSectionToCache, VaultSectionCache } from './vaultStorage';
import { getAllCachedPlans, savePlanToCache, PlanCache, PlanType } from './plansStore';
import { getVaultPassphrase } from './vaultSession';

const BACKUP_VERSION = 1;

// Types for backup bundle
export interface VaultSectionPayload {
  ciphertextB64: string;
  ivB64: string;
  saltB64: string;
  version: number;
  updatedAt: string;
}

export interface PlanPayload {
  ciphertextB64: string;
  ivB64: string;
  saltB64: string;
  version: number;
  updatedAt: string;
}

export interface BackupBundle {
  version: number;
  createdAt: string;
  vault: {
    ids?: VaultSectionPayload;
    contacts?: VaultSectionPayload;
    medical?: VaultSectionPayload;
    finance?: VaultSectionPayload;
    devices?: VaultSectionPayload;
  };
  plans: {
    A?: PlanPayload;
    B?: PlanPayload;
  };
}

export interface LocalDataSummary {
  vaultSectionCount: number;
  planCount: number;
  vaultSections: string[];
  plans: string[];
}

export interface BackupInfo {
  id: string;
  createdAt: string;
  version: number;
}

// Get summary of local encrypted data
export async function getLocalDataSummary(): Promise<LocalDataSummary> {
  const vaultSections = await getAllCachedSections();
  const plans = await getAllCachedPlans();
  
  return {
    vaultSectionCount: vaultSections.length,
    planCount: plans.length,
    vaultSections: vaultSections.map(s => s.section),
    plans: plans.map(p => p.planType),
  };
}

// Build the backup bundle from local encrypted cache (no decryption)
async function buildBackupBundle(): Promise<BackupBundle> {
  const vaultSections = await getAllCachedSections();
  const plans = await getAllCachedPlans();
  
  const bundle: BackupBundle = {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    vault: {},
    plans: {},
  };
  
  // Add vault sections (already encrypted per-section)
  for (const section of vaultSections) {
    const payload: VaultSectionPayload = {
      ciphertextB64: section.ciphertextB64,
      ivB64: section.ivB64,
      saltB64: section.saltB64,
      version: section.version,
      updatedAt: section.updatedAt,
    };
    
    if (section.section === 'ids') bundle.vault.ids = payload;
    if (section.section === 'contacts') bundle.vault.contacts = payload;
    if (section.section === 'medical') bundle.vault.medical = payload;
    if (section.section === 'finance') bundle.vault.finance = payload;
    if (section.section === 'devices') bundle.vault.devices = payload;
  }
  
  // Add plans (already encrypted)
  for (const plan of plans) {
    const payload: PlanPayload = {
      ciphertextB64: plan.ciphertextB64,
      ivB64: plan.ivB64,
      saltB64: plan.saltB64,
      version: plan.version,
      updatedAt: plan.updatedAt,
    };
    
    if (plan.planType === 'A') bundle.plans.A = payload;
    if (plan.planType === 'B') bundle.plans.B = payload;
  }
  
  return bundle;
}

// Create encrypted backup and upload to Supabase
export async function createBackup(userId: string): Promise<{ success: boolean; error?: string }> {
  const passphrase = getVaultPassphrase();
  if (!passphrase) {
    return { success: false, error: 'Vault is locked' };
  }
  
  try {
    // Build bundle from local encrypted cache
    const bundle = await buildBackupBundle();
    
    // Check if there's data to backup
    if (Object.keys(bundle.vault).length === 0 && Object.keys(bundle.plans).length === 0) {
      return { success: false, error: 'No data to backup' };
    }
    
    // Encrypt the entire bundle (defense-in-depth)
    const encryptedBundle = await encryptJSON(bundle, passphrase);
    
    // Upload to Supabase
    const { error } = await supabase.from('backups').insert([{
      user_id: userId,
      ciphertext_bundle: encryptedBundle.ciphertextB64,
      iv: encryptedBundle.ivB64,
      salt: encryptedBundle.saltB64,
      version: BACKUP_VERSION,
    }]);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// Get info about latest backup
export async function getLatestBackupInfo(userId: string): Promise<BackupInfo | null> {
  const { data, error } = await supabase
    .from('backups')
    .select('id, created_at, version')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) return null;
  
  return {
    id: data.id,
    createdAt: data.created_at,
    version: data.version,
  };
}

// Restore from latest backup
export async function restoreFromBackup(userId: string): Promise<{ success: boolean; error?: string; restored?: { vaultSections: number; plans: number } }> {
  const passphrase = getVaultPassphrase();
  if (!passphrase) {
    return { success: false, error: 'Vault is locked' };
  }
  
  try {
    // Fetch latest backup
    const { data, error } = await supabase
      .from('backups')
      .select('ciphertext_bundle, iv, salt, version')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) {
      return { success: false, error: 'No backup found' };
    }
    
    // Decrypt the bundle
    const encryptedPayload: EncryptedPayload = {
      ciphertextB64: data.ciphertext_bundle,
      ivB64: data.iv,
      saltB64: data.salt,
      version: data.version,
    };
    
    let bundle: BackupBundle;
    try {
      bundle = await decryptJSON<BackupBundle>(encryptedPayload, passphrase);
    } catch {
      return { success: false, error: 'Could not decrypt backup. Check your passphrase.' };
    }
    
    // Validate bundle structure
    if (!bundle.version || !bundle.vault || !bundle.plans) {
      return { success: false, error: 'Invalid backup format' };
    }
    
    let restoredVaultSections = 0;
    let restoredPlans = 0;
    
    // Restore vault sections to local cache
    const vaultSections = ['ids', 'contacts', 'medical', 'finance', 'devices'] as const;
    for (const section of vaultSections) {
      const payload = bundle.vault[section];
      if (payload) {
        await saveSectionToCache(section, {
          ciphertextB64: payload.ciphertextB64,
          ivB64: payload.ivB64,
          saltB64: payload.saltB64,
          version: payload.version,
        }, payload.updatedAt);
        restoredVaultSections++;
        
        // Also sync to Supabase if online
        if (navigator.onLine) {
          await supabase.from('vault_items').upsert({
            user_id: userId,
            section,
            ciphertext: payload.ciphertextB64,
            iv: payload.ivB64,
            salt: payload.saltB64,
            version: payload.version,
            updated_at: payload.updatedAt,
          }, {
            onConflict: 'user_id,section',
          });
        }
      }
    }
    
    // Restore plans to local cache
    const planTypes: PlanType[] = ['A', 'B'];
    for (const planType of planTypes) {
      const payload = bundle.plans[planType];
      if (payload) {
        await savePlanToCache(planType, {
          ciphertextB64: payload.ciphertextB64,
          ivB64: payload.ivB64,
          saltB64: payload.saltB64,
          version: payload.version,
        }, payload.updatedAt);
        restoredPlans++;
        
        // Also sync to Supabase if online
        if (navigator.onLine) {
          await supabase.from('plan_items').upsert({
            user_id: userId,
            plan_type: planType,
            ciphertext: payload.ciphertextB64,
            iv: payload.ivB64,
            salt: payload.saltB64,
            version: payload.version,
            updated_at: payload.updatedAt,
          }, {
            onConflict: 'user_id,plan_type',
          });
        }
      }
    }
    
    return { 
      success: true, 
      restored: { 
        vaultSections: restoredVaultSections, 
        plans: restoredPlans 
      } 
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
