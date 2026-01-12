/**
 * Wizard Step 2: Safe Destinations
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Plus, Trash2, GripVertical } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import type { WizardStep2SafeLocations as Step2Data, SafeLocation } from '@/lib/planWizard2Types';

interface Props {
  data: Step2Data;
  onChange: (data: Step2Data) => void;
}

const LOCATION_TYPES = {
  en: {
    family: 'Family / Relatives',
    friend: 'Friend',
    hotel: 'Hotel / Accommodation',
    shelter: 'Emergency Shelter',
    other: 'Other',
  },
  pt: {
    family: 'Família / Parentes',
    friend: 'Amigo',
    hotel: 'Hotel / Alojamento',
    shelter: 'Abrigo de Emergência',
    other: 'Outro',
  },
};

export function WizardStep2SafeLocations({ data, onChange }: Props) {
  const { locale } = useLocale();
  const types = LOCATION_TYPES[locale as 'en' | 'pt'] || LOCATION_TYPES.en;

  const addLocation = () => {
    const newLocation: SafeLocation = {
      id: crypto.randomUUID(),
      label: '',
      cityOrArea: '',
      type: 'family',
      priority: data.locations.length + 1,
    };
    onChange({ locations: [...data.locations, newLocation] });
  };

  const updateLocation = (id: string, updates: Partial<SafeLocation>) => {
    onChange({
      locations: data.locations.map(loc => 
        loc.id === id ? { ...loc, ...updates } : loc
      ),
    });
  };

  const removeLocation = (id: string) => {
    const filtered = data.locations.filter(loc => loc.id !== id);
    // Re-number priorities
    onChange({
      locations: filtered.map((loc, idx) => ({ ...loc, priority: idx + 1 })),
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          {locale === 'pt'
            ? 'Adicione 2-3 locais seguros para onde pode ir em caso de evacuação. Estes serão usados para planear rotas estratégicas.'
            : 'Add 2-3 safe locations you could go to in case of evacuation. These will be used to plan strategic routes.'}
        </p>
      </div>

      {/* Existing locations */}
      <div className="space-y-3">
        {data.locations.map((location, index) => (
          <Card key={location.id} className="border-l-4 border-l-primary/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 flex items-center gap-1 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                  <span className="text-sm font-medium">#{index + 1}</span>
                </div>
                
                <div className="flex-1 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{locale === 'pt' ? 'Nome / Rótulo' : 'Name / Label'}</Label>
                      <Input
                        value={location.label}
                        onChange={(e) => updateLocation(location.id, { label: e.target.value })}
                        placeholder={locale === 'pt' ? 'ex: Casa dos pais' : 'e.g., Parents house'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{locale === 'pt' ? 'Cidade / Área' : 'City / Area'}</Label>
                      <Input
                        value={location.cityOrArea}
                        onChange={(e) => updateLocation(location.id, { cityOrArea: e.target.value })}
                        placeholder={locale === 'pt' ? 'ex: Porto, Portugal' : 'e.g., Rotterdam, NL'}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs">{locale === 'pt' ? 'Tipo' : 'Type'}</Label>
                    <Select
                      value={location.type}
                      onValueChange={(value) => updateLocation(location.id, { type: value as SafeLocation['type'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(types).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLocation(location.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add button */}
      {data.locations.length < 5 && (
        <Button variant="outline" onClick={addLocation} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          {locale === 'pt' ? 'Adicionar Destino Seguro' : 'Add Safe Destination'}
        </Button>
      )}

      {/* Tip */}
      {data.locations.length === 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border">
          <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            {locale === 'pt'
              ? 'Pense em: casa de familiares noutra cidade, amigos fora da zona, hotel numa área segura, ou abrigo conhecido.'
              : 'Think of: relatives in another city, friends outside your area, a hotel in a safe zone, or a known shelter.'}
          </div>
        </div>
      )}
    </div>
  );
}
