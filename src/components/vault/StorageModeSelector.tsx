/**
 * StorageModeSelector - Choose between device-only and device+cloud storage
 */

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  HardDrive, 
  Cloud, 
  Lock, 
  ShieldCheck,
  Info
} from 'lucide-react';
import { VaultStorageMode } from './types';

interface StorageModeSelectorProps {
  value: VaultStorageMode;
  onChange: (mode: VaultStorageMode) => void;
  disabled?: boolean;
}

export function StorageModeSelector({ value, onChange, disabled }: StorageModeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="h-4 w-4 text-primary" />
        <h3 className="font-medium">Como queres guardar os teus dados?</h3>
      </div>

      <RadioGroup 
        value={value} 
        onValueChange={(v) => onChange(v as VaultStorageMode)}
        disabled={disabled}
        className="space-y-3"
      >
        {/* Device Only Option */}
        <div className={`relative flex items-start gap-4 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
          value === 'device-only' 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <RadioGroupItem value="device-only" id="device-only" className="mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <HardDrive className="h-4 w-4 text-primary" />
              <Label htmlFor="device-only" className="font-medium cursor-pointer">
                Apenas Neste Dispositivo
              </Label>
              <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 px-2 py-0.5 rounded-full">
                Máxima Privacidade
              </span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 mt-2">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Dados ficam APENAS neste dispositivo
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">!</span>
                Se perderes o dispositivo ou limpares o browser, perdes os dados
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Ninguém mais tem acesso, nem nós
              </li>
            </ul>
          </div>
        </div>

        {/* Device + Cloud Option */}
        <div className={`relative flex items-start gap-4 p-4 rounded-lg border-2 transition-colors cursor-pointer ${
          value === 'device-cloud' 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <RadioGroupItem value="device-cloud" id="device-cloud" className="mt-1" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Cloud className="h-4 w-4 text-primary" />
              <Label htmlFor="device-cloud" className="font-medium cursor-pointer">
                Dispositivo + Backup Cloud
              </Label>
              <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full">
                Recomendado
              </span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 mt-2">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Dados encriptados são guardados no cloud
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Podes aceder de outro dispositivo com a mesma passphrase
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                Nós só vemos ciphertext, nunca os teus dados
              </li>
            </ul>
          </div>
        </div>
      </RadioGroup>

      {/* Security info */}
      <Alert className="border-primary/20 bg-primary/5">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm text-foreground/80">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
            <span>
              A encriptação é <strong>sempre</strong> feita no teu dispositivo. 
              A tua passphrase <strong>nunca</strong> é enviada para o cloud.
            </span>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
