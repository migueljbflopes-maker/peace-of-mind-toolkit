import { supabase } from '@/integrations/supabase/client';

// Get or create session ID
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Track feature usage for analytics
 * @param featureName - Name of the feature (e.g., 'risk_calculator', 'vault', 'red_folder')
 * @param action - Action taken (e.g., 'start', 'complete', 'click', 'export')
 * @param metadata - Optional additional data
 */
export async function trackFeature(
  featureName: string,
  action: string,
  metadata: Record<string, string | number | boolean | null> = {}
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('feature_usage').insert([{
      feature_name: featureName,
      action,
      user_id: user?.id || null,
      session_id: getSessionId(),
      metadata,
    }]);
  } catch (error) {
    // Silently fail - analytics shouldn't break the app
    console.debug('Feature tracking error:', error);
  }
}

// Predefined feature names for consistency
export const FEATURES = {
  RISK_CALCULATOR: 'risk_calculator',
  SUPPLIES_PLANNER: 'supplies_planner',
  VAULT: 'vault',
  RED_FOLDER: 'red_folder',
  PLANS: 'plans',
  PANIC_BUTTON: 'panic_button',
  LIBRARY: 'library',
  TIPS: 'tips',
  WEEKLY_BRIEFING: 'weekly_briefing',
  PREMIUM_PURCHASE: 'premium_purchase',
} as const;

export const ACTIONS = {
  START: 'start',
  COMPLETE: 'complete',
  CLICK: 'click',
  EXPORT: 'export',
  SAVE: 'save',
  VIEW: 'view',
} as const;
