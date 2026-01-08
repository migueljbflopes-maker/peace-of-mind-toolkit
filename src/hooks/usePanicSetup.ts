import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type ScenarioType = "medical" | "natural" | "security" | "custom";

export interface PanicContact {
  id?: string;
  name: string;
  phone: string;
  email: string;
  priority: number;
}

export interface PanicScenario {
  id?: string;
  scenario_type: ScenarioType;
  custom_label?: string;
  enabled: boolean;
  contact_ids: string[];
}

export interface CheckInConfig {
  enabled: boolean;
  interval_hours: number;
  last_check_in?: string;
}

const MAX_CONTACTS = 3;

export function usePanicSetup() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<PanicContact[]>([]);
  const [scenarios, setScenarios] = useState<PanicScenario[]>([]);
  const [checkInConfig, setCheckInConfig] = useState<CheckInConfig>({
    enabled: false,
    interval_hours: 24,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load data from Supabase
  const loadData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from("panic_contacts")
        .select("*")
        .eq("user_id", user.id)
        .order("priority", { ascending: true });

      if (contactsError) {
        console.error("Error loading contacts:", contactsError);
      } else {
        setContacts(
          contactsData?.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone || "",
            email: c.email || "",
            priority: c.priority,
          })) || []
        );
      }

      // Fetch scenarios
      const { data: scenariosData, error: scenariosError } = await supabase
        .from("panic_scenarios")
        .select("*")
        .eq("user_id", user.id);

      if (scenariosError) {
        console.error("Error loading scenarios:", scenariosError);
      } else {
        setScenarios(
          scenariosData?.map((s) => ({
            id: s.id,
            scenario_type: s.scenario_type as ScenarioType,
            custom_label: s.custom_label || undefined,
            enabled: s.enabled,
            contact_ids: (s.share_config as any)?.contact_ids || [],
          })) || []
        );
      }
    } catch (error) {
      console.error("Error loading panic setup:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add contact (max 3)
  const addContact = useCallback(() => {
    if (contacts.length >= MAX_CONTACTS) {
      toast.error(`Maximum ${MAX_CONTACTS} contacts allowed`);
      return;
    }
    setContacts((prev) => [
      ...prev,
      { name: "", phone: "", email: "", priority: prev.length + 1 },
    ]);
  }, [contacts.length]);

  // Update contact
  const updateContact = useCallback((index: number, updates: Partial<PanicContact>) => {
    setContacts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  }, []);

  // Remove contact
  const removeContact = useCallback((index: number) => {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Toggle scenario
  const toggleScenario = useCallback((type: ScenarioType, enabled: boolean, customLabel?: string) => {
    setScenarios((prev) => {
      const existing = prev.find((s) => s.scenario_type === type);
      if (existing) {
        return prev.map((s) =>
          s.scenario_type === type ? { ...s, enabled, custom_label: customLabel } : s
        );
      }
      return [...prev, { scenario_type: type, enabled, custom_label: customLabel, contact_ids: [] }];
    });
  }, []);

  // Set contacts for scenario
  const setScenarioContacts = useCallback((type: ScenarioType, contactIds: string[]) => {
    setScenarios((prev) => {
      const existing = prev.find((s) => s.scenario_type === type);
      if (existing) {
        return prev.map((s) =>
          s.scenario_type === type ? { ...s, contact_ids: contactIds } : s
        );
      }
      return [...prev, { scenario_type: type, enabled: true, contact_ids: contactIds }];
    });
  }, []);

  // Save all data
  const save = useCallback(async () => {
    if (!user) {
      toast.error("Please log in to save");
      return false;
    }

    // Validate at least one contact with email or phone
    const validContacts = contacts.filter((c) => c.name && (c.email || c.phone));
    if (validContacts.length === 0) {
      toast.error("Add at least one contact with email or phone");
      return false;
    }

    setIsSaving(true);
    try {
      // Delete existing contacts and insert new ones
      await supabase.from("panic_contacts").delete().eq("user_id", user.id);

      const contactInserts = validContacts.map((c, i) => ({
        user_id: user.id,
        name: c.name,
        phone: c.phone || null,
        email: c.email || null,
        priority: i + 1,
      }));

      const { data: insertedContacts, error: contactError } = await supabase
        .from("panic_contacts")
        .insert(contactInserts)
        .select();

      if (contactError) throw contactError;

      // Map old contact indices to new IDs for scenario references
      const contactIdMap = new Map<number, string>();
      insertedContacts?.forEach((c, i) => {
        contactIdMap.set(i, c.id);
      });

      // Delete existing scenarios and insert new ones
      await supabase.from("panic_scenarios").delete().eq("user_id", user.id);

      const enabledScenarios = scenarios.filter((s) => s.enabled);
      if (enabledScenarios.length > 0) {
        const scenarioInserts = enabledScenarios.map((s) => ({
          user_id: user.id,
          scenario_type: s.scenario_type as "medical" | "natural" | "security" | "custom",
          custom_label: s.custom_label || null,
          enabled: true,
          share_config: JSON.parse(JSON.stringify({
            contact_ids: s.contact_ids,
            check_in: checkInConfig,
          })),
        }));

        const { error: scenarioError } = await supabase
          .from("panic_scenarios")
          .insert(scenarioInserts);

        if (scenarioError) throw scenarioError;
      }

      toast.success("Panic button setup saved!");
      await loadData(); // Reload to get fresh IDs
      return true;
    } catch (error) {
      console.error("Error saving panic setup:", error);
      toast.error("Failed to save. Check your premium status.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user, contacts, scenarios, checkInConfig, loadData]);

  return {
    contacts,
    scenarios,
    checkInConfig,
    isLoading,
    isSaving,
    maxContacts: MAX_CONTACTS,
    addContact,
    updateContact,
    removeContact,
    toggleScenario,
    setScenarioContacts,
    setCheckInConfig,
    save,
    reload: loadData,
  };
}
