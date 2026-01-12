/**
 * Hook to check readiness of preparedness data (Vault, Plans, Red Folder)
 * Used by Panic Button setup to validate share preferences
 */

import { useState, useEffect, useCallback } from "react";
import { getAllCachedSections } from "@/lib/vaultStorage";
import { getCachedPlan } from "@/lib/plansStore";

export interface SharePrefs {
  location: boolean;
  vault: boolean;
  plan_a: boolean;
  plan_b: boolean;
  red_folder: boolean;
}

export const DEFAULT_SHARE_PREFS: SharePrefs = {
  location: true,
  vault: false,
  plan_a: false,
  plan_b: false,
  red_folder: false,
};

export interface PreparednessReadiness {
  has_vault_data: boolean;
  has_plan_a: boolean;
  has_plan_b: boolean;
  has_red_folder_ready: boolean;
  loading: boolean;
}

export function usePreparednessReadiness() {
  const [readiness, setReadiness] = useState<PreparednessReadiness>({
    has_vault_data: false,
    has_plan_a: false,
    has_plan_b: false,
    has_red_folder_ready: false,
    loading: true,
  });

  const checkReadiness = useCallback(async () => {
    try {
      // Check vault data - at least 1 section with meaningful data
      const vaultSections = await getAllCachedSections();
      const has_vault_data = vaultSections.length > 0;

      // Check plans - cached plans exist
      const planA = await getCachedPlan("A");
      const planB = await getCachedPlan("B");
      const has_plan_a = planA !== null;
      const has_plan_b = planB !== null;

      // Red folder is ready if we have vault OR plans (can generate PDF from them)
      const has_red_folder_ready = has_vault_data || has_plan_a || has_plan_b;

      setReadiness({
        has_vault_data,
        has_plan_a,
        has_plan_b,
        has_red_folder_ready,
        loading: false,
      });
    } catch (error) {
      console.error("Error checking preparedness readiness:", error);
      setReadiness((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkReadiness();
  }, [checkReadiness]);

  /**
   * Returns array of share pref keys that are toggled ON but not ready
   * Location is always considered ready (live data)
   */
  const missingItems = useCallback(
    (prefs: SharePrefs): string[] => {
      const missing: string[] = [];

      // Location is always ready - skip
      if (prefs.vault && !readiness.has_vault_data) {
        missing.push("vault");
      }
      if (prefs.plan_a && !readiness.has_plan_a) {
        missing.push("plan_a");
      }
      if (prefs.plan_b && !readiness.has_plan_b) {
        missing.push("plan_b");
      }
      if (prefs.red_folder && !readiness.has_red_folder_ready) {
        missing.push("red_folder");
      }

      return missing;
    },
    [readiness]
  );

  return {
    ...readiness,
    missingItems,
    refresh: checkReadiness,
  };
}
