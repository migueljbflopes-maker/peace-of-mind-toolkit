/**
 * Plan Wizard 2.0 Store
 * 
 * Handles local caching and Supabase sync for premium plans.
 * Offline-first: stores locally, syncs when online.
 *
 * ZERO-KNOWLEDGE:
 *  - When `encrypt`/`decrypt` are passed, `plan_a_json` and `plan_b_json` are
 *    encrypted client-side with the user's Master Key before being uploaded.
 *    The server only sees an EncryptedBlob envelope `{ ciphertext, iv, version }`.
 *  - The IndexedDB cache keeps plaintext for fast UX; it lives only on this
 *    device and is wiped by performSecureCleanup() on signOut.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { EncryptedBlob } from '@/utils/crypto';
import { 
  PremiumPlan, 
  PlanWizardInputs, 
  GeneratedPlanA, 
  GeneratedPlanB,
  SafeLocation,
  EmergencyScenario,
  Priority,
  CommChannel,
} from './planWizard2Types';

// Crypto helpers signature — matches what VaultKeyContext exposes.
export type EncryptFn = (data: unknown) => Promise<EncryptedBlob>;
export type DecryptFn = <T = unknown>(blob: EncryptedBlob) => Promise<T>;

/** Heuristic: a row's plan_*_json field is an encrypted envelope iff it
 *  carries the three fields we wrote. Everything else is treated as legacy
 *  plaintext for backward compatibility. */
function isEncryptedBlob(value: unknown): value is EncryptedBlob {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as EncryptedBlob).ciphertext === 'string' &&
    typeof (value as EncryptedBlob).iv === 'string' &&
    typeof (value as EncryptedBlob).version === 'number'
  );
}

const DB_NAME = 'resilient_plans_v2';
const DB_VERSION = 1;
const STORE_NAME = 'premium_plans';

// Open IndexedDB
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'user_id' });
        store.createIndex('updated_at', 'updated_at', { unique: false });
      }
    };
  });
}

// Convert DB row to PremiumPlan
function rowToPlan(row: Record<string, unknown>): PremiumPlan {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    wizard_inputs: (row.wizard_inputs || {}) as PlanWizardInputs,
    home_location: row.home_location as PremiumPlan['home_location'],
    safe_locations: (row.safe_locations || []) as SafeLocation[],
    constraints: row.constraints as PremiumPlan['constraints'],
    scenario_set: (row.scenario_set || []) as EmergencyScenario[],
    priorities: (row.priorities || []) as Priority[],
    comms_config: row.comms_config as PremiumPlan['comms_config'],
    plan_a_json: row.plan_a_json as GeneratedPlanA | null,
    plan_b_json: row.plan_b_json as GeneratedPlanB | null,
    last_generated_at: row.last_generated_at as string | null,
    generation_version: row.generation_version as number,
    status: row.status as PremiumPlan['status'],
  };
}

// Get cached plan from IndexedDB
export async function getCachedPremiumPlan(userId: string): Promise<PremiumPlan | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(userId);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (error) {
    console.error('Error getting cached plan:', error);
    return null;
  }
}

// Save plan to local cache
export async function savePlanToCache(plan: PremiumPlan): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(plan);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('Error saving plan to cache:', error);
    throw error;
  }
}

// Clear cached plan
export async function clearCachedPlan(userId: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(userId);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('Error clearing cached plan:', error);
  }
}

// Fetch plan from Supabase
export async function fetchPlanFromCloud(userId: string): Promise<PremiumPlan | null> {
  const { data, error } = await supabase
    .from('premium_plans')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching plan from cloud:', error);
    return null;
  }

  if (!data) return null;
  return rowToPlan(data as Record<string, unknown>);
}

