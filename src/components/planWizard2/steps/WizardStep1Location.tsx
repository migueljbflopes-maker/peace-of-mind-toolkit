/**
 * Wizard Step 1: Location & Context
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MapPin, Car, Users, Languages } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import type { WizardStep1Location as Step1Data } from '@/lib/planWizard2Types';

interface Props {
  data: Step1Data;
  onChange: (data: Step1Data) => void;
}

const COMMON_LANGUAGES = ['English', 'Portuguese', 'Spanish', 'French', 'German', 'Dutch', 'Italian'];

export function WizardStep1Location({ data, onChange }: Props) {
  const { locale } = useLocale();

  const toggleLanguage = (lang: string) => {
    const current = data.languages || [];
    if (current.includes(lang)) {
      onChange({ ...data, languages: current.filter(l => l !== lang) });
    } else {
      onChange({ ...data, languages: [...current, lang] });
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {locale === 'pt'
          ? 'Informação base para personalizar os seus planos de emergência.'
          : 'Basic information to personalize your emergency plans.'}
      </p>

      {/* Location */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          {locale === 'pt' ? 'Localização' : 'Location'}
        </div>
        
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>{locale === 'pt' ? 'País' : 'Country'} *</Label>
            <Input
              value={data.country}
              onChange={(e) => onChange({ ...data, country: e.target.value })}
              placeholder={locale === 'pt' ? 'ex: Portugal' : 'e.g., Netherlands'}
            />
          </div>
          <div>
            <Label>{locale === 'pt' ? 'Cidade' : 'City'} *</Label>
            <Input
              value={data.city}
              onChange={(e) => onChange({ ...data, city: e.target.value })}
              placeholder={locale === 'pt' ? 'ex: Lisboa' : 'e.g., Amsterdam'}
            />
          </div>
        </div>
        
        <div>
          <Label>{locale === 'pt' ? 'Bairro / Zona (opcional)' : 'Neighborhood / Area (optional)'}</Label>
          <Input
            value={data.neighborhood || ''}
            onChange={(e) => onChange({ ...data, neighborhood: e.target.value })}
            placeholder={locale === 'pt' ? 'ex: Alfama' : 'e.g., City Center'}
          />
        </div>
      </div>

      {/* Vehicle */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-3">
          <Car className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium">{locale === 'pt' ? 'Tem carro?' : 'Do you have a car?'}</p>
            <p className="text-sm text-muted-foreground">
              {locale === 'pt' ? 'Afeta opções de evacuação' : 'Affects evacuation options'}
            </p>
          </div>
        </div>
        <Switch
          checked={data.hasCar}
          onCheckedChange={(checked) => onChange({ ...data, hasCar: checked })}
        />
      </div>

      {/* Household */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Users className="h-4 w-4 text-primary" />
          {locale === 'pt' ? 'Agregado Familiar' : 'Household'}
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>{locale === 'pt' ? 'Adultos' : 'Adults'}</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={data.adults}
              onChange={(e) => onChange({ ...data, adults: Math.max(1, parseInt(e.target.value) || 1) })}
            />
          </div>
          <div>
            <Label>{locale === 'pt' ? 'Crianças' : 'Kids'}</Label>
            <Input
              type="number"
              min={0}
              max={20}
              value={data.kids}
              onChange={(e) => onChange({ ...data, kids: Math.max(0, parseInt(e.target.value) || 0) })}
            />
          </div>
          <div>
            <Label>{locale === 'pt' ? 'Animais' : 'Pets'}</Label>
            <Input
              type="number"
              min={0}
              max={20}
              value={data.pets}
              onChange={(e) => onChange({ ...data, pets: Math.max(0, parseInt(e.target.value) || 0) })}
            />
          </div>
        </div>
      </div>

      {/* Mobility constraints */}
      <div>
        <Label>{locale === 'pt' ? 'Restrições de mobilidade / médicas (opcional)' : 'Mobility / medical constraints (optional)'}</Label>
        <Textarea
          value={data.mobilityConstraints || ''}
          onChange={(e) => onChange({ ...data, mobilityConstraints: e.target.value })}
          placeholder={locale === 'pt' 
            ? 'ex: Membro da família com mobilidade reduzida'
            : 'e.g., Family member with limited mobility'}
          rows={2}
        />
      </div>

      {/* Languages */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Languages className="h-4 w-4 text-primary" />
          {locale === 'pt' ? 'Idiomas (opcional)' : 'Languages (optional)'}
        </div>
        <div className="flex flex-wrap gap-2">
          {COMMON_LANGUAGES.map((lang) => (
            <Badge
              key={lang}
              variant={(data.languages || []).includes(lang) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleLanguage(lang)}
            >
              {lang}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
