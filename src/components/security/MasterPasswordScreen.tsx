/**
 * MasterPasswordScreen
 *
 * Three modes, driven by VaultKeyContext + local sub-state:
 *  - 'needs-setup'  → SetupForm → RecoveryKitPanel → unlocked
 *  - 'needs-unlock' → UnlockForm (with "Forgot password?" → RecoveryForm)
 *  - 'unlocked'     → null (the route guard renders the actual page)
 *
 * Loading and error states are also rendered here so callers can mount this
 * directly behind a route guard.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
  LifeBuoy,
} from 'lucide-react';
import { useVaultKey } from '@/contexts/VaultKeyContext';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/i18n/useLocale';
import { toast } from 'sonner';
import { RecoveryKitPanel } from './RecoveryKitPanel';

const MIN_PASSWORD_LENGTH = 12;

export function MasterPasswordScreen() {
  const { status, errorMessage, setup, unlock, recoverWithPhrase } = useVaultKey();
  const { user } = useAuth();
  const { locale } = useLocale();
  const isPt = locale === 'pt';

  // Sub-states for multi-step flows.
  const [generatedPhrase, setGeneratedPhrase] = useState<string | null>(null);
  const [unlockMode, setUnlockMode] = useState<'unlock' | 'recover'>('unlock');

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

  // SETUP FLOW: form → kit panel
  if (status === 'needs-setup' || (status === 'unlocked' && generatedPhrase)) {
    if (generatedPhrase) {
      return (
        <RecoveryKitPanel
          recoveryPhrase={generatedPhrase}
          userLabel={user?.email ?? undefined}
          onContinue={() => setGeneratedPhrase(null)}
          isPt={isPt}
        />
      );
    }
    return (
      <SetupForm
        onSetup={async (pw) => {
          const res = await setup(pw);
          if (res.ok) setGeneratedPhrase(res.recoveryPhrase);
          return res;
        }}
        isPt={isPt}
      />
    );
  }

  // UNLOCK FLOW: unlock form ⇄ recovery form
  if (status === 'needs-unlock') {
    if (unlockMode === 'recover') {
      return (
        <RecoveryForm
          onRecover={recoverWithPhrase}
          onBack={() => setUnlockMode('unlock')}
          isPt={isPt}
        />
      );
    }
    return (
      <UnlockForm
        onUnlock={unlock}
        onForgot={() => setUnlockMode('recover')}
        isPt={isPt}
      />
    );
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
  onSetup: (
    pw: string
  ) => Promise<{ ok: true; recoveryPhrase: string } | { ok: false; error: string }>;
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
    if ('error' in res && !res.ok) {
      toast.error(res.error);
    } else {
      toast.success(isPt ? 'Master Password criada.' : 'Master Password created.');
      setPw('');
      setPw2('');
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
          <p className="text-xs text-muted-foreground">
            {isPt ? 'Passo 1 de 2 — A seguir guardará o Recovery Kit.' : 'Step 1 of 2 — Next you will save the Recovery Kit.'}
          </p>
        </CardHeader>

        <CardContent className="space-y-5">
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>
              {isPt ? 'Aviso crítico' : 'Critical warning'}
            </AlertTitle>
            <AlertDescription className="text-sm leading-relaxed">
              {isPt
                ? 'Se perder esta password sem o Recovery Kit, os seus dados são irrecuperáveis. Não temos forma de a recuperar — é o que torna esta arquitetura Zero-Knowledge.'
                : 'If you lose this password without the Recovery Kit, your data is irrecoverable. We have no way to reset it — that is what makes this architecture Zero-Knowledge.'}
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
                ? 'Compreendo que se perder a password e o Recovery Kit perco acesso permanente aos meus dados encriptados.'
                : 'I understand that if I lose both the password and the Recovery Kit I permanently lose access to my encrypted data.'}
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
                {isPt ? 'Criar e gerar Recovery Kit' : 'Create and generate Recovery Kit'}
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
  onForgot,
  isPt,
}: {
  onUnlock: (pw: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  onForgot: () => void;
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

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              {isPt ? 'A password nunca sai do dispositivo.' : 'Password never leaves your device.'}
            </p>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs gap-1"
              onClick={onForgot}
            >
              <LifeBuoy className="h-3 w-3" />
              {isPt ? 'Esqueci-me' : 'Forgot?'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recovery (forgot password)
// ─────────────────────────────────────────────────────────────────────────────

function RecoveryForm({
  onRecover,
  onBack,
  isPt,
}: {
  onRecover: (
    phrase: string,
    newPw: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onBack: () => void;
  isPt: boolean;
}) {
  const [phrase, setPhrase] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const wordCount = phrase.trim().split(/\s+/).filter(Boolean).length;
  const tooShort = pw.length > 0 && pw.length < MIN_PASSWORD_LENGTH;
  const mismatch = pw2.length > 0 && pw !== pw2;
  const canSubmit =
    !busy &&
    wordCount >= 12 &&
    pw.length >= MIN_PASSWORD_LENGTH &&
    pw === pw2;

  const handle = async () => {
    if (!canSubmit) return;
    setBusy(true);
    const res = await onRecover(phrase, pw);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
    } else {
      toast.success(
        isPt
          ? 'Conta recuperada. Nova password ativa.'
          : 'Account recovered. New password is active.'
      );
      setPhrase('');
      setPw('');
      setPw2('');
    }
  };

  return (
    <div className="container-narrow py-12">
      <Card className="max-w-xl mx-auto">
        <CardHeader className="space-y-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start gap-2 -ml-2"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
            {isPt ? 'Voltar' : 'Back'}
          </Button>
          <div className="text-center space-y-2">
            <div className="mx-auto p-3 rounded-full bg-warning/10 w-fit">
              <LifeBuoy className="h-6 w-6 text-warning" />
            </div>
            <CardTitle className="text-2xl">
              {isPt ? 'Recuperar com Recovery Kit' : 'Recover with Recovery Kit'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {isPt
                ? 'Cole a sua frase de 24 palavras e defina uma nova Master Password.'
                : 'Paste your 24-word phrase and set a new Master Password.'}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription className="text-xs leading-relaxed">
              {isPt
                ? 'A frase é processada apenas no seu dispositivo. Nunca é enviada para o servidor.'
                : 'The phrase is processed only on your device. It is never sent to the server.'}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {isPt ? 'Frase de recuperação (24 palavras)' : 'Recovery phrase (24 words)'}
            </label>
            <Textarea
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={
                isPt
                  ? 'abandon ability able about ...'
                  : 'abandon ability able about ...'
              }
              rows={4}
              className="font-mono text-sm"
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              {wordCount > 0
                ? isPt
                  ? `${wordCount} palavras detetadas`
                  : `${wordCount} words detected`
                : isPt
                  ? 'Separe as palavras por espaços.'
                  : 'Separate words with spaces.'}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {isPt ? 'Nova Master Password' : 'New Master Password'}
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
              {isPt ? 'Confirmar nova password' : 'Confirm new password'}
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

          <Button className="w-full" onClick={handle} disabled={!canSubmit}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isPt ? 'A recuperar...' : 'Recovering...'}
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                {isPt ? 'Recuperar e definir nova password' : 'Recover and set new password'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