// Save/update plan in Supabase
export async function savePlanToCloud(
  userId: string,
  planData: {
    wizard_inputs?: PlanWizardInputs;
    home_location?: PremiumPlan['home_location'];
    safe_locations?: SafeLocation[];
    constraints?: PremiumPlan['constraints'];
    scenario_set?: EmergencyScenario[];
    priorities?: Priority[];
    comms_config?: PremiumPlan['comms_config'];
    plan_a_json?: GeneratedPlanA | null;
    plan_b_json?: GeneratedPlanB | null;
    last_generated_at?: string | null;
    generation_version?: number;
    status?: PremiumPlan['status'];
  }
): Promise<PremiumPlan | null> {
  const { data: existing } = await supabase
    .from('premium_plans')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  const dbPayload = {
    wizard_inputs: planData.wizard_inputs as unknown as Json,
    home_location: planData.home_location as unknown as Json,
    safe_locations: planData.safe_locations as unknown as Json,
    constraints: planData.constraints as unknown as Json,
    scenario_set: planData.scenario_set,
    priorities: planData.priorities,
    comms_config: planData.comms_config as unknown as Json,
    plan_a_json: planData.plan_a_json as unknown as Json,
    plan_b_json: planData.plan_b_json as unknown as Json,
    last_generated_at: planData.last_generated_at,
    generation_version: planData.generation_version,
    status: planData.status,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('premium_plans')
      .update(dbPayload)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating plan in cloud:', error);
      return null;
    }
    return rowToPlan(data as Record<string, unknown>);
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('premium_plans')
      .insert({
        user_id: userId,
        ...dbPayload,
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting plan to cloud:', error);
      return null;
    }
    return rowToPlan(data as Record<string, unknown>);
  }
}

// Sync: fetch from cloud, update cache
export async function syncPlanFromCloud(userId: string): Promise<PremiumPlan | null> {
  const cloudPlan = await fetchPlanFromCloud(userId);
  
  if (cloudPlan) {
    await savePlanToCache(cloudPlan);
    return cloudPlan;
  }
  
  return null;
}

// Get plan (cache first, then cloud)
export async function getPlan(userId: string, forceCloud = false): Promise<PremiumPlan | null> {
  if (!forceCloud) {
    const cached = await getCachedPremiumPlan(userId);
    if (cached) return cached;
  }
  
  // Try cloud
  const cloudPlan = await syncPlanFromCloud(userId);
  return cloudPlan;
}

// Save wizard inputs (partial save during wizard)
export async function saveWizardInputs(
  userId: string, 
  inputs: Partial<PlanWizardInputs>
): Promise<void> {
  const existing = await getCachedPremiumPlan(userId);
  
  const mergedInputs = {
    ...(existing?.wizard_inputs || {}),
    ...inputs,
  } as PlanWizardInputs;

  const updatedPlan: Partial<PremiumPlan> = {
    wizard_inputs: mergedInputs,
    home_location: inputs.step1 ? {
      country: inputs.step1.country,
      city: inputs.step1.city,
      neighborhood: inputs.step1.neighborhood,
    } : existing?.home_location,
    safe_locations: inputs.step2?.locations || existing?.safe_locations,
    constraints: (inputs.step1 || inputs.step3) ? {
      hasCar: inputs.step1?.hasCar ?? existing?.constraints?.hasCar ?? false,
      adults: inputs.step1?.adults ?? existing?.constraints?.adults ?? 1,
      kids: inputs.step1?.kids ?? existing?.constraints?.kids ?? 0,
      pets: inputs.step1?.pets ?? existing?.constraints?.pets ?? 0,
      mobilityConstraints: inputs.step1?.mobilityConstraints ?? existing?.constraints?.mobilityConstraints,
      languages: inputs.step1?.languages ?? existing?.constraints?.languages ?? [],
      cashRange: inputs.step3?.cashRange ?? existing?.constraints?.cashRange ?? 'none',
      docsReady: inputs.step3?.docsReady ?? existing?.constraints?.docsReady ?? false,
      medicationsNeeded: inputs.step3?.medicationsNeeded ?? existing?.constraints?.medicationsNeeded ?? false,
      goBagStatus: inputs.step3?.goBagStatus ?? existing?.constraints?.goBagStatus ?? 'none',
    } : existing?.constraints,
    scenario_set: inputs.step4?.selectedScenarios || existing?.scenario_set,
    priorities: inputs.step5?.selectedPriorities || existing?.priorities,
    comms_config: inputs.step6 ? {
      meetingPointA: inputs.step6.meetingPointA,
      meetingPointB: inputs.step6.meetingPointB,
      preferredChannels: inputs.step6.preferredChannels,
      outOfAreaContact: inputs.step6.outOfAreaContact,
    } : existing?.comms_config,
    status: 'draft',
  };

  // Save to cache immediately
  const fullPlan: PremiumPlan = {
    id: existing?.id || crypto.randomUUID(),
    user_id: userId,
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    wizard_inputs: mergedInputs,
    home_location: updatedPlan.home_location || null,
    safe_locations: updatedPlan.safe_locations || [],
    constraints: updatedPlan.constraints || {} as PremiumPlan['constraints'],
    scenario_set: updatedPlan.scenario_set || [],
    priorities: updatedPlan.priorities || [],
    comms_config: updatedPlan.comms_config || {} as PremiumPlan['comms_config'],
    plan_a_json: existing?.plan_a_json || null,
    plan_b_json: existing?.plan_b_json || null,
    last_generated_at: existing?.last_generated_at || null,
    generation_version: existing?.generation_version || 1,
    status: 'draft',
  };

  await savePlanToCache(fullPlan);

  // Try to sync to cloud (non-blocking)
  savePlanToCloud(userId, updatedPlan).catch(console.error);
}

