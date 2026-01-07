/**
 * Helper to check if login is required for an action.
 * Returns navigation path if login needed, null if user is authenticated.
 */
export function getLoginRedirectPath(
  isAuthenticated: boolean,
  returnUrl?: string
): string | null {
  if (isAuthenticated) return null;
  
  const effectiveReturnUrl = returnUrl || (typeof window !== 'undefined' ? window.location.pathname : '/');
  return `/login?return_url=${encodeURIComponent(effectiveReturnUrl)}`;
}

/**
 * Draft storage keys for offline-first UX
 */
export const DRAFT_KEYS = {
  RISK_ASSESSMENT: 'draft_risk_assessment',
  SUPPLIES_PLAN: 'draft_supplies_plan',
  WEEKLY_BRIEFING: 'draft_weekly_briefing',
} as const;

/**
 * Check if there's a pending draft that should be saved after login
 */
export function hasPendingDraft(key: keyof typeof DRAFT_KEYS): boolean {
  if (typeof window === 'undefined') return false;
  const draft = localStorage.getItem(DRAFT_KEYS[key]);
  return draft !== null && draft !== '';
}

/**
 * Get draft data from localStorage
 */
export function getDraft<T>(key: keyof typeof DRAFT_KEYS): T | null {
  if (typeof window === 'undefined') return null;
  const draft = localStorage.getItem(DRAFT_KEYS[key]);
  if (!draft) return null;
  try {
    return JSON.parse(draft) as T;
  } catch {
    return null;
  }
}

/**
 * Save draft to localStorage
 */
export function saveDraft<T>(key: keyof typeof DRAFT_KEYS, data: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DRAFT_KEYS[key], JSON.stringify(data));
}

/**
 * Clear draft from localStorage after successful save
 */
export function clearDraft(key: keyof typeof DRAFT_KEYS): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DRAFT_KEYS[key]);
}

/**
 * Check all drafts and return which ones have pending data
 */
export function getPendingDrafts(): Array<keyof typeof DRAFT_KEYS> {
  const pending: Array<keyof typeof DRAFT_KEYS> = [];
  
  for (const key of Object.keys(DRAFT_KEYS) as Array<keyof typeof DRAFT_KEYS>) {
    if (hasPendingDraft(key)) {
      pending.push(key);
    }
  }
  
  return pending;
}
