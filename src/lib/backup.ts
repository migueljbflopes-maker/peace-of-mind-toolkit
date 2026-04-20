/**
 * Encrypted Backup & Restore Module — Master Key edition.
 *
 * SECURITY:
 *  - Per-section vault items and per-plan items are already encrypted with
 *    the user's Master Key. We bundle their ciphertext blobs as-is.
 *  - The bundle is then wrapped a SECOND time with the Master Key
 *    (defense-in-depth, but more importantly: a single sealed envelope so the
 *    server cannot infer how many sections / plans the user has).
 *  - The Master Key never leaves the device; the server only ever sees
 *    ciphertext + IVs.
 */

import { supabase } from '@/integrations/supabase/client';
import { type EncryptedBlob } from '@/utils/crypto';
import {
  getAllCachedSections,
  saveSectionToCache,
} from './vaultStorage';
import {
  getAllCachedPlans,
  savePlanToCache,
  PlanType,
} from './plansStore';

const BACKUP_VERSION = 2; // bumped: blobs no longer carry per-section salt

/** Cipher functions provided by the caller (typically VaultKeyContext). */
export interface MasterCipher {
  encrypt: (data: unknown) => Promise<EncryptedBlob>;
  decrypt: <T = unknown>(blob: EncryptedBlob) => Promise<T>;
}

// Types for backup bundle
export interface VaultSectionPayload {
  ciphertextB64: string;
  ivB64: string;
  /** Kept for back-compat with v1 bundles. v2 writes empty string. */
  saltB64: string;
  version: number;
  updatedAt: string;
}

export interface PlanPayload {
  ciphertextB64: string;
  ivB64: string;
  /** Kept for back-compat with v1 bundles. v2 writes empty string. */
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
    pets?: VaultSectionPayload;
    property?: VaultSectionPayload;
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
    vaultSections: vaultSections.map((s) => s.section),
    plans: plans.map((p) => p.planType),
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

  for (const section of vaultSections) {
    const payload: VaultSectionPayload = {
      ciphertextB64: section.ciphertextB64,
      ivB64: section.ivB64,
      saltB64: section.saltB64 ?? '',
      version: section.version,
      updatedAt: section.updatedAt,
    };

    if (section.section === 'ids') bundle.vault.ids = payload;
    if (section.section === 'contacts') bundle.vault.contacts = payload;
    if (section.section === 'medical') bundle.vault.medical = payload;
    if (section.section === 'finance') bundle.vault.finance = payload;
    if (section.section === 'devices') bundle.vault.devices = payload;
    if (section.section === 'pets') bundle.vault.pets = payload;
    if (section.section === 'property') bundle.vault.property = payload;
  }

  for (const plan of plans) {
    const payload: PlanPayload = {
      ciphertextB64: plan.ciphertextB64,
      ivB64: plan.ivB64,
      saltB64: plan.saltB64 ?? '',
      version: plan.version,
      updatedAt: plan.updatedAt,
    };

    if (plan.planType === 'A') bundle.plans.A = payload;
    if (plan.planType === 'B') bundle.plans.B = payload;
  }

  return bundle;
}

/**
 * Create encrypted backup and upload to Supabase.
 * Caller passes the in-memory Master Key from VaultKeyContext.
 */
export async function createBackup(
  userId: string,
  cipher: MasterCipher
): Promise<{ success: boolean; error?: string }> {
  try {
    const bundle = await buildBackupBundle();

    if (
      Object.keys(bundle.vault).length === 0 &&
      Object.keys(bundle.plans).length === 0
    ) {
      return { success: false, error: 'No data to backup' };
    }

    // Outer envelope: encrypt the entire bundle with the Master Key.
    const outer = await cipher.encrypt(bundle);

    const { error } = await supabase.from('backups').insert([
      {
        user_id: userId,
        ciphertext_bundle: outer.ciphertext,
        iv: outer.iv,
        // 'salt' column is required by the schema for back-compat with v1
        // backups (which used PBKDF2 directly). With Master Key wrapping the
        // PBKDF2 salt lives in user_vault_keys, so we write a placeholder.
        salt: '',
        version: BACKUP_VERSION,
      },
    ]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// Get info about latest backup
export async function getLatestBackupInfo(
  userId: string
): Promise<BackupInfo | null> {
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

/**
 * Restore from latest backup. Caller passes the in-memory Master Key.
 *
 * Only v2 bundles are supported (v1 used a per-backup PBKDF2 salt and the
 * legacy passphrase, which has been retired for Vault data). If the latest
 * backup is v1, we surface a clear error so the UI can guide the user.
 */
export async function restoreFromBackup(
  userId: string,
  cipher: MasterCipher
): Promise<{
  success: boolean;
  error?: string;
  restored?: { vaultSections: number; plans: number };
}> {
  try {
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

    if ((data.version ?? 1) < BACKUP_VERSION) {
      return {
        success: false,
        error:
          'Legacy backup format detected. Create a fresh backup with your current Master Password to enable restore.',
      };
    }

    const blob: EncryptedBlob = {
      ciphertext: data.ciphertext_bundle,
      iv: data.iv,
      version: data.version,
    };

    let bundle: BackupBundle;
    try {
      bundle = await cipher.decrypt<BackupBundle>(blob);
    } catch {
      return {
        success: false,
        error: 'Could not decrypt backup with the current Master Key.',
      };
    }

    if (!bundle.version || !bundle.vault || !bundle.plans) {
      return { success: false, error: 'Invalid backup format' };
    }

    let restoredVaultSections = 0;
    let restoredPlans = 0;

    const vaultSections = [
      'ids',
      'contacts',
      'medical',
      'finance',
      'devices',
      'pets',
      'property',
    ] as const;

    for (const section of vaultSections) {
      const payload = bundle.vault[section];
      if (payload) {
        await saveSectionToCache(
          section,
          {
            ciphertextB64: payload.ciphertextB64,
            ivB64: payload.ivB64,
            saltB64: payload.saltB64 ?? '',
            version: payload.version,
          },
          payload.updatedAt
        );
        restoredVaultSections++;

        if (navigator.onLine) {
          await supabase.from('vault_items').upsert(
            {
              user_id: userId,
              section,
              ciphertext: payload.ciphertextB64,
              iv: payload.ivB64,
              salt: payload.saltB64 ?? '',
              version: payload.version,
              updated_at: payload.updatedAt,
            },
            { onConflict: 'user_id,section' }
          );
        }
      }
    }

    const planTypes: PlanType[] = ['A', 'B'];
    for (const planType of planTypes) {
      const payload = bundle.plans[planType];
      if (payload) {
        await savePlanToCache(
          planType,
          {
            ciphertextB64: payload.ciphertextB64,
            ivB64: payload.ivB64,
            saltB64: payload.saltB64 ?? '',
            version: payload.version,
          },
          payload.updatedAt
        );
        restoredPlans++;

        if (navigator.onLine) {
          await supabase.from('plan_items').upsert(
            {
              user_id: userId,
              plan_type: planType,
              ciphertext: payload.ciphertextB64,
              iv: payload.ivB64,
              salt: payload.saltB64 ?? '',
              version: payload.version,
              updated_at: payload.updatedAt,
            },
            { onConflict: 'user_id,plan_type' }
          );
        }
      }
    }

    return {
      success: true,
      restored: {
        vaultSections: restoredVaultSections,
        plans: restoredPlans,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
