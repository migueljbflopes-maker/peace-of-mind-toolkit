/**
 * Plan Section Editor
 * 
 * Inline editing component for individual plan sections.
 * Supports text, list items, and nested object editing.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, Save, XCircle, GripVertical } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';

interface ListEditorProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}

export function ListEditor({ items, onChange, placeholder }: ListEditorProps) {
  const [newItem, setNewItem] = useState('');
  const { locale } = useLocale();

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2 group">
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
          <Input
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeItem(index)}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={placeholder || (locale === 'pt' ? 'Adicionar item...' : 'Add item...')}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addItem())}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addItem}
          disabled={!newItem.trim()}
          className="h-10 w-10"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}

export function TextEditor({ value, onChange, multiline, placeholder }: TextEditorProps) {
  if (multiline) {
    return (
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="resize-none"
      />
    );
  }
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

interface MeetupPointsEditorProps {
  value: { primary: string; secondary: string };
  onChange: (value: { primary: string; secondary: string }) => void;
}

export function MeetupPointsEditor({ value, onChange }: MeetupPointsEditorProps) {
  const { locale } = useLocale();
  
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-muted-foreground">
          {locale === 'pt' ? 'Ponto Principal' : 'Primary Point'}
        </label>
        <Input
          value={value.primary || ''}
          onChange={(e) => onChange({ ...value, primary: e.target.value })}
          placeholder={locale === 'pt' ? 'Ex: Café da esquina' : 'E.g. Corner cafe'}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-muted-foreground">
          {locale === 'pt' ? 'Ponto Secundário' : 'Secondary Point'}
        </label>
        <Input
          value={value.secondary || ''}
          onChange={(e) => onChange({ ...value, secondary: e.target.value })}
          placeholder={locale === 'pt' ? 'Ex: Parque central' : 'E.g. Central park'}
        />
      </div>
    </div>
  );
}

interface RoutesEditorProps {
  value: { primary: string; alt1: string; alt2: string; fallback: string };
  onChange: (value: { primary: string; alt1: string; alt2: string; fallback: string }) => void;
}

export function RoutesEditor({ value, onChange }: RoutesEditorProps) {
  const { locale } = useLocale();
  
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-green-700">
          {locale === 'pt' ? 'Rota Principal' : 'Primary Route'}
        </label>
        <Textarea
          value={value.primary || ''}
          onChange={(e) => onChange({ ...value, primary: e.target.value })}
          rows={2}
          className="resize-none"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-muted-foreground">
          {locale === 'pt' ? 'Alternativa 1' : 'Alternative 1'}
        </label>
        <Textarea
          value={value.alt1 || ''}
          onChange={(e) => onChange({ ...value, alt1: e.target.value })}
          rows={2}
          className="resize-none"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-muted-foreground">
          {locale === 'pt' ? 'Alternativa 2' : 'Alternative 2'}
        </label>
        <Textarea
          value={value.alt2 || ''}
          onChange={(e) => onChange({ ...value, alt2: e.target.value })}
          rows={2}
          className="resize-none"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-muted-foreground">
          Fallback
        </label>
        <Textarea
          value={value.fallback || ''}
          onChange={(e) => onChange({ ...value, fallback: e.target.value })}
          rows={2}
          className="resize-none"
        />
      </div>
    </div>
  );
}

interface ChecklistsEditorProps {
  value: {
    docs: string[];
    meds: string[];
    money: string[];
    comms: string[];
    gear: string[];
    pets_kids: string[];
    home: string[];
  };
  onChange: (value: ChecklistsEditorProps['value']) => void;
}

export function ChecklistsEditor({ value, onChange }: ChecklistsEditorProps) {
  const { locale } = useLocale();
  
  const categories = [
    { key: 'docs', label: locale === 'pt' ? 'Documentos' : 'Documents' },
    { key: 'meds', label: locale === 'pt' ? 'Medicamentos' : 'Medications' },
    { key: 'money', label: locale === 'pt' ? 'Dinheiro' : 'Money' },
    { key: 'comms', label: locale === 'pt' ? 'Comunicação' : 'Communications' },
    { key: 'gear', label: locale === 'pt' ? 'Equipamento' : 'Gear' },
    { key: 'pets_kids', label: locale === 'pt' ? 'Crianças & Animais' : 'Kids & Pets' },
    { key: 'home', label: locale === 'pt' ? 'Casa' : 'Home' },
  ] as const;

  return (
    <div className="space-y-4">
      {categories.map(({ key, label }) => (
        <div key={key} className="border rounded-lg p-3">
          <h4 className="font-medium text-sm mb-2">{label}</h4>
          <ListEditor
            items={value[key] || []}
            onChange={(items) => onChange({ ...value, [key]: items })}
          />
        </div>
      ))}
    </div>
  );
}

interface DestinationsEditorProps {
  value: Array<{ label: string; reason: string; priority: number }>;
  onChange: (value: DestinationsEditorProps['value']) => void;
}

export function DestinationsEditor({ value, onChange }: DestinationsEditorProps) {
  const { locale } = useLocale();

  const addDestination = () => {
    onChange([
      ...value,
      { label: '', reason: '', priority: value.length + 1 },
    ]);
  };

  const removeDestination = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    // Reorder priorities
    onChange(updated.map((d, i) => ({ ...d, priority: i + 1 })));
  };

  const updateDestination = (
    index: number,
    field: 'label' | 'reason',
    newValue: string
  ) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: newValue };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {value.map((dest, index) => (
        <div key={index} className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">#{dest.priority}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeDestination(index)}
              className="h-6 w-6 text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <Input
            value={dest.label}
            onChange={(e) => updateDestination(index, 'label', e.target.value)}
            placeholder={locale === 'pt' ? 'Nome do destino' : 'Destination name'}
          />
          <Input
            value={dest.reason}
            onChange={(e) => updateDestination(index, 'reason', e.target.value)}
            placeholder={locale === 'pt' ? 'Razão' : 'Reason'}
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addDestination}>
        <Plus className="h-4 w-4 mr-1" />
        {locale === 'pt' ? 'Adicionar Destino' : 'Add Destination'}
      </Button>
    </div>
  );
}

// Section edit wrapper with save/cancel
interface SectionEditWrapperProps {
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  children: React.ReactNode;
}

export function SectionEditWrapper({ 
  onSave, 
  onCancel, 
  saving,
  children 
}: SectionEditWrapperProps) {
  const { locale } = useLocale();
  
  return (
    <div className="space-y-4 p-3 bg-white rounded-lg border-2 border-primary/20">
      {children}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={saving}
        >
          <XCircle className="h-4 w-4 mr-1" />
          {locale === 'pt' ? 'Cancelar' : 'Cancel'}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={saving}
        >
          <Save className="h-4 w-4 mr-1" />
          {saving 
            ? (locale === 'pt' ? 'A guardar...' : 'Saving...') 
            : (locale === 'pt' ? 'Guardar' : 'Save')}
        </Button>
      </div>
    </div>
  );
}
