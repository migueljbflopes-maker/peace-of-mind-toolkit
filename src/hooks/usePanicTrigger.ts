import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type TriggerState = "idle" | "holding" | "pending" | "cancelling" | "confirmed" | "cancelled" | "error";
export type ScenarioType = "medical" | "natural" | "security" | "custom";

export interface LocationSnapshot {
  lat?: number;
  lng?: number;
  accuracy?: number;
  timestamp?: number;
  address?: string;
}

const HOLD_DURATION_MS = 3000; // 3 seconds to activate
const CANCEL_WINDOW_MS = 5000; // 5 seconds to cancel

export function usePanicTrigger() {
  const { user, session } = useAuth();
  const [state, setState] = useState<TriggerState>("idle");
  const [holdProgress, setHoldProgress] = useState(0);
  const [cancelCountdown, setCancelCountdown] = useState(0);
  const [activationId, setActivationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const holdIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    if (cancelIntervalRef.current) {
      clearInterval(cancelIntervalRef.current);
      cancelIntervalRef.current = null;
    }
    if (cancelTimeoutRef.current) {
      clearTimeout(cancelTimeoutRef.current);
      cancelTimeoutRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearAllTimers();
    setState("idle");
    setHoldProgress(0);
    setCancelCountdown(0);
    setActivationId(null);
    setError(null);
  }, [clearAllTimers]);

  // Start holding the button
  const startHold = useCallback((scenarioType: ScenarioType, isTest: boolean = false, locationSnapshot?: LocationSnapshot) => {
    if (state !== "idle") return;
    
    setState("holding");
    setHoldProgress(0);
    setError(null);

    const startTime = Date.now();
    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / HOLD_DURATION_MS) * 100, 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        clearInterval(holdIntervalRef.current!);
        holdIntervalRef.current = null;
        // Trigger the activation
        triggerPanic(scenarioType, isTest, locationSnapshot);
      }
    }, 50);
  }, [state]);

  // Release hold before completion
  const releaseHold = useCallback(() => {
    if (state !== "holding") return;
    
    clearAllTimers();
    setState("idle");
    setHoldProgress(0);
  }, [state, clearAllTimers]);

  // Call the trigger edge function
  const triggerPanic = useCallback(async (
    scenarioType: ScenarioType,
    isTest: boolean,
    locationSnapshot?: LocationSnapshot
  ) => {
    if (!session?.access_token) {
      setError("Not authenticated");
      setState("error");
      return;
    }

    setState("pending");
    setCancelCountdown(5);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("panic-trigger", {
        body: {
          scenario_type: scenarioType,
          is_test: isTest,
          location_snapshot: locationSnapshot,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setActivationId(data.activation_id);

      // Start cancel countdown
      const cancelStart = Date.now();
      cancelIntervalRef.current = setInterval(() => {
        const remaining = Math.max(0, CANCEL_WINDOW_MS - (Date.now() - cancelStart));
        setCancelCountdown(Math.ceil(remaining / 1000));
        
        if (remaining <= 0) {
          clearInterval(cancelIntervalRef.current!);
          cancelIntervalRef.current = null;
        }
      }, 100);

      // Auto-confirm after cancel window
      cancelTimeoutRef.current = setTimeout(() => {
        confirmPanic(data.activation_id, isTest);
      }, CANCEL_WINDOW_MS);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to trigger panic";
      console.error("Panic trigger error:", err);
      setError(message);
      setState("error");
      toast.error(message);
    }
  }, [session]);

  // Cancel the activation
  const cancelPanic = useCallback(async () => {
    if (!activationId || state !== "pending") return;

    setState("cancelling");
    clearAllTimers();

    try {
      const { data, error: fnError } = await supabase.functions.invoke("panic-cancel", {
        body: { activation_id: activationId },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setState("cancelled");
      toast.info("Panic button cancelled");
      
      // Reset after showing cancelled state
      setTimeout(reset, 2000);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to cancel";
      console.error("Panic cancel error:", err);
      setError(message);
      setState("error");
    }
  }, [activationId, state, clearAllTimers, reset]);

  // Confirm the activation (called after cancel window)
  const confirmPanic = useCallback(async (actId: string, isTest: boolean) => {
    clearAllTimers();

    try {
      const { data, error: fnError } = await supabase.functions.invoke("panic-confirm", {
        body: { activation_id: actId },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setState("confirmed");
      
      if (isTest) {
        toast.success("Test successful! No contacts were notified.");
      } else {
        const count = data.notifications_pending || 0;
        toast.success(`Emergency alert sent to ${count} contact(s)`);
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to confirm";
      console.error("Panic confirm error:", err);
      setError(message);
      setState("error");
    }
  }, [clearAllTimers]);

  return {
    state,
    holdProgress,
    cancelCountdown,
    activationId,
    error,
    startHold,
    releaseHold,
    cancelPanic,
    reset,
    isAuthenticated: !!user,
  };
}
