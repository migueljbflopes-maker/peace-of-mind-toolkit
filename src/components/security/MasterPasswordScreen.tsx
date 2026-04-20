/**
 * MasterPasswordScreen
 *
 * Two modes, driven by VaultKeyContext:
 *  - 'needs-setup'  → Setup form: create the Master Password (with hard warning).
 *  - 'needs-unlock' → Unlock form: ask for the password to unwrap the key.
 *
 * Loading and error states are also rendered here so callers can mount this
 * directly behind a route guard.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ShieldAlert, ShieldCheck, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useVaultKey } from '@/contexts/VaultKeyContext';
import { useLocale } from '@/i18n/useLocale';
import { toast } from 'sonner';

const MIN_PASSWORD_LENGTH = 12;

export function MasterPasswordScreen() {
  const { status, errorMessage, setup, unlock } = useVaultKey();
  const { locale } = useLocale();

  const isPt = locale === 'pt';

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="container-narrow py-12">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>{isPt ? 'Erro de segurança' : 'Security error'}</AlertTitle>
          <AlertDescription>
            {errorMessage ?? (isPt ? 'Não foi possível verificar a chave.' : 'Could not verify key.')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (status === 'needs-setup') {
    return <SetupForm onSetup={setup} isPt={isPt} />;
  }

  if (status === 'needs-unlock') {
    return <UnlockForm onUnlock={unlock} isPt={isPt} />;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup (first-time user)
// ─────────────────────────────────────────────────────────────────────────────

function SetupForm({
  onSetup,
  isPt,
}: {
  onSetup: (pw: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  isPt: boolean;
}) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const tooShort = pw.length > 0 && pw.length < MIN_PASSWORD_LENGTH;
  const mismatch = pw2.length > 0 && pw !== pw2;
  const canSubmit =
    !busy &&
    pw.length >= MIN_PASSWORD_LENGTH &&
    pw === pw2 &&
    acknowledged;

  const handle = async () => {
    if (!canSubmit) return;
    setBusy(true);
    const res = await onSetup(pw);
    setBusy(false);
    if (res.ok) {
      toast.success(isPt ? 'Master Password criada.' : 'Master Password created.');
      setPw('');
      setPw2('');
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="container-narrow py-12">
      <Card className="max-w-xl mx-auto">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {isPt ? 'Criar a sua Master Password' : 'Create your Master Password'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isPt
              ? 'Esta password encripta os seus dados sensíveis (Vault, Planos) no seu dispositivo, antes de qualquer sincronização.'
              : 'This password encrypts your sensitive data (Vault, Plans) on your device, before any sync happens.'}
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>
              {isPt ? 'Aviso crítico — sem recuperação' : 'Critical warning — no recovery'}
            </AlertTitle>
            <AlertDescription className="text-sm leading-relaxed">
              {isPt
                ? 'Se perder esta password, os seus dados são irrecuperáveis. Não temos forma de a recuperar — é o que torna esta arquitetura Zero-Knowledge.'
                : 'If you lose this password, your data is irrecoverable. We have no way to reset it — that is what makes this architecture Zero-Knowledge.'}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {isPt ? 'Master Password' : 'Master Password'}
            </label>
            <div className="relative">
              <Input
                type={show ? 'text' : 'password'}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder={isPt ? 'Mínimo 12 caracteres' : 'Minimum 12 characters'}
                autoComplete="new-password"
                disabled={busy}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShow((s) => !s)}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {tooShort && (
              <p className="text-xs text-destructive">
                {isPt ? `Mínimo ${MIN_PASSWORD_LENGTH} caracteres.` : `Minimum ${MIN_PASSWORD_LENGTH} characters.`}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {isPt ? 'Confirmar Master Password' : 'Confirm Master Password'}
            </label>
            <Input
              type={show ? 'text' : 'password'}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              autoComplete="new-password"
              disabled={busy}
              onKeyDown={(e) => e.key === 'Enter' && handle()}
            />
            {mismatch && (
              <p className="text-xs text-destructive">
                {isPt ? 'As passwords não coincidem.' : 'Passwords do not match.'}
              </p>
            )}
          </div>

          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-md border bg-muted/30">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
              disabled={busy}
            />
            <span className="text-sm text-foreground">
              {isPt
                ? 'Compreendo que se perder esta password perco acesso permanente aos meus dados encriptados.'
                : 'I understand that if I lose this password I permanently lose access to my encrypted data.'}
            </span>
          </label>

          <Button className="w-full" onClick={handle} disabled={!canSubmit}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isPt ? 'A criar...' : 'Creating...'}
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                {isPt ? 'Criar e desbloquear' : 'Create and unlock'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Unlock (returning user)
// ─────────────────────────────────────────────────────────────────────────────

function UnlockForm({
  onUnlock,
  isPt,
}: {
  onUnlock: (pw: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  isPt: boolean;
}) {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);

  const handle = async () => {
    if (!pw || busy) return;
    setBusy(true);
    const res = await onUnlock(pw);
    setBusy(false);
    if (!res.ok) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      toast.error(isPt ? 'Master Password incorreta.' : 'Incorrect master password.');
      setPw('');
    }
  };

  return (
    <div className="container-narrow py-12">
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">
            {isPt ? 'Desbloquear o Cofre' : 'Unlock the Vault'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isPt
              ? 'Introduza a sua Master Password para desencriptar os dados nesta sessão.'
              : 'Enter your Master Password to decrypt your data for this session.'}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className={`relative ${shake ? 'animate-shake' : ''}`}>
            <Input
              type={show ? 'text' : 'password'}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handle()}
              placeholder={isPt ? 'Master Password' : 'Master Password'}
              autoComplete="current-password"
              disabled={busy}
              autoFocus
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShow((s) => !s)}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          <Button className="w-full" onClick={handle} disabled={!pw || busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isPt ? 'A desbloquear...' : 'Unlocking...'}
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                {isPt ? 'Desbloquear' : 'Unlock'}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            {isPt
              ? 'A sua password nunca sai do dispositivo.'
              : 'Your password never leaves your device.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
