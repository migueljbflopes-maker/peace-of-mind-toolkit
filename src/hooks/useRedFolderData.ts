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
import { useVaultSession } from '@/hooks/useVaultSession';
import { useLocale } from '@/i18n/useLocale';
import { getAllCachedSections, VaultSectionCache } from '@/lib/vaultStorage';
import { getCachedPlan, PlanData, PlanType } from '@/lib/plansStore';
import { decryptJSON, EncryptedPayload } from '@/lib/crypto';
import { 
  RedFolderPdfData, 
  RiskData, 
  SuppliesData, 
  VaultSectionData 
} from '@/lib/pdf/redFolderPdf';

export interface DataReadiness {
  riskAssessment: boolean;
  suppliesPlan: boolean;
  vaultIds: boolean;
  vaultContacts: boolean;
  vaultMedical: boolean;
  vaultFinance: boolean;
  vaultDevices: boolean;
  planA: boolean;
  planB: boolean;
}

export function useRedFolderData() {
  const { user } = useAuth();
  const { getPassphrase, isUnlocked } = useVaultSession();
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
      planA: false,
      planB: false,
    };

    try {
      // Check Supabase for risk and supplies if online and authenticated
      if (navigator.onLine && user) {
        const [riskResult, suppliesResult] = await Promise.all([
          supabase
            .from('risk_assessments')
            .select('id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1),
          supabase
            .from('supplies_plans')
            .select('id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1),
        ]);

        newReadiness.riskAssessment = (riskResult.data?.length || 0) > 0;
        newReadiness.suppliesPlan = (suppliesResult.data?.length || 0) > 0;
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

      // Check vault sections from local cache
      const vaultSections = await getAllCachedSections();
      vaultSections.forEach(section => {
        if (section.section === 'ids') newReadiness.vaultIds = true;
        if (section.section === 'contacts') newReadiness.vaultContacts = true;
        if (section.section === 'medical') newReadiness.vaultMedical = true;
        if (section.section === 'finance') newReadiness.vaultFinance = true;
        if (section.section === 'devices') newReadiness.vaultDevices = true;
      });

      // Check plans from local cache
      const planA = await getCachedPlan('A');
      const planB = await getCachedPlan('B');
      newReadiness.planA = !!planA;
      newReadiness.planB = !!planB;

      setReadiness(newReadiness);
      return newReadiness;
    } catch {
      setReadiness(newReadiness);
      return newReadiness;
    }
  }, [user]);

  // Decrypt a cached vault section
  const decryptVaultSection = async (
    cache: VaultSectionCache,
    passphrase: string
  ): Promise<unknown> => {
    const payload: EncryptedPayload = {
      ciphertextB64: cache.ciphertextB64,
      ivB64: cache.ivB64,
      saltB64: cache.saltB64,
      version: cache.version,
    };
    return decryptJSON(payload, passphrase);
  };

  // Load and decrypt all data for PDF
  const loadAllData = useCallback(async (): Promise<RedFolderPdfData | null> => {
    if (!isUnlocked) return null;
    
    const passphrase = getPassphrase();
    if (!passphrase) return null;

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
          .single();

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
          .single();

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
          if (section.section === 'ids') vault.ids = decrypted as VaultSectionData['ids'];
          if (section.section === 'contacts') vault.contacts = decrypted as VaultSectionData['contacts'];
          if (section.section === 'medical') vault.medical = decrypted as VaultSectionData['medical'];
          if (section.section === 'finance') vault.finance = decrypted as VaultSectionData['finance'];
          if (section.section === 'devices') vault.devices = decrypted as VaultSectionData['devices'];
        } catch {
          // Skip sections that fail to decrypt
        }
      }
      result.vault = vault;

      // Load and decrypt plans
      const decryptPlan = async (planType: PlanType): Promise<PlanData | null> => {
        const cached = await getCachedPlan(planType);
        if (!cached) return null;
        
        try {
          const payload: EncryptedPayload = {
            ciphertextB64: cached.ciphertextB64,
            ivB64: cached.ivB64,
            saltB64: cached.saltB64,
            version: cached.version,
          };
          return await decryptJSON<PlanData>(payload, passphrase);
        } catch {
          return null;
        }
      };

      result.planA = await decryptPlan('A');
      result.planB = await decryptPlan('B');

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
