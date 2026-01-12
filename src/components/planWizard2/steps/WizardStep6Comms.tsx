/**
 * Wizard Step 6: Communication & Meetups
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, MessageSquare, Phone } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { 
  CommChannel, 
  COMM_LABELS,
  WizardStep6Comms as Step6Data 
} from '@/lib/planWizard2Types';

interface Props {
  data: Step6Data;
  onChange: (data: Step6Data) => void;
}

const ALL_CHANNELS: CommChannel[] = ['whatsapp', 'sms', 'call', 'signal', 'email'];

const CHANNEL_ICONS: Record<CommChannel, string> = {
  whatsapp: '💬',
  sms: '📱',
  call: '📞',
  signal: '🔐',
  email: '📧',
};

export function WizardStep6Comms({ data, onChange }: Props) {
  const { locale } = useLocale();
  const labels = COMM_LABELS[locale as 'en' | 'pt'] || COMM_LABELS.en;

  const toggleChannel = (channel: CommChannel) => {
    const current = data.preferredChannels || [];
    if (current.includes(channel)) {
      onChange({ ...data, preferredChannels: current.filter(c => c !== channel) });
    } else {
      onChange({ ...data, preferredChannels: [...current, channel] });
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {locale === 'pt'
          ? 'Defina pontos de encontro e preferências de comunicação para a sua família.'
          : 'Define meeting points and communication preferences for your family.'}
      </p>

      {/* Meeting points */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          {locale === 'pt' ? 'Pontos de Encontro' : 'Meeting Points'}
        </div>
        
        <div className="space-y-3">
          <div>
            <Label>
              {locale === 'pt' ? 'Ponto A (perto de casa)' : 'Point A (near home)'}
            </Label>
            <Input
              value={data.meetingPointA}
              onChange={(e) => onChange({ ...data, meetingPointA: e.target.value })}
              placeholder={locale === 'pt' 
                ? 'ex: Frente ao café da esquina'
                : 'e.g., In front of the corner café'}
            />
          </div>
          
          <div>
            <Label>
              {locale === 'pt' ? 'Ponto B (fora da zona)' : 'Point B (outside area)'}
            </Label>
            <Input
              value={data.meetingPointB}
              onChange={(e) => onChange({ ...data, meetingPointB: e.target.value })}
              placeholder={locale === 'pt' 
                ? 'ex: Estação de comboios central'
                : 'e.g., Central train station'}
            />
          </div>
        </div>
      </div>

      {/* Communication channels */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MessageSquare className="h-4 w-4 text-primary" />
          {locale === 'pt' ? 'Canais de Comunicação Preferidos' : 'Preferred Communication Channels'}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {ALL_CHANNELS.map((channel) => {
            const isSelected = (data.preferredChannels || []).includes(channel);
            return (
              <button
                key={channel}
                type="button"
                onClick={() => toggleChannel(channel)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all
                  ${isSelected 
                    ? 'border-primary bg-primary/10 text-foreground' 
                    : 'border-muted bg-muted/30 text-muted-foreground hover:border-primary/50'}
                `}
              >
                <span>{CHANNEL_ICONS[channel]}</span>
                <span className="text-sm font-medium">{labels[channel]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Out of area contact */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Phone className="h-4 w-4 text-primary" />
          {locale === 'pt' ? 'Contacto Fora da Área (opcional)' : 'Out-of-Area Contact (optional)'}
        </div>
        <Input
          value={data.outOfAreaContact || ''}
          onChange={(e) => onChange({ ...data, outOfAreaContact: e.target.value })}
          placeholder={locale === 'pt' 
            ? 'Nome ou relação (ex: Tio João em Faro)'
            : 'Name or relation (e.g., Uncle John in London)'}
        />
        <p className="text-xs text-muted-foreground">
          {locale === 'pt'
            ? 'Um contacto fora da sua zona que pode coordenar comunicações se as redes locais falharem.'
            : 'A contact outside your area who can coordinate communications if local networks fail.'}
        </p>
      </div>
    </div>
  );
}
