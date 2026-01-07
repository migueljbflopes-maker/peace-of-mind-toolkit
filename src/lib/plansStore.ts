/**
 * Encrypted plans storage module
 * 
 * SECURITY:
 * - Only encrypted payloads are stored locally and in Supabase
 * - Uses vault session passphrase for encryption
 * - Offline-first: stores locally, syncs to Supabase when online
 */

import { EncryptedPayload } from './crypto';

const DB_NAME = 'resilient_plans';
const DB_VERSION = 1;
const STORE_NAME = 'plan_items';

export type PlanType = 'A' | 'B';

// Plan JSON structure (plaintext before encryption)
export interface PlanData {
  meta: {
    planType: PlanType;
    locale: 'en' | 'pt';
    updatedAt: string;
  };
  // Rich tailored fields
  whyThisFitsYou?: string;
  topPrioritiesThisWeek?: string[];
  triggers: string[];
  objectives: string[];
  homeSetup?: {
    power: string[];
    water: string[];
    cooking: string[];
    communicationsBackup: string[];
    documentsHandling: string[];
  };
  meetingPoints: {
    primary: string;
    secondary: string;
  };
  contacts: {
    primary: string;
    secondary: string;
    outOfArea: string;
  };
  communications?: {
    checkInRule: string;
    outOfAreaContactRole: string;
    familyMeetingRule?: string;
  };
  mobility: {
    constraints: string;
    transport: string;
    notes: string;
  };
  routeNotes?: string[];
  pets?: {
    hasPets: boolean;
    petCareChecklist: string[];
  };
  essentialsGrabList: string[];
  stepsFirstHour: string[];
  stepsFirstDay: string[];
  checklists?: {
    beforeDisruption: string[];
    duringDisruption: string[];
    afterDisruption: string[];
  };
  notes: string;
}

export interface PlanCache {
  planType: PlanType;
  ciphertextB64: string;
  ivB64: string;
  saltB64: string;
  version: number;
  updatedAt: string;
  syncedAt: string | null;
}

// Create empty plan template
export function createEmptyPlan(planType: PlanType, locale: 'en' | 'pt'): PlanData {
  return {
    meta: {
      planType,
      locale,
      updatedAt: new Date().toISOString(),
    },
    triggers: [],
    objectives: [],
    meetingPoints: {
      primary: '',
      secondary: '',
    },
    contacts: {
      primary: '',
      secondary: '',
      outOfArea: '',
    },
    mobility: {
      constraints: '',
      transport: '',
      notes: '',
    },
    essentialsGrabList: [],
    stepsFirstHour: [],
    stepsFirstDay: [],
    notes: '',
  };
}

// Open IndexedDB database
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'planType' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });
}

// Get cached plan data
export async function getCachedPlan(planType: PlanType): Promise<PlanCache | null> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(planType);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

// Get all cached plans
export async function getAllCachedPlans(): Promise<PlanCache[]> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

// Save plan to local cache
export async function savePlanToCache(
  planType: PlanType,
  payload: EncryptedPayload,
  syncedAt: string | null = null
): Promise<void> {
  const db = await openDatabase();
  
  const cache: PlanCache = {
    planType,
    ciphertextB64: payload.ciphertextB64,
    ivB64: payload.ivB64,
    saltB64: payload.saltB64,
    version: payload.version,
    updatedAt: new Date().toISOString(),
    syncedAt,
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(cache);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Mark plan as synced
export async function markPlanSynced(planType: PlanType): Promise<void> {
  const cached = await getCachedPlan(planType);
  if (!cached) return;
  
  const db = await openDatabase();
  cached.syncedAt = new Date().toISOString();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(cached);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Delete plan from cache
export async function deletePlanFromCache(planType: PlanType): Promise<void> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(planType);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Clear all cached plans
export async function clearPlansCache(): Promise<void> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Get unsynced plans
export async function getUnsyncedPlans(): Promise<PlanCache[]> {
  const plans = await getAllCachedPlans();
  return plans.filter(p => !p.syncedAt || new Date(p.updatedAt) > new Date(p.syncedAt));
}
