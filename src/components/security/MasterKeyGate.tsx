/**
 * MasterKeyGate
 *
 * Route-level guard. Renders the MasterPasswordScreen until the Master Key
 * is unlocked in memory, then renders its children.
 *
 * Wrap any page that needs encrypt/decrypt access (Vault, Plans, etc.).
 *
 * There is no auth gate above this one in src/App.tsx, so the gate handles
 * the signed-out visitor itself (backlog F-11):
 *
 *   session being restored → a spinner (never the sign-in card: the visitor
 *                            may turn out to be signed in)
 *   signed out             → the navigation bar and a sign-in card that
 *                            returns to this address after sign-in
 *   signed in, locked      → MasterPasswordScreen (create / unlock / recover)
 *   unlocked               → the page
 *
 * The page is never mounted for a signed-out visitor: the pages behind the
 * gate assume an unlocked key. Premium is checked by the page itself, after
 * the unlock.
 */

import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/i18n/useLocale';
import { useVaultKey } from '@/contexts/VaultKeyContext';
import { LoginGateCard } from '@/components/LoginGateCard';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MasterPasswordScreen } from './MasterPasswordScreen';

interface MasterKeyGateProps {
  children: ReactNode;
  /** Optional fallback if you need a custom layout around the gate screen. */
  fallback?: ReactNode;
}

export function MasterKeyGate({ children, fallback }: MasterKeyGateProps) {
  const { user, loading: authLoading } = useAuth();
  const { isUnlocked, status } = useVaultKey();
  const { t } = useLocale();

  // Who is signed in is read from auth itself, not from `status`: the vault
  // key status follows auth one render late, and for that render it would
  // show a signed-in user the sign-in card (or a signed-out one the page).
  if (authLoading) return <GateLoading label={t.common.loading} />;

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 container-wide section-padding py-8">
          <LoginGateCard feature={t.signedOutGate.title} description={t.signedOutGate.description} />
        </main>
        <Footer />
      </div>
    );
  }

  // `isUnlocked` turns true only once the Recovery Kit step is confirmed and
  // the key is stored (backlog F-10): until then MasterPasswordScreen stays
  // mounted, holding the words, and no protected page renders.
  if (isUnlocked) return <>{children}</>;
  // Signed in a moment ago and the key status has not caught up yet.
  if (status === 'no-user') return <GateLoading label={t.common.loading} />;
  return <>{fallback ?? <MasterPasswordScreen />}</>;
}

/** Same spinner as MasterPasswordScreen's own loading state, so nothing jumps. */
function GateLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
