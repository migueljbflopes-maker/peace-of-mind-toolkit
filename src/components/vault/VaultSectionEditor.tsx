/**
 * Vault Section Editor 2.0 - Expanded forms for IDs, Contacts, Medical
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2, Save, User, Star, Phone, Heart } from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { VaultSection } from '@/hooks/useVaultSync';
import { toast } from 'sonner';
import { 
  IdsDataV2, 
  ContactsDataV2, 
  MedicalDataV2,
  FinanceDataV2,
  DevicesDataV2,
  VaultSectionDataV2,
  HouseholdMember,
  EmergencyContact,
  Medication,
  DEFAULT_IDS_DATA,
  DEFAULT_CONTACTS_DATA,
  DEFAULT_MEDICAL_DATA,
  DEFAULT_FINANCE_DATA,
  DEFAULT_DEVICES_DATA,
  DEFAULT_SERVICE_CONTACT,
  DEFAULT_INSURANCE_INFO,
  generateId,
  isV2Data
} from './types';

// Legacy types for migration
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

export type VaultSectionData = IdsData | ContactsData | MedicalData | FinanceData | DevicesData | VaultSectionDataV2;

// Migration functions
function migrateIdsData(data: IdsData | IdsDataV2): IdsDataV2 {
  if (isV2Data(data)) return data as IdsDataV2;
  const legacy = data as IdsData;
  return {
    ...DEFAULT_IDS_DATA,
    fullName: legacy.fullName || '',
    dob: legacy.dob || '',
    nationalId: legacy.nationalId || '',
    address: legacy.address || '',
    notes: legacy.notes || '',
    copiesMade: legacy.copiesMade || false,
    storedInOnePlace: legacy.storedInOnePlace || false,
  };
}

function migrateContactsData(data: ContactsData | ContactsDataV2): ContactsDataV2 {
  if (isV2Data(data)) return data as ContactsDataV2;
  const legacy = data as ContactsData;
  return {
    ...DEFAULT_CONTACTS_DATA,
    emergencyContacts: (legacy.contacts || []).map((c, i) => ({
      id: generateId(),
      name: c.name,
      relationship: c.relationship,
      phone: c.phone,
      secondaryPhone: '',
      email: c.email,
      address: '',
      hasKeyToHome: false,
      isICE: i === 0,
    })),
    familyDoctor: { ...DEFAULT_SERVICE_CONTACT, name: legacy.doctor || '' },
    vet: { ...DEFAULT_SERVICE_CONTACT, name: legacy.vet || '' },
    healthInsurance: { ...DEFAULT_INSURANCE_INFO, provider: legacy.insurance || '' },
  };
}

function migrateMedicalData(data: MedicalData | MedicalDataV2): MedicalDataV2 {
  if (isV2Data(data)) return data as MedicalDataV2;
  const legacy = data as MedicalData;
  return {
    ...DEFAULT_MEDICAL_DATA,
    allergies: legacy.allergies || '',
    chronicConditions: legacy.conditions || '',
    emergencyNotes: legacy.emergencyNotes || '',
    // Parse legacy medications string into structured data
    currentMedications: legacy.medications ? [{
      id: generateId(),
      name: legacy.medications,
      dosage: '',
      frequency: '',
      prescriber: '',
      forMember: 'self',
    }] : [],
  };
}

function migrateFinanceData(data: FinanceData | FinanceDataV2): FinanceDataV2 {
  if (isV2Data(data)) return data as FinanceDataV2;
  const legacy = data as FinanceData;
  return {
    ...DEFAULT_FINANCE_DATA,
    banks: legacy.banks || '',
    policyNumbers: legacy.policyNumbers || '',
    emergencyCash: legacy.emergencyCash || '',
  };
}

function migrateDevicesData(data: DevicesData | DevicesDataV2): DevicesDataV2 {
  if (isV2Data(data)) return data as DevicesDataV2;
  const legacy = data as DevicesData;
  return {
    ...DEFAULT_DEVICES_DATA,
    phones: legacy.phones || '',
    accounts: legacy.accounts || '',
    recoveryNotes: legacy.recoveryNotes || '',
  };
}

const defaultData: Record<VaultSection, VaultSectionDataV2> = {
  ids: DEFAULT_IDS_DATA,
  contacts: DEFAULT_CONTACTS_DATA,
  medical: DEFAULT_MEDICAL_DATA,
  finance: DEFAULT_FINANCE_DATA,
  devices: DEFAULT_DEVICES_DATA,
};

interface VaultSectionEditorProps {
  section: VaultSection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: VaultSectionData | null;
  onSave: (section: VaultSection, data: VaultSectionData) => Promise<void>;
  isSaving: boolean;
}

export function VaultSectionEditor({ 
  section, 
  open, 
  onOpenChange, 
  initialData, 
  onSave,
  isSaving 
}: VaultSectionEditorProps) {
  const { t } = useLocale();
  const [data, setData] = useState<VaultSectionDataV2>(defaultData[section]);

  useEffect(() => {
    if (open) {
      // Migrate data if needed
      let migrated: VaultSectionDataV2;
      switch (section) {
        case 'ids':
          migrated = initialData ? migrateIdsData(initialData as IdsData | IdsDataV2) : DEFAULT_IDS_DATA;
          break;
        case 'contacts':
          migrated = initialData ? migrateContactsData(initialData as ContactsData | ContactsDataV2) : DEFAULT_CONTACTS_DATA;
          break;
        case 'medical':
          migrated = initialData ? migrateMedicalData(initialData as MedicalData | MedicalDataV2) : DEFAULT_MEDICAL_DATA;
          break;
        case 'finance':
          migrated = initialData ? migrateFinanceData(initialData as FinanceData | FinanceDataV2) : DEFAULT_FINANCE_DATA;
          break;
        case 'devices':
          migrated = initialData ? migrateDevicesData(initialData as DevicesData | DevicesDataV2) : DEFAULT_DEVICES_DATA;
          break;
        default:
          migrated = defaultData[section];
      }
      setData(migrated);
    }
  }, [open, initialData, section]);

  const handleSave = async () => {
    try {
      await onSave(section, data);
      onOpenChange(false);
    } catch {
      toast.error('Falha ao guardar');
    }
  };

  const updateField = (field: string, value: unknown) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  // === IDS FORM (Expanded) ===
  const renderIdsForm = () => {
    const idsData = data as IdsDataV2;
    
    const addHouseholdMember = () => {
      const newMember: HouseholdMember = {
        id: generateId(),
        name: '',
        relationship: 'other',
        dob: '',
        bloodType: '',
        nationalId: '',
        passportNumber: '',
        specialNeeds: '',
      };
      setData({ ...idsData, householdMembers: [...idsData.householdMembers, newMember] });
    };

    const updateMember = (id: string, field: keyof HouseholdMember, value: string) => {
      setData({
        ...idsData,
        householdMembers: idsData.householdMembers.map(m => 
          m.id === id ? { ...m, [field]: value } : m
        ),
      });
    };

    const removeMember = (id: string) => {
      setData({
        ...idsData,
        householdMembers: idsData.householdMembers.filter(m => m.id !== id),
      });
    };

    return (
      <div className="space-y-6">
        {/* Primary Person */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <User className="h-4 w-4" />
            Titular Principal
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input id="fullName" value={idsData.fullName} onChange={(e) => updateField('fullName', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dob">Data de Nascimento</Label>
              <Input id="dob" type="date" value={idsData.dob} onChange={(e) => updateField('dob', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="nationality">Nacionalidade</Label>
              <Input id="nationality" value={idsData.nationality} onChange={(e) => updateField('nationality', e.target.value)} placeholder="ex: Portuguesa" />
            </div>
          </div>
        </div>

        {/* Documents */}
        <Accordion type="single" collapsible defaultValue="documents">
          <AccordionItem value="documents">
            <AccordionTrigger className="text-sm font-medium">Documentos de Identificação</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="nationalId">Cartão de Cidadão / BI</Label>
                  <Input id="nationalId" value={idsData.nationalId} onChange={(e) => updateField('nationalId', e.target.value)} placeholder="ex: 12345678" />
                </div>
                <div>
                  <Label htmlFor="nationalIdExpiry">Validade CC</Label>
                  <Input id="nationalIdExpiry" type="date" value={idsData.nationalIdExpiry} onChange={(e) => updateField('nationalIdExpiry', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="passportNumber">Passaporte</Label>
                  <Input id="passportNumber" value={idsData.passportNumber} onChange={(e) => updateField('passportNumber', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="passportExpiry">Validade Passaporte</Label>
                  <Input id="passportExpiry" type="date" value={idsData.passportExpiry} onChange={(e) => updateField('passportExpiry', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="drivingLicense">Carta de Condução</Label>
                  <Input id="drivingLicense" value={idsData.drivingLicense} onChange={(e) => updateField('drivingLicense', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="drivingLicenseExpiry">Validade Carta</Label>
                  <Input id="drivingLicenseExpiry" type="date" value={idsData.drivingLicenseExpiry} onChange={(e) => updateField('drivingLicenseExpiry', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="taxId">NIF</Label>
                  <Input id="taxId" value={idsData.taxId} onChange={(e) => updateField('taxId', e.target.value)} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Address */}
        <div>
          <Label htmlFor="address">Morada</Label>
          <Textarea id="address" value={idsData.address} onChange={(e) => updateField('address', e.target.value)} rows={2} placeholder="Morada completa" />
        </div>

        {/* Household Members */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Membros do Agregado
            </Label>
            <Button variant="outline" size="sm" onClick={addHouseholdMember} className="gap-1">
              <Plus className="h-3 w-3" /> Adicionar
            </Button>
          </div>
          
          {idsData.householdMembers.map((member) => (
            <div key={member.id} className="p-3 border rounded-lg space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{member.name || 'Novo membro'}</span>
                <Button variant="ghost" size="sm" onClick={() => removeMember(member.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Nome" value={member.name} onChange={(e) => updateMember(member.id, 'name', e.target.value)} />
                <Select value={member.relationship} onValueChange={(v) => updateMember(member.id, 'relationship', v)}>
                  <SelectTrigger><SelectValue placeholder="Relação" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partner">Cônjuge/Parceiro(a)</SelectItem>
                    <SelectItem value="child">Filho(a)</SelectItem>
                    <SelectItem value="parent">Pai/Mãe</SelectItem>
                    <SelectItem value="sibling">Irmão/Irmã</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="date" placeholder="Data nascimento" value={member.dob} onChange={(e) => updateMember(member.id, 'dob', e.target.value)} />
                <Input placeholder="Grupo sanguíneo" value={member.bloodType} onChange={(e) => updateMember(member.id, 'bloodType', e.target.value)} />
                <Input placeholder="Nº documento" value={member.nationalId} onChange={(e) => updateMember(member.id, 'nationalId', e.target.value)} />
                <Input placeholder="Necessidades especiais" value={member.specialNeeds} onChange={(e) => updateMember(member.id, 'specialNeeds', e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        {/* Checklist */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Checkbox id="copiesMade" checked={idsData.copiesMade} onCheckedChange={(checked) => updateField('copiesMade', checked)} />
            <Label htmlFor="copiesMade" className="text-sm">Cópias dos documentos feitas</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="storedInOnePlace" checked={idsData.storedInOnePlace} onCheckedChange={(checked) => updateField('storedInOnePlace', checked)} />
            <Label htmlFor="storedInOnePlace" className="text-sm">Documentos guardados num só local</Label>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notas</Label>
          <Textarea id="notes" value={idsData.notes} onChange={(e) => updateField('notes', e.target.value)} rows={2} placeholder="Notas adicionais..." />
        </div>
      </div>
    );
  };

  // === CONTACTS FORM (Expanded) ===
  const renderContactsForm = () => {
    const contactsData = data as ContactsDataV2;
    
    const addEmergencyContact = () => {
      const newContact: EmergencyContact = {
        id: generateId(),
        name: '',
        relationship: '',
        phone: '',
        secondaryPhone: '',
        email: '',
        address: '',
        hasKeyToHome: false,
        isICE: contactsData.emergencyContacts.length === 0,
      };
      setData({ ...contactsData, emergencyContacts: [...contactsData.emergencyContacts, newContact] });
    };

    const updateContact = (id: string, field: keyof EmergencyContact, value: unknown) => {
      setData({
        ...contactsData,
        emergencyContacts: contactsData.emergencyContacts.map(c => 
          c.id === id ? { ...c, [field]: value } : c
        ),
      });
    };

    const removeContact = (id: string) => {
      setData({
        ...contactsData,
        emergencyContacts: contactsData.emergencyContacts.filter(c => c.id !== id),
      });
    };

    const updateService = (service: 'familyDoctor' | 'pediatrician' | 'dentist' | 'vet', field: string, value: string) => {
      setData({
        ...contactsData,
        [service]: { ...contactsData[service], [field]: value },
      });
    };

    const updateInsurance = (type: 'healthInsurance' | 'homeInsurance' | 'carInsurance' | 'lifeInsurance', field: string, value: string) => {
      setData({
        ...contactsData,
        [type]: { ...contactsData[type], [field]: value },
      });
    };

    return (
      <div className="space-y-6">
        {/* Emergency Contacts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-primary">
              <Phone className="h-4 w-4" />
              Contactos de Emergência
            </Label>
            <Button variant="outline" size="sm" onClick={addEmergencyContact} className="gap-1">
              <Plus className="h-3 w-3" /> Adicionar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Ordena por prioridade - o primeiro é o contacto principal (ICE)</p>
          
          {contactsData.emergencyContacts.map((contact, index) => (
            <div key={contact.id} className="p-3 border rounded-lg space-y-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {contact.isICE && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                  <span className="text-sm font-medium">{contact.name || `Contacto ${index + 1}`}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeContact(contact.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Nome" value={contact.name} onChange={(e) => updateContact(contact.id, 'name', e.target.value)} />
                <Input placeholder="Relação (ex: Irmã)" value={contact.relationship} onChange={(e) => updateContact(contact.id, 'relationship', e.target.value)} />
                <Input placeholder="Telefone principal" value={contact.phone} onChange={(e) => updateContact(contact.id, 'phone', e.target.value)} />
                <Input placeholder="Telefone secundário" value={contact.secondaryPhone} onChange={(e) => updateContact(contact.id, 'secondaryPhone', e.target.value)} />
                <Input placeholder="Email" type="email" value={contact.email} onChange={(e) => updateContact(contact.id, 'email', e.target.value)} />
                <div className="flex items-center gap-2">
                  <Checkbox id={`hasKey-${contact.id}`} checked={contact.hasKeyToHome} onCheckedChange={(checked) => updateContact(contact.id, 'hasKeyToHome', checked)} />
                  <Label htmlFor={`hasKey-${contact.id}`} className="text-xs">Tem chave de casa</Label>
                </div>
              </div>
              <Input placeholder="Morada" value={contact.address} onChange={(e) => updateContact(contact.id, 'address', e.target.value)} />
            </div>
          ))}
        </div>

        {/* Services */}
        <Accordion type="single" collapsible>
          <AccordionItem value="services">
            <AccordionTrigger className="text-sm font-medium">Serviços Importantes</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {(['familyDoctor', 'pediatrician', 'dentist', 'vet'] as const).map((service) => (
                <div key={service} className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 text-xs font-medium text-muted-foreground capitalize">
                    {service === 'familyDoctor' ? 'Médico de Família' : 
                     service === 'pediatrician' ? 'Pediatra' : 
                     service === 'dentist' ? 'Dentista' : 'Veterinário'}
                  </div>
                  <Input placeholder="Nome" value={contactsData[service].name} onChange={(e) => updateService(service, 'name', e.target.value)} />
                  <Input placeholder="Telefone" value={contactsData[service].phone} onChange={(e) => updateService(service, 'phone', e.target.value)} />
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="insurance">
            <AccordionTrigger className="text-sm font-medium">Seguros</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {(['healthInsurance', 'homeInsurance', 'carInsurance', 'lifeInsurance'] as const).map((type) => (
                <div key={type} className="grid grid-cols-2 gap-2">
                  <div className="col-span-2 text-xs font-medium text-muted-foreground">
                    {type === 'healthInsurance' ? 'Seguro de Saúde' : 
                     type === 'homeInsurance' ? 'Seguro Habitação' : 
                     type === 'carInsurance' ? 'Seguro Automóvel' : 'Seguro de Vida'}
                  </div>
                  <Input placeholder="Seguradora" value={contactsData[type].provider} onChange={(e) => updateInsurance(type, 'provider', e.target.value)} />
                  <Input placeholder="Nº Apólice" value={contactsData[type].policyNumber} onChange={(e) => updateInsurance(type, 'policyNumber', e.target.value)} />
                  <Input placeholder="Telefone" value={contactsData[type].phone} onChange={(e) => updateInsurance(type, 'phone', e.target.value)} />
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Other contacts */}
        <div className="space-y-3 pt-2 border-t">
          <Label className="text-sm font-medium">Outros Contactos</Label>
          <div className="grid grid-cols-1 gap-2">
            <Input placeholder="Advogado" value={contactsData.lawyer} onChange={(e) => updateField('lawyer', e.target.value)} />
            <Input placeholder="Contabilista" value={contactsData.accountant} onChange={(e) => updateField('accountant', e.target.value)} />
            <Input placeholder="Empregador / RH" value={contactsData.employer} onChange={(e) => updateField('employer', e.target.value)} />
          </div>
        </div>
      </div>
    );
  };

  // === MEDICAL FORM (Expanded) ===
  const renderMedicalForm = () => {
    const medicalData = data as MedicalDataV2;
    
    const addMedication = () => {
      const newMed: Medication = {
        id: generateId(),
        name: '',
        dosage: '',
        frequency: '',
        prescriber: '',
        forMember: 'self',
      };
      setData({ ...medicalData, currentMedications: [...medicalData.currentMedications, newMed] });
    };

    const updateMedication = (id: string, field: keyof Medication, value: string) => {
      setData({
        ...medicalData,
        currentMedications: medicalData.currentMedications.map(m => 
          m.id === id ? { ...m, [field]: value } : m
        ),
      });
    };

    const removeMedication = (id: string) => {
      setData({
        ...medicalData,
        currentMedications: medicalData.currentMedications.filter(m => m.id !== id),
      });
    };

    return (
      <div className="space-y-6">
        {/* Critical Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Heart className="h-4 w-4" />
            Informação Crítica
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bloodType">Grupo Sanguíneo</Label>
              <Select value={medicalData.bloodType} onValueChange={(v) => updateField('bloodType', v)}>
                <SelectTrigger id="bloodType"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="donorStatus">Doador de Órgãos</Label>
              <Select value={medicalData.donorStatus} onValueChange={(v) => updateField('donorStatus', v)}>
                <SelectTrigger id="donorStatus"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Sim</SelectItem>
                  <SelectItem value="no">Não</SelectItem>
                  <SelectItem value="unknown">Não definido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Allergies & Conditions */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="allergies">Alergias</Label>
            <Textarea id="allergies" value={medicalData.allergies} onChange={(e) => updateField('allergies', e.target.value)} rows={2} placeholder="ex: Penicilina, Frutos secos, Latex..." />
          </div>
          <div>
            <Label htmlFor="chronicConditions">Condições Crónicas</Label>
            <Textarea id="chronicConditions" value={medicalData.chronicConditions} onChange={(e) => updateField('chronicConditions', e.target.value)} rows={2} placeholder="ex: Diabetes Tipo 2, Asma, Hipertensão..." />
          </div>
        </div>

        {/* Medications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Medicação Atual</Label>
            <Button variant="outline" size="sm" onClick={addMedication} className="gap-1">
              <Plus className="h-3 w-3" /> Adicionar
            </Button>
          </div>
          
          {medicalData.currentMedications.map((med) => (
            <div key={med.id} className="p-3 border rounded-lg space-y-2 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{med.name || 'Novo medicamento'}</span>
                <Button variant="ghost" size="sm" onClick={() => removeMedication(med.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Nome do medicamento" value={med.name} onChange={(e) => updateMedication(med.id, 'name', e.target.value)} />
                <Input placeholder="Dosagem (ex: 500mg)" value={med.dosage} onChange={(e) => updateMedication(med.id, 'dosage', e.target.value)} />
                <Input placeholder="Frequência (ex: 2x/dia)" value={med.frequency} onChange={(e) => updateMedication(med.id, 'frequency', e.target.value)} />
                <Input placeholder="Para quem" value={med.forMember} onChange={(e) => updateMedication(med.id, 'forMember', e.target.value)} />
              </div>
            </div>
          ))}
        </div>

        {/* Additional medical info */}
        <Accordion type="single" collapsible>
          <AccordionItem value="additional">
            <AccordionTrigger className="text-sm font-medium">Informação Adicional</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div>
                <Label htmlFor="surgeries">Cirurgias / Internamentos</Label>
                <Textarea id="surgeries" value={medicalData.surgeries} onChange={(e) => updateField('surgeries', e.target.value)} rows={2} placeholder="Historial de cirurgias relevantes..." />
              </div>
              <div>
                <Label htmlFor="advanceDirectives">Diretivas Antecipadas de Vontade</Label>
                <Textarea id="advanceDirectives" value={medicalData.advanceDirectives} onChange={(e) => updateField('advanceDirectives', e.target.value)} rows={2} placeholder="Instruções para cuidados médicos..." />
              </div>
              <div>
                <Label htmlFor="powerOfAttorney">Procuração de Saúde</Label>
                <Input id="powerOfAttorney" value={medicalData.powerOfAttorney} onChange={(e) => updateField('powerOfAttorney', e.target.value)} placeholder="Nome da pessoa designada" />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Emergency Notes */}
        <div>
          <Label htmlFor="emergencyNotes">Notas de Emergência</Label>
          <Textarea id="emergencyNotes" value={medicalData.emergencyNotes} onChange={(e) => updateField('emergencyNotes', e.target.value)} rows={3} placeholder="Instruções especiais para emergências médicas..." />
        </div>
      </div>
    );
  };

  // === FINANCE FORM ===
  const renderFinanceForm = () => {
    const financeData = data as FinanceDataV2;
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="banks">{t.vault.forms.finance.banks}</Label>
          <Textarea id="banks" value={financeData.banks} onChange={(e) => updateField('banks', e.target.value)} rows={2} placeholder="ex: Millennium BCP, CGD..." />
        </div>
        <div>
          <Label htmlFor="policyNumbers">{t.vault.forms.finance.policyNumbers}</Label>
          <Textarea id="policyNumbers" value={financeData.policyNumbers} onChange={(e) => updateField('policyNumbers', e.target.value)} rows={2} placeholder="ex: Seguro vida: POL-123..." />
        </div>
        <div>
          <Label htmlFor="emergencyCash">{t.vault.forms.finance.emergencyCash}</Label>
          <Textarea id="emergencyCash" value={financeData.emergencyCash} onChange={(e) => updateField('emergencyCash', e.target.value)} rows={2} placeholder="ex: Cofre no quarto..." />
        </div>
        <p className="text-xs text-muted-foreground">{t.vault.forms.finance.noCredentials}</p>
      </div>
    );
  };

  // === DEVICES FORM ===
  const renderDevicesForm = () => {
    const devicesData = data as DevicesDataV2;
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="phones">{t.vault.forms.devices.phones}</Label>
          <Textarea id="phones" value={devicesData.phones} onChange={(e) => updateField('phones', e.target.value)} rows={2} placeholder="ex: iPhone 15, MacBook Pro..." />
        </div>
        <div>
          <Label htmlFor="accounts">{t.vault.forms.devices.accounts}</Label>
          <Textarea id="accounts" value={devicesData.accounts} onChange={(e) => updateField('accounts', e.target.value)} rows={2} placeholder="ex: Google, iCloud, Dropbox..." />
        </div>
        <div>
          <Label htmlFor="recoveryNotes">{t.vault.forms.devices.recoveryNotes}</Label>
          <Textarea id="recoveryNotes" value={devicesData.recoveryNotes} onChange={(e) => updateField('recoveryNotes', e.target.value)} rows={2} placeholder="ex: Códigos de recuperação no cofre..." />
        </div>
        <p className="text-xs text-muted-foreground">{t.vault.forms.devices.noPasswords}</p>
      </div>
    );
  };

  const renderForm = () => {
    switch (section) {
      case 'ids': return renderIdsForm();
      case 'contacts': return renderContactsForm();
      case 'medical': return renderMedicalForm();
      case 'finance': return renderFinanceForm();
      case 'devices': return renderDevicesForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.vault.sections[section]}</DialogTitle>
        </DialogHeader>

        {renderForm()}

        <div className="flex gap-2 pt-4 sticky bottom-0 bg-background">
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
