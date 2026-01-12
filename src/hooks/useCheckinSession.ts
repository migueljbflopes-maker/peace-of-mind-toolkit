import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type CheckinSessionStatus = "active" | "paused" | "ended" | "triggered";

export interface CheckinSession {
  id: string;
  scenario_type: string;
  interval_hours: number;
  started_at: string;
  next_checkin_due: string;
  missed_count: number;
  status: CheckinSessionStatus;
}

export function useCheckinSession() {
  const { user } = useAuth();
  const [activeSessions, setActiveSessions] = useState<CheckinSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  // Load active sessions
  const loadSessions = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Use raw fetch to bypass type checking since the table is new
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/checkin_sessions?user_id=eq.${user.id}&status=eq.active&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setActiveSessions(data || []);
      } else {
        console.error("Error loading check-in sessions:", await response.text());
      }
    } catch (error) {
      console.error("Error loading check-in sessions:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Start a new check-in session
  const startSession = useCallback(async (
    scenarioType: string,
    intervalHours: number = 24
  ): Promise<boolean> => {
    if (!user) {
      toast.error("Please log in to start check-in monitoring");
      return false;
    }

    setIsStarting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("checkin-start", {
        body: { 
          scenario_type: scenarioType, 
          interval_hours: intervalHours 
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        if (response.data.error === "Active session already exists") {
          toast.info("Check-in monitoring is already active");
          return true;
        }
        throw new Error(response.data.error);
      }

      toast.success("Check-in monitoring activated!");
      await loadSessions();
      return true;
    } catch (error: any) {
      console.error("Error starting check-in session:", error);
      toast.error(error.message || "Failed to start check-in monitoring");
      return false;
    } finally {
      setIsStarting(false);
    }
  }, [user, loadSessions]);

  // Stop check-in session(s)
  const stopSession = useCallback(async (
    options?: { sessionId?: string; scenarioType?: string }
  ): Promise<boolean> => {
    if (!user) {
      toast.error("Please log in");
      return false;
    }

    setIsStopping(true);
    try {
      const response = await supabase.functions.invoke("checkin-stop", {
        body: options || {},
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success("Check-in monitoring stopped");
      await loadSessions();
      return true;
    } catch (error: any) {
      console.error("Error stopping check-in session:", error);
      toast.error(error.message || "Failed to stop check-in monitoring");
      return false;
    } finally {
      setIsStopping(false);
    }
  }, [user, loadSessions]);

  // Check if a specific scenario has an active session
  const hasActiveSession = useCallback((scenarioType?: string): boolean => {
    if (scenarioType) {
      return activeSessions.some(s => s.scenario_type === scenarioType);
    }
    return activeSessions.length > 0;
  }, [activeSessions]);

  // Get session for a specific scenario
  const getSession = useCallback((scenarioType: string): CheckinSession | undefined => {
    return activeSessions.find(s => s.scenario_type === scenarioType);
  }, [activeSessions]);

  return {
    activeSessions,
    isLoading,
    isStarting,
    isStopping,
    startSession,
    stopSession,
    hasActiveSession,
    getSession,
    reload: loadSessions,
  };
}
