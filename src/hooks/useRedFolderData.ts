/**
 * Hook to load all data needed for Red Folder PDF generation
 * 
 * SECURITY:
 * - All decryption happens client-side
 * - No plaintext is logged or sent externally
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVaultKey } from '@/contexts/VaultKeyContext';
import { useLocale } from '@/i18n/useLocale';
import { getAllCachedSections, VaultSectionCache } from '@/lib/vaultStorage';
import { getCachedPremiumPlan } from '@/lib/planWizard2Store';
import { 
  RedFolderPdfData, 
  VaultSectionData 
} from '@/lib/pdf/redFolderPdf';

export interface DataReadiness {
  riskAssessment: boolean;
  riskUpdatedAt?: string;
  suppliesPlan: boolean;
  suppliesUpdatedAt?: string;
  vaultIds: boolean;
  vaultContacts: boolean;
  vaultMedical: boolean;
  vaultFinance: boolean;
  vaultDevices: boolean;
  vaultPets: boolean;
  vaultProperty: boolean;
  planA: boolean;
  planB: boolean;
  plansUpdatedAt?: string;
}

export function useRedFolderData() {
  const { user } = useAuth();
  // The Master Key is in memory because the route is wrapped by MasterKeyGate.
  const { decrypt, isUnlocked } = useVaultKey();
  const { locale } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [readiness, setReadiness] = useState<DataReadiness>({
    riskAssessment: false,
    suppliesPlan: false,
    vaultIds: false,
    vaultContacts: false,
    vaultMedical: false,
    vaultFinance: false,
    vaultDevices: false,
    vaultPets: false,
    vaultProperty: false,
    planA: false,
    planB: false,
  });

  // Check data readiness without decrypting
  const checkReadiness = useCallback(async (): Promise<DataReadiness> => {
    const newReadiness: DataReadiness = {
      riskAssessment: false,
      suppliesPlan: false,
      vaultIds: false,
      vaultContacts: false,
      vaultMedical: false,
      vaultFinance: false,
      vaultDevices: false,
      vaultPets: false,
      vaultProperty: false,
      planA: false,
      planB: false,
    };

    try {
      // Check Supabase for risk and supplies if online and authenticated
      if (navigator.onLine && user) {
        const [riskResult, suppliesResult] = await Promise.all([
          supabase
            .from('risk_assessments')
            .select('id, updated_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1),
          supabase
            .from('supplies_plans')
            .select('id, updated_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1),
        ]);

        if (riskResult.data?.length) {
          newReadiness.riskAssessment = true;
          newReadiness.riskUpdatedAt = riskResult.data[0].updated_at;
        }
        if (suppliesResult.data?.length) {
          newReadiness.suppliesPlan = true;
          newReadiness.suppliesUpdatedAt = suppliesResult.data[0].updated_at;
        }
      }

      // Check local storage for risk/supplies as fallback
      if (!newReadiness.riskAssessment) {
        const localRisk = localStorage.getItem('resilient_risk_result');
        newReadiness.riskAssessment = !!localRisk;
      }
      if (!newReadiness.suppliesPlan) {
        const localSupplies = localStorage.getItem('resilient_supplies_state');
        newReadiness.suppliesPlan = !!localSupplies;
      }

      // Check vault sections from local cache (all 7 V2 sections)
      const vaultSections = await getAllCachedSections();
      vaultSections.forEach(section => {
        if (section.section === 'ids') newReadiness.vaultIds = true;
        if (section.section === 'contacts') newReadiness.vaultContacts = true;
        if (section.section === 'medical') newReadiness.vaultMedical = true;
        if (section.section === 'finance') newReadiness.vaultFinance = true;
        if (section.section === 'devices') newReadiness.vaultDevices = true;
        if (section.section === 'pets') newReadiness.vaultPets = true;
        if (section.section === 'property') newReadiness.vaultProperty = true;
      });

      // Check wizard v2 plans from local cache
      if (user) {
        const wizardPlan = await getCachedPremiumPlan(user.id);
        if (wizardPlan) {
          newReadiness.planA = wizardPlan.plan_a_json !== null && wizardPlan.plan_a_json !== undefined;
          newReadiness.planB = wizardPlan.plan_b_json !== null && wizardPlan.plan_b_json !== undefined;
          newReadiness.plansUpdatedAt = wizardPlan.updated_at;
        }
      }

      setReadiness(newReadiness);
      return newReadiness;
    } catch {
      setReadiness(newReadiness);
      return newReadiness;
    }
  }, [user]);

  // Decrypt a cached vault section using the in-memory Master Key
  const decryptVaultSection = useCallback(
    async (cache: VaultSectionCache): Promise<unknown> => {
      return decrypt({
        ciphertext: cache.ciphertextB64,
        iv: cache.ivB64,
        version: cache.version,
      });
    },
    [decrypt]
  );

  // Load and decrypt all data for PDF
  const loadAllData = useCallback(async (): Promise<RedFolderPdfData | null> => {
    if (!isUnlocked) return null;

    setIsLoading(true);
    
    try {
      // Initialize result
      const result: RedFolderPdfData = {
        locale,
        risk: null,
        supplies: null,
        vault: {},
        planA: null,
        planB: null,
        generatedAt: new Date().toISOString(),
      };

      // Load risk assessment
      if (navigator.onLine && user) {
        const { data: riskData } = await supabase
          .from('risk_assessments')
          .select('score, risk_level, breakdown, city, country, updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (riskData) {
          result.risk = {
            score: riskData.score,
            riskLevel: riskData.risk_level,
            breakdown: (riskData.breakdown as Record<string, number>) || {},
            city: riskData.city || undefined,
            country: riskData.country || undefined,
            updatedAt: riskData.updated_at,
          };
        }
      }

      // Fallback to localStorage for risk
      if (!result.risk) {
        const localRisk = localStorage.getItem('resilient_risk_result');
        if (localRisk) {
          try {
            const parsed = JSON.parse(localRisk);
            result.risk = {
              score: parsed.score,
              riskLevel: parsed.riskLevel,
              breakdown: parsed.breakdown || {},
              city: parsed.city,
              country: parsed.country,
              updatedAt: new Date().toISOString(),
            };
          } catch {
            // Ignore parse errors
          }
        }
      }

      // Load supplies plan
      if (navigator.onLine && user) {
        const { data: suppliesData } = await supabase
          .from('supplies_plans')
          .select('days, preparedness_pct, plan, updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (suppliesData) {
          result.supplies = {
            days: suppliesData.days,
            preparednessPercent: suppliesData.preparedness_pct,
            plan: (suppliesData.plan as Record<string, unknown>) || {},
            updatedAt: suppliesData.updated_at,
          };
        }
      }

      // Fallback to localStorage for supplies
      if (!result.supplies) {
        const localSupplies = localStorage.getItem('resilient_supplies_state');
        if (localSupplies) {
          try {
            const parsed = JSON.parse(localSupplies);
            result.supplies = {
              days: parsed.days || 14,
              preparednessPercent: parsed.preparednessPercent,
              plan: parsed.plan || {},
              updatedAt: new Date().toISOString(),
            };
          } catch {
            // Ignore parse errors
          }
        }
      }

      // Load and decrypt vault sections
      const vaultSections = await getAllCachedSections();
      const vault: VaultSectionData = {};

      for (const section of vaultSections) {
        try {
          const decrypted = await decryptVaultSection(section, passphrase);
          // Map all 7 V2 sections
          if (section.section === 'ids') vault.ids = decrypted as VaultSectionData['ids'];
          if (section.section === 'contacts') vault.contacts = decrypted as VaultSectionData['contacts'];
          if (section.section === 'medical') vault.medical = decrypted as VaultSectionData['medical'];
          if (section.section === 'finance') vault.finance = decrypted as VaultSectionData['finance'];
          if (section.section === 'devices') vault.devices = decrypted as VaultSectionData['devices'];
          if (section.section === 'pets') vault.pets = decrypted as VaultSectionData['pets'];
          if (section.section === 'property') vault.property = decrypted as VaultSectionData['property'];
        } catch {
          // Skip sections that fail to decrypt
        }
      }
      result.vault = vault;

      // Load wizard v2 plans (not encrypted)
      if (user) {
        const wizardPlan = await getCachedPremiumPlan(user.id);
        if (wizardPlan) {
          result.planA = wizardPlan.plan_a_json || null;
          result.planB = wizardPlan.plan_b_json || null;
        }
      }

      return result;
    } catch {
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isUnlocked, getPassphrase, locale, user]);

  return {
    isLoading,
    readiness,
    checkReadiness,
    loadAllData,
  };
}