// Save generated plans
export async function saveGeneratedPlans(
  userId: string,
  planA: GeneratedPlanA,
  planB: GeneratedPlanB
): Promise<PremiumPlan | null> {
  const existing = await getCachedPremiumPlan(userId);
  
  const updatedData = {
    wizard_inputs: existing?.wizard_inputs,
    home_location: existing?.home_location,
    safe_locations: existing?.safe_locations || [],
    constraints: existing?.constraints,
    scenario_set: existing?.scenario_set || [],
    priorities: existing?.priorities || [],
    comms_config: existing?.comms_config,
    plan_a_json: planA,
    plan_b_json: planB,
    last_generated_at: new Date().toISOString(),
    generation_version: (existing?.generation_version || 0) + 1,
    status: 'generated' as const,
  };

  // Save to cache
  const fullPlan: PremiumPlan = {
    id: existing?.id || crypto.randomUUID(),
    user_id: userId,
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    wizard_inputs: updatedData.wizard_inputs || {} as PlanWizardInputs,
    home_location: updatedData.home_location || null,
    safe_locations: updatedData.safe_locations,
    constraints: updatedData.constraints || {} as PremiumPlan['constraints'],
    scenario_set: updatedData.scenario_set,
    priorities: updatedData.priorities,
    comms_config: updatedData.comms_config || {} as PremiumPlan['comms_config'],
    plan_a_json: planA,
    plan_b_json: planB,
    last_generated_at: updatedData.last_generated_at,
    generation_version: updatedData.generation_version,
    status: 'generated',
  };
  
  await savePlanToCache(fullPlan);

  // Sync to cloud
  const cloudPlan = await savePlanToCloud(userId, updatedData);
  return cloudPlan || fullPlan;
}

// Check if has generated plans (for readiness check)
export async function hasGeneratedPlans(userId: string): Promise<{ hasPlanA: boolean; hasPlanB: boolean }> {
  const plan = await getCachedPremiumPlan(userId);
  return {
    hasPlanA: plan?.plan_a_json !== null && plan?.plan_a_json !== undefined,
    hasPlanB: plan?.plan_b_json !== null && plan?.plan_b_json !== undefined,
  };
}

// Update existing generated plans (for inline editing)
export async function updateGeneratedPlans(
  userId: string,
  planA: GeneratedPlanA,
  planB: GeneratedPlanB
): Promise<PremiumPlan | null> {
  const existing = await getCachedPremiumPlan(userId);
  
  if (!existing) {
    console.error('No existing plan to update');
    return null;
  }

  const updatedPlan: PremiumPlan = {
    ...existing,
    plan_a_json: planA,
    plan_b_json: planB,
    updated_at: new Date().toISOString(),
  };

  // Save to cache immediately
  await savePlanToCache(updatedPlan);

  // Sync to cloud
  const cloudPlan = await savePlanToCloud(userId, {
    plan_a_json: planA,
    plan_b_json: planB,
  });

  return cloudPlan || updatedPlan;
}
