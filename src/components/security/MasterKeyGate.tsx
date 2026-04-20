/**
 * MasterKeyGate
 *
 * Route-level guard. Renders the MasterPasswordScreen until the Master Key
 * is unlocked in memory, then renders its children.
 *
 * Wrap any page that needs encrypt/decrypt access (Vault, Plans, etc.).
 *
 * NOTE: This guard assumes the caller has already enforced auth + premium
 * gating above it. It only handles the encryption gate.
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
  const { isUnlocked } = useVaultKey();
  if (isUnlocked) return <>{children}</>;
  return <>{fallback ?? <MasterPasswordScreen />}</>;
}
