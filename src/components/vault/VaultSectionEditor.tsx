/**
 * Vault Section Editor - Generic form for editing vault sections
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Save } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { VaultSection } from '@/hooks/useVaultSync';
import { toast } from 'sonner';

// Section data types
export interface IdsData {
  fullName: string;
  dob: string;
  nationalId: string;
  address: string;
  notes: string;
  copiesMade: boolean;
  storedInOnePlace: boolean;
}

export interface Contact {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

export interface ContactsData {
  contacts: Contact[];
  doctor: string;
  vet: string;
  insurance: string;
}

export interface MedicalData {
  allergies: string;
  medications: string;
  conditions: string;
  emergencyNotes: string;
}

export interface FinanceData {
  banks: string;
  policyNumbers: string;
  emergencyCash: string;
}

export interface DevicesData {
  phones: string;
  accounts: string;
  recoveryNotes: string;
}

export type VaultSectionData = IdsData | ContactsData | MedicalData | FinanceData | DevicesData;

interface VaultSectionEditorProps {
  section: VaultSection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: VaultSectionData | null;
  onSave: (section: VaultSection, data: VaultSectionData) => Promise<void>;
  isSaving: boolean;
}

const defaultData: Record<VaultSection, VaultSectionData> = {
  ids: {
    fullName: '',
    dob: '',
    nationalId: '',
    address: '',
    notes: '',
    copiesMade: false,
    storedInOnePlace: false,
  },
  contacts: {
    contacts: [],
    doctor: '',
    vet: '',
    insurance: '',
  },
  medical: {
    allergies: '',
    medications: '',
    conditions: '',
    emergencyNotes: '',
  },
  finance: {
    banks: '',
    policyNumbers: '',
    emergencyCash: '',
  },
  devices: {
    phones: '',
    accounts: '',
    recoveryNotes: '',
  },
};

export function VaultSectionEditor({ 
  section, 
  open, 
  onOpenChange, 
  initialData, 
  onSave,
  isSaving 
}: VaultSectionEditorProps) {
  const { t } = useLocale();
  const [data, setData] = useState<VaultSectionData>(initialData || defaultData[section]);

  useEffect(() => {
    if (open) {
      setData(initialData || defaultData[section]);
    }
  }, [open, initialData, section]);

  const handleSave = async () => {
    try {
      await onSave(section, data);
      onOpenChange(false);
    } catch {
      toast.error('Failed to save');
    }
  };

  const updateField = (field: string, value: unknown) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const renderIdsForm = () => {
    const idsData = data as IdsData;
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="fullName">{t.vault.forms.ids.fullName}</Label>
          <Input
            id="fullName"
            value={idsData.fullName}
            onChange={(e) => updateField('fullName', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="dob">{t.vault.forms.ids.dob}</Label>
          <Input
            id="dob"
            type="date"
            value={idsData.dob}
            onChange={(e) => updateField('dob', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="nationalId">{t.vault.forms.ids.nationalId}</Label>
          <Input
            id="nationalId"
            value={idsData.nationalId}
            onChange={(e) => updateField('nationalId', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="address">{t.vault.forms.ids.address}</Label>
          <Textarea
            id="address"
            value={idsData.address}
            onChange={(e) => updateField('address', e.target.value)}
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="notes">{t.vault.forms.ids.notes}</Label>
          <Textarea
            id="notes"
            value={idsData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="copiesMade"
              checked={idsData.copiesMade}
              onCheckedChange={(checked) => updateField('copiesMade', checked)}
            />
            <Label htmlFor="copiesMade" className="text-sm">{t.vault.forms.ids.copiesMade}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="storedInOnePlace"
              checked={idsData.storedInOnePlace}
              onCheckedChange={(checked) => updateField('storedInOnePlace', checked)}
            />
            <Label htmlFor="storedInOnePlace" className="text-sm">{t.vault.forms.ids.storedInOnePlace}</Label>
          </div>
        </div>
      </div>
    );
  };

  const renderContactsForm = () => {
    const contactsData = data as ContactsData;
    
    const addContact = () => {
      setData({
        ...contactsData,
        contacts: [...contactsData.contacts, { name: '', relationship: '', phone: '', email: '' }],
      });
    };

    const removeContact = (index: number) => {
      setData({
        ...contactsData,
        contacts: contactsData.contacts.filter((_, i) => i !== index),
      });
    };

    const updateContact = (index: number, field: keyof Contact, value: string) => {
      const newContacts = [...contactsData.contacts];
      newContacts[index] = { ...newContacts[index], [field]: value };
      setData({ ...contactsData, contacts: newContacts });
    };

    return (
      <div className="space-y-4">
        <div className="space-y-3">
          {contactsData.contacts.map((contact, index) => (
            <div key={index} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Contact {index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeContact(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder={t.vault.forms.contacts.name}
                  value={contact.name}
                  onChange={(e) => updateContact(index, 'name', e.target.value)}
                />
                <Input
                  placeholder={t.vault.forms.contacts.relationship}
                  value={contact.relationship}
                  onChange={(e) => updateContact(index, 'relationship', e.target.value)}
                />
                <Input
                  placeholder={t.vault.forms.contacts.phone}
                  value={contact.phone}
                  onChange={(e) => updateContact(index, 'phone', e.target.value)}
                />
                <Input
                  placeholder={t.vault.forms.contacts.email}
                  type="email"
                  value={contact.email}
                  onChange={(e) => updateContact(index, 'email', e.target.value)}
                />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addContact} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            {t.vault.forms.contacts.addContact}
          </Button>
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">{t.vault.forms.contacts.importantServices}</h4>
          <div className="space-y-2">
            <div>
              <Label htmlFor="doctor">{t.vault.forms.contacts.doctor}</Label>
              <Input
                id="doctor"
                value={contactsData.doctor}
                onChange={(e) => updateField('doctor', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="vet">{t.vault.forms.contacts.vet}</Label>
              <Input
                id="vet"
                value={contactsData.vet}
                onChange={(e) => updateField('vet', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="insurance">{t.vault.forms.contacts.insurance}</Label>
              <Input
                id="insurance"
                value={contactsData.insurance}
                onChange={(e) => updateField('insurance', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMedicalForm = () => {
    const medicalData = data as MedicalData;
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="allergies">{t.vault.forms.medical.allergies}</Label>
          <Textarea
            id="allergies"
            value={medicalData.allergies}
            onChange={(e) => updateField('allergies', e.target.value)}
            rows={2}
            placeholder="e.g., Penicillin, Nuts..."
          />
        </div>
        <div>
          <Label htmlFor="medications">{t.vault.forms.medical.medications}</Label>
          <Textarea
            id="medications"
            value={medicalData.medications}
            onChange={(e) => updateField('medications', e.target.value)}
            rows={2}
            placeholder="e.g., Metformin 500mg daily..."
          />
        </div>
        <div>
          <Label htmlFor="conditions">{t.vault.forms.medical.conditions}</Label>
          <Textarea
            id="conditions"
            value={medicalData.conditions}
            onChange={(e) => updateField('conditions', e.target.value)}
            rows={2}
            placeholder="e.g., Diabetes Type 2, Asthma..."
          />
        </div>
        <div>
          <Label htmlFor="emergencyNotes">{t.vault.forms.medical.emergencyNotes}</Label>
          <Textarea
            id="emergencyNotes"
            value={medicalData.emergencyNotes}
            onChange={(e) => updateField('emergencyNotes', e.target.value)}
            rows={3}
            placeholder="Any special instructions for emergencies..."
          />
        </div>
      </div>
    );
  };

  const renderFinanceForm = () => {
    const financeData = data as FinanceData;
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="banks">{t.vault.forms.finance.banks}</Label>
          <Textarea
            id="banks"
            value={financeData.banks}
            onChange={(e) => updateField('banks', e.target.value)}
            rows={2}
            placeholder="e.g., Bank A, Bank B..."
          />
        </div>
        <div>
          <Label htmlFor="policyNumbers">{t.vault.forms.finance.policyNumbers}</Label>
          <Textarea
            id="policyNumbers"
            value={financeData.policyNumbers}
            onChange={(e) => updateField('policyNumbers', e.target.value)}
            rows={2}
            placeholder="e.g., Life insurance: POL-123..."
          />
        </div>
        <div>
          <Label htmlFor="emergencyCash">{t.vault.forms.finance.emergencyCash}</Label>
          <Textarea
            id="emergencyCash"
            value={financeData.emergencyCash}
            onChange={(e) => updateField('emergencyCash', e.target.value)}
            rows={2}
            placeholder="e.g., Safe in bedroom closet..."
          />
        </div>
        <p className="text-xs text-muted-foreground">{t.vault.forms.finance.noCredentials}</p>
      </div>
    );
  };

  const renderDevicesForm = () => {
    const devicesData = data as DevicesData;
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="phones">{t.vault.forms.devices.phones}</Label>
          <Textarea
            id="phones"
            value={devicesData.phones}
            onChange={(e) => updateField('phones', e.target.value)}
            rows={2}
            placeholder="e.g., iPhone 15, MacBook Pro..."
          />
        </div>
        <div>
          <Label htmlFor="accounts">{t.vault.forms.devices.accounts}</Label>
          <Textarea
            id="accounts"
            value={devicesData.accounts}
            onChange={(e) => updateField('accounts', e.target.value)}
            rows={2}
            placeholder="e.g., Google, iCloud, Dropbox..."
          />
        </div>
        <div>
          <Label htmlFor="recoveryNotes">{t.vault.forms.devices.recoveryNotes}</Label>
          <Textarea
            id="recoveryNotes"
            value={devicesData.recoveryNotes}
            onChange={(e) => updateField('recoveryNotes', e.target.value)}
            rows={2}
            placeholder="e.g., Recovery codes in safe..."
          />
        </div>
        <p className="text-xs text-muted-foreground">{t.vault.forms.devices.noPasswords}</p>
      </div>
    );
  };

  const renderForm = () => {
    switch (section) {
      case 'ids':
        return renderIdsForm();
      case 'contacts':
        return renderContactsForm();
      case 'medical':
        return renderMedicalForm();
      case 'finance':
        return renderFinanceForm();
      case 'devices':
        return renderDevicesForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.vault.sections[section]}</DialogTitle>
        </DialogHeader>

        {renderForm()}

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            {t.common.cancel}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="flex-1 gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? t.common.loading : t.common.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
