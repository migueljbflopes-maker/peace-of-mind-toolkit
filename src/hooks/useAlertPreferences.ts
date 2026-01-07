/**
 * Hook for managing alert preferences
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Json } from '@/integrations/supabase/types';

export interface AlertPreferences {
  enabled: boolean;
  topics: string[];
  regions: string[];
  severityThreshold: 'major' | 'moderate';
  frequency: 'immediate' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  } | null;
  lastSeenAt: string | null;
}

const DEFAULT_PREFERENCES: AlertPreferences = {
  enabled: false,
  topics: [],
  regions: ['Global'],
  severityThreshold: 'major',
  frequency: 'daily',
  quietHours: null,
  lastSeenAt: null,
};

export function useAlertPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<AlertPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load preferences
  const loadPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(DEFAULT_PREFERENCES);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('alert_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error);
      }

      if (data) {
        const quietHours = data.quiet_hours as { enabled?: boolean; start?: string; end?: string } | null;
        setPreferences({
          enabled: data.enabled ?? false,
          topics: data.topics ?? [],
          regions: data.regions ?? ['Global'],
          severityThreshold: (data.severity_threshold as 'major' | 'moderate') ?? 'major',
          frequency: (data.frequency as 'immediate' | 'daily' | 'weekly') ?? 'daily',
          quietHours: quietHours ? {
            enabled: quietHours.enabled ?? false,
            start: quietHours.start ?? '22:00',
            end: quietHours.end ?? '07:00',
          } : null,
          lastSeenAt: data.last_seen_at,
        });
      }
    } catch {
      // Use defaults
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Save preferences
  const savePreferences = useCallback(async (newPrefs: Partial<AlertPreferences>): Promise<boolean> => {
    if (!user) return false;

    setIsSaving(true);
    try {
      const updatedPrefs = { ...preferences, ...newPrefs };
      
      const { error } = await supabase
        .from('alert_preferences')
        .upsert({
          user_id: user.id,
          enabled: updatedPrefs.enabled,
          topics: updatedPrefs.topics,
          regions: updatedPrefs.regions,
          severity_threshold: updatedPrefs.severityThreshold,
          frequency: updatedPrefs.frequency,
          quiet_hours: updatedPrefs.quietHours as unknown as Json,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) {
        console.error('Error saving preferences:', error);
        return false;
      }

      setPreferences(updatedPrefs);
      return true;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user, preferences]);

  // Mark alerts as seen
  const markAsSeen = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('alert_preferences')
        .upsert({
          user_id: user.id,
          last_seen_at: now,
          updated_at: now,
        }, {
          onConflict: 'user_id',
        });

      if (error) return false;

      setPreferences(prev => ({ ...prev, lastSeenAt: now }));
      return true;
    } catch {
      return false;
    }
  }, [user]);

  return {
    preferences,
    isLoading,
    isSaving,
    savePreferences,
    markAsSeen,
    refresh: loadPreferences,
  };
}
