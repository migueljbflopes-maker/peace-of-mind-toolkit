/**
 * MasterKeyGate
 *
 * Route-level guard. Renders the MasterPasswordScreen until the Master Key
 * is unlocked in memory, then renders its children.
 *
 * Wrap any page that needs encrypt/decrypt access (Vault, Plans, etc.).
 *
 * NOTE: This guard assumes the caller has already enforced auth + premium
 * gating above it. It only handles the encryption gate. If somehow the user
 * is not authenticated when this mounts, we render the fallback (or nothing)
 * so the parent route can handle the login redirect — we never show the
 * Master Password screen to an anonymous user.
 */

import { ReactNode } from 'react';
import { useVaultKey } from '@/contexts/VaultKeyContext';
import { MasterPasswordScreen } from './MasterPasswordScreen';

interface MasterKeyGateProps {
  children: ReactNode;
  /** Optional fallback if you need a custom layout around the gate screen. */
  fallback?: ReactNode;
}

export function MasterKeyGate({ children, fallback }: MasterKeyGateProps) {
  const { isUnlocked, status } = useVaultKey();
  if (isUnlocked) return <>{children}</>;
  // Don't show the password screen to an anonymous user — let the parent
  // route's auth gate take over (it will redirect to /login).
  if (status === 'no-user') return <>{fallback ?? null}</>;
  return <>{fallback ?? <MasterPasswordScreen />}</>;
}
