/**
 * DataLossWarning - Enhanced warning component for vault data loss risks
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangle, 
  KeyRound, 
  HardDrive,
  FileWarning,
  Shield
} from 'lucide-react';

interface DataLossWarningProps {
  variant: 'setup' | 'header' | 'footer' | 'critical';
  acknowledged?: boolean;
  onAcknowledge?: (acknowledged: boolean) => void;
}

export function DataLossWarning({ variant, acknowledged, onAcknowledge }: DataLossWarningProps) {
  if (variant === 'setup') {
    return (
      <div className="space-y-4">
        <Alert className="border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <AlertTitle className="text-destructive font-semibold">
            Importante: Não Conseguimos Recuperar a Tua Passphrase
          </AlertTitle>
          <AlertDescription className="text-destructive/90 mt-2 space-y-3">
            <p>
              Os teus dados são encriptados <strong>apenas</strong> com a tua passphrase. 
              Se a esqueceres, <strong>não há forma</strong> de recuperar os dados.
            </p>
            
            <div className="bg-background/50 rounded-lg p-3 space-y-2 text-sm">
              <p className="font-medium text-foreground/90">Recomendamos:</p>
              <ul className="space-y-1.5 text-foreground/80">
                <li className="flex items-start gap-2">
                  <KeyRound className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                  Guarda a passphrase num gestor de passwords
                </li>
                <li className="flex items-start gap-2">
                  <FileWarning className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                  Anota num papel guardado em local seguro
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                  Partilha com uma pessoa de absoluta confiança
                </li>
              </ul>
            </div>

            {onAcknowledge && (
              <div className="flex items-start gap-3 pt-2 border-t border-destructive/20">
                <Checkbox
                  id="acknowledge-warning"
                  checked={acknowledged}
                  onCheckedChange={(checked) => onAcknowledge(!!checked)}
                  className="mt-0.5 border-destructive/50"
                />
                <Label 
                  htmlFor="acknowledge-warning" 
                  className="text-destructive/90 cursor-pointer leading-relaxed text-sm"
                >
                  Compreendo que se esquecer a passphrase, perderei acesso permanente aos meus dados encriptados
                </Label>
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (variant === 'header') {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
        <HardDrive className="h-3.5 w-3.5" />
        <span>Encriptado neste dispositivo</span>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
        <span>
          Limpar os dados do browser apaga o Vault local. 
          Mantém a tua passphrase segura para recuperar os dados.
        </span>
      </div>
    );
  }

  // Critical variant - full warning
  return (
    <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
        <strong>Aviso de Perda de Dados:</strong> Se limpares os dados do browser ou 
        perderes acesso a este dispositivo sem backup cloud, os dados serão perdidos permanentemente.
      </AlertDescription>
    </Alert>
  );
}
