/**
 * RecoveryKitPanel
 *
 * Mandatory backup screen shown immediately after first-time Master Password
 * setup. The user MUST either copy the phrase to clipboard or download it as
 * a TXT file AND tick the confirmation checkbox before they can proceed.
 *
 * Why mandatory: in a Zero-Knowledge system the recovery phrase is the only
 * fallback if the password is forgotten. Skipping this step would silently
 * lock the user out of their own data later.
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertTriangle,
  Copy,
  Check,
  Download,
  ShieldCheck,
  EyeOff,
  Eye,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';

interface RecoveryKitPanelProps {
  recoveryPhrase: string;
  /** User email/identifier shown in the printable kit, for reference. */
  userLabel?: string;
  /** Called once the user has both backed up AND acknowledged. */
  onContinue: () => void;
  isPt: boolean;
}

export function RecoveryKitPanel({
  recoveryPhrase,
  userLabel,
  onContinue,
  isPt,
}: RecoveryKitPanelProps) {
  const [revealed, setRevealed] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const words = useMemo(() => recoveryPhrase.split(/\s+/), [recoveryPhrase]);

  // Must have backed up at least once (copy OR download) AND acknowledged.
  const hasBackedUp = copied || downloaded;
  const canContinue = hasBackedUp && acknowledged;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryPhrase);
      setCopied(true);
      toast.success(isPt ? 'Copiado para a área de transferência.' : 'Copied to clipboard.');
    } catch {
      toast.error(isPt ? 'Não foi possível copiar.' : 'Could not copy.');
    }
  };

  const buildKitText = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const lines = [
      isPt ? '=== Recovery Kit — Am I Ready ===' : '=== Recovery Kit — Am I Ready ===',
      '',
      isPt ? `Conta: ${userLabel ?? '(desconhecida)'}` : `Account: ${userLabel ?? '(unknown)'}`,
      isPt ? `Data: ${dateStr}` : `Date: ${dateStr}`,
      '',
      isPt
        ? 'Este Recovery Kit é a ÚNICA forma de recuperar a sua conta se'
        : 'This Recovery Kit is the ONLY way to recover your account if you',
      isPt
        ? 'esquecer a Master Password. Guarde-o num local seguro e offline'
        : 'forget your Master Password. Store it in a safe, offline location',
      isPt
        ? '(cofre, papel, gestor de passwords). Não o partilhe com ninguém.'
        : '(safe, paper, password manager). Do not share it with anyone.',
      '',
      isPt ? 'FRASE DE RECUPERAÇÃO (24 palavras):' : 'RECOVERY PHRASE (24 words):',
      '',
      ...words.map((w, i) => `${String(i + 1).padStart(2, '0')}.  ${w}`),
      '',
      isPt
        ? '— Am I Ready · Zero-Knowledge architecture'
        : '— Am I Ready · Zero-Knowledge architecture',
    ];
    return lines.join('\n');
  };

  const handleDownload = () => {
    const text = buildKitText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `am-i-ready-recovery-kit-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    toast.success(isPt ? 'Recovery Kit descarregado.' : 'Recovery Kit downloaded.');
  };

  const handlePrint = () => {
    const text = buildKitText();
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) {
      toast.error(isPt ? 'Bloqueado pelo browser.' : 'Blocked by browser.');
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head><title>Recovery Kit</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace; padding: 40px; }
        pre { white-space: pre-wrap; font-size: 14px; line-height: 1.7; }
        @media print { body { padding: 20px; } }
      </style>
    </head><body><pre>${text.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!)}</pre>
    <script>window.onload = () => window.print();</script>
    </body></html>`);
    win.document.close();
  };

  return (
    <div className="container-narrow py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto p-3 rounded-full bg-warning/10 w-fit">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <CardTitle className="text-2xl">
            {isPt ? 'Guarde o seu Recovery Kit' : 'Save your Recovery Kit'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isPt
              ? 'Esta é a sua ÚNICA forma de recuperar a conta se esquecer a Master Password.'
              : 'This is your ONLY way to recover the account if you forget the Master Password.'}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {isPt ? 'Não saia desta página antes de guardar' : 'Do not leave this page before saving'}
            </AlertTitle>
            <AlertDescription className="text-sm leading-relaxed">
              {isPt
                ? 'Não conseguimos voltar a mostrar estas palavras. Guarde-as num local seguro e offline (papel, gestor de passwords, cofre).'
                : 'We cannot show these words again. Store them somewhere safe and offline (paper, password manager, safe).'}
            </AlertDescription>
          </Alert>

          {/* Phrase grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {isPt ? 'Frase de recuperação (24 palavras)' : 'Recovery phrase (24 words)'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRevealed((r) => !r)}
                className="gap-2"
              >
                {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {revealed ? (isPt ? 'Ocultar' : 'Hide') : (isPt ? 'Mostrar' : 'Show')}
              </Button>
            </div>

            <div
              className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-4 rounded-lg border-2 border-dashed ${
                revealed ? 'bg-muted/40' : 'bg-muted/80'
              }`}
            >
              {words.map((w, i) => (
                <div
                  key={i}
                  className="flex items-baseline gap-2 px-3 py-2 rounded-md bg-background border text-sm font-mono"
                >
                  <span className="text-xs text-muted-foreground tabular-nums w-5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-foreground">
                    {revealed ? w : '••••••'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              type="button"
              variant={copied ? 'secondary' : 'outline'}
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? (isPt ? 'Copiado' : 'Copied') : (isPt ? 'Copiar' : 'Copy')}
            </Button>
            <Button
              type="button"
              variant={downloaded ? 'secondary' : 'outline'}
              onClick={handleDownload}
              className="gap-2"
            >
              {downloaded ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              {downloaded ? (isPt ? 'Descarregado' : 'Downloaded') : (isPt ? 'Descarregar (.txt)' : 'Download (.txt)')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              {isPt ? 'Imprimir' : 'Print'}
            </Button>
          </div>

          {!hasBackedUp && (
            <p className="text-xs text-muted-foreground text-center">
              {isPt
                ? 'Copie ou descarregue o kit antes de continuar.'
                : 'Copy or download the kit before continuing.'}
            </p>
          )}

          {/* Acknowledgement */}
          <label
            className={`flex items-start gap-3 cursor-pointer p-3 rounded-md border ${
              hasBackedUp ? 'bg-muted/30' : 'bg-muted/10 opacity-60 cursor-not-allowed'
            }`}
          >
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
              disabled={!hasBackedUp}
            />
            <span className="text-sm text-foreground">
              {isPt
                ? 'Confirmo que guardei a frase de recuperação num local seguro. Compreendo que não voltará a ser mostrada.'
                : 'I confirm I have saved the recovery phrase in a safe place. I understand it will not be shown again.'}
            </span>
          </label>

          <Button className="w-full" onClick={onContinue} disabled={!canContinue}>
            <ShieldCheck className="h-4 w-4 mr-2" />
            {isPt ? 'Concluir e entrar no Cofre' : 'Finish and enter the Vault'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
