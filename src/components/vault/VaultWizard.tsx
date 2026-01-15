/**
 * Vault Wizard - Step-by-step onboarding with Hero-style design
 * Updated with expanded data schema from Vault 2.0
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronRight, 
  ChevronLeft, 
  User, 
  Users, 
  Heart, 
  Wallet, 
  Smartphone,
  Plus,
  Trash2,
  Check,
  ShieldCheck,
  AlertTriangle,
  UserPlus
} from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { VaultSection, VAULT_SECTIONS } from '@/hooks/useVaultSync';
import { 
  IdsDataV2 as IdsDataExpanded, 
  ContactsDataV2 as ContactsDataExpanded, 
  MedicalDataV2 as MedicalDataExpanded,
  HouseholdMember,
  EmergencyContact,
  Medication,
  DEFAULT_IDS_DATA,
  DEFAULT_CONTACTS_DATA,
  DEFAULT_MEDICAL_DATA,
  generateId,
} from './types';
import { DataLossWarning } from './DataLossWarning';
import heroSplitBg from '@/assets/hero-split-bg.png';

// Helper functions to create empty items
const createEmptyHouseholdMember = (): HouseholdMember => ({
  id: generateId(),
  name: '',
  relationship: 'other',
  dob: '',
  bloodType: '',
  nationalId: '',
  passportNumber: '',
  specialNeeds: '',
});

const createEmptyEmergencyContact = (): EmergencyContact => ({
  id: generateId(),
  name: '',
  relationship: '',
  phone: '',
  secondaryPhone: '',
  email: '',
  address: '',
  hasKeyToHome: false,
  isICE: false,
});

const createEmptyMedication = (): Medication => ({
  id: generateId(),
  name: '',
  dosage: '',
  frequency: '',
  prescriber: '',
  forMember: 'self',
});

// Legacy types for backward compatibility
interface FinanceData {
  banks: string;
  policyNumbers: string;
  emergencyCash: string;
}

interface DevicesData {
  phones: string;
  accounts: string;
  recoveryNotes: string;
}

export type VaultSectionData = IdsDataExpanded | ContactsDataExpanded | MedicalDataExpanded | FinanceData | DevicesData;

interface VaultWizardProps {
  onSaveSection: (section: VaultSection, data: VaultSectionData) => Promise<void>;
  onComplete: () => void;
  isSaving: boolean;
}

const STEP_ICONS = {
  ids: User,
  contacts: Users,
  medical: Heart,
  finance: Wallet,
  devices: Smartphone,
};

const defaultData: Record<VaultSection, VaultSectionData> = {
  ids: { ...DEFAULT_IDS_DATA },
  contacts: { ...DEFAULT_CONTACTS_DATA },
  medical: { ...DEFAULT_MEDICAL_DATA },
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

export function VaultWizard({ onSaveSection, onComplete, isSaving }: VaultWizardProps) {
  const { t } = useLocale();
  const [currentStep, setCurrentStep] = useState(0);
  const [sectionData, setSectionData] = useState<Record<VaultSection, VaultSectionData>>(
    () => ({ ...defaultData })
  );
  const [savedSteps, setSavedSteps] = useState<Set<VaultSection>>(new Set());

  const currentSection = VAULT_SECTIONS[currentStep];
  const StepIcon = STEP_ICONS[currentSection];
  const progress = ((currentStep + 1) / VAULT_SECTIONS.length) * 100;

  const updateField = useCallback((field: string, value: unknown) => {
    setSectionData(prev => ({
      ...prev,
      [currentSection]: { ...prev[currentSection], [field]: value },
    }));
  }, [currentSection]);

  const handleSaveAndNext = async () => {
    const data = sectionData[currentSection];
    await onSaveSection(currentSection, data);
    setSavedSteps(prev => new Set([...prev, currentSection]));
    
    if (currentStep < VAULT_SECTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    if (currentStep < VAULT_SECTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ============ IDs Form (Expanded) ============
  const renderIdsForm = () => {
    const data = sectionData.ids as IdsDataExpanded;
    
    const addHouseholdMember = () => {
      setSectionData(prev => ({
        ...prev,
        ids: {
          ...prev.ids as IdsDataExpanded,
          householdMembers: [...(prev.ids as IdsDataExpanded).householdMembers, createEmptyHouseholdMember()],
        },
      }));
    };

    const removeHouseholdMember = (id: string) => {
      setSectionData(prev => ({
        ...prev,
        ids: {
          ...prev.ids as IdsDataExpanded,
          householdMembers: (prev.ids as IdsDataExpanded).householdMembers.filter(m => m.id !== id),
        },
      }));
    };

    const updateHouseholdMember = (id: string, field: keyof HouseholdMember, value: string) => {
      setSectionData(prev => ({
        ...prev,
        ids: {
          ...prev.ids as IdsDataExpanded,
          householdMembers: (prev.ids as IdsDataExpanded).householdMembers.map(m =>
            m.id === id ? { ...m, [field]: value } : m
          ),
        },
      }));
    };

    return (
      <div className="space-y-5">
        {/* Primary Person */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white/90 flex items-center gap-2">
            <User className="h-4 w-4" />
            Your Information
          </h4>
          
          <div>
            <Label htmlFor="fullName" className="text-white/80 text-sm">Full Name *</Label>
            <Input
              id="fullName"
              value={data.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              placeholder="e.g., João Manuel Silva"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="dob" className="text-white/80 text-sm">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={data.dob}
                onChange={(e) => updateField('dob', e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
            <div>
              <Label htmlFor="nationality" className="text-white/80 text-sm">Nationality</Label>
              <Input
                id="nationality"
                value={data.nationality}
                onChange={(e) => updateField('nationality', e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="e.g., Portuguese"
              />
            </div>
          </div>
        </div>

        {/* Identity Documents */}
        <div className="space-y-3 pt-3 border-t border-white/20">
          <h4 className="text-sm font-medium text-white/90">Identity Documents</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nationalId" className="text-white/80 text-sm">National ID / Citizen Card</Label>
              <Input
                id="nationalId"
                value={data.nationalId}
                onChange={(e) => updateField('nationalId', e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="12345678 9 ZZ9"
              />
            </div>
            <div>
              <Label htmlFor="nationalIdExpiry" className="text-white/80 text-sm">Expiry Date</Label>
              <Input
                id="nationalIdExpiry"
                type="date"
                value={data.nationalIdExpiry}
                onChange={(e) => updateField('nationalIdExpiry', e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="passportNumber" className="text-white/80 text-sm">Passport Number</Label>
              <Input
                id="passportNumber"
                value={data.passportNumber}
                onChange={(e) => updateField('passportNumber', e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="P123456789"
              />
            </div>
            <div>
              <Label htmlFor="passportExpiry" className="text-white/80 text-sm">Expiry Date</Label>
              <Input
                id="passportExpiry"
                type="date"
                value={data.passportExpiry}
                onChange={(e) => updateField('passportExpiry', e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="drivingLicense" className="text-white/80 text-sm">Driving License</Label>
              <Input
                id="drivingLicense"
                value={data.drivingLicense}
                onChange={(e) => updateField('drivingLicense', e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="P-1234567"
              />
            </div>
            <div>
              <Label htmlFor="taxId" className="text-white/80 text-sm">Tax ID (NIF)</Label>
              <Input
                id="taxId"
                value={data.taxId}
                onChange={(e) => updateField('taxId', e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="123456789"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="pt-3 border-t border-white/20">
          <Label htmlFor="address" className="text-white/80 text-sm">Home Address</Label>
          <Textarea
            id="address"
            value={data.address}
            onChange={(e) => updateField('address', e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            placeholder="Full address including postal code..."
            rows={2}
          />
        </div>

        {/* Household Members */}
        <div className="space-y-3 pt-3 border-t border-white/20">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white/90 flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Household Members
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={addHouseholdMember}
              className="h-8 gap-1 text-white/70 hover:text-white hover:bg-white/10"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          
          {data.householdMembers.length === 0 ? (
            <p className="text-sm text-white/50 italic">No household members added yet.</p>
          ) : (
            <div className="space-y-3">
              {data.householdMembers.map((member) => (
                <div key={member.id} className="p-3 bg-white/5 border border-white/20 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/90">{member.name || 'New Member'}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHouseholdMember(member.id)}
                      className="h-7 w-7 p-0 text-white/50 hover:text-white hover:bg-white/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Name"
                      value={member.name}
                      onChange={(e) => updateHouseholdMember(member.id, 'name', e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm"
                    />
                    <Select
                      value={member.relationship}
                      onValueChange={(value) => updateHouseholdMember(member.id, 'relationship', value)}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white text-sm">
                        <SelectValue placeholder="Relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="partner">Partner</SelectItem>
                        <SelectItem value="child">Child</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="sibling">Sibling</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      placeholder="Date of Birth"
                      value={member.dob}
                      onChange={(e) => updateHouseholdMember(member.id, 'dob', e.target.value)}
                      className="bg-white/10 border-white/20 text-white text-sm"
                    />
                    <Select
                      value={member.bloodType}
                      onValueChange={(value) => updateHouseholdMember(member.id, 'bloodType', value)}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white text-sm">
                        <SelectValue placeholder="Blood Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    placeholder="Special needs or notes"
                    value={member.specialNeeds}
                    onChange={(e) => updateHouseholdMember(member.id, 'specialNeeds', e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="space-y-2 pt-3 border-t border-white/20">
          <div className="flex items-center gap-2">
            <Checkbox
              id="copiesMade"
              checked={data.copiesMade}
              onCheckedChange={(checked) => updateField('copiesMade', checked)}
              className="border-white/50 data-[state=checked]:bg-primary"
            />
            <Label htmlFor="copiesMade" className="text-sm text-white/80">I have copies of all important documents</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="storedInOnePlace"
              checked={data.storedInOnePlace}
              onCheckedChange={(checked) => updateField('storedInOnePlace', checked)}
              className="border-white/50 data-[state=checked]:bg-primary"
            />
            <Label htmlFor="storedInOnePlace" className="text-sm text-white/80">Documents are stored in a safe location</Label>
          </div>
        </div>
      </div>
    );
  };

  // ============ Contacts Form (Expanded) ============
  const renderContactsForm = () => {
    const data = sectionData.contacts as ContactsDataExpanded;
    
    const addEmergencyContact = () => {
      setSectionData(prev => ({
        ...prev,
        contacts: {
          ...prev.contacts as ContactsDataExpanded,
          emergencyContacts: [...(prev.contacts as ContactsDataExpanded).emergencyContacts, createEmptyEmergencyContact()],
        },
      }));
    };

    const removeEmergencyContact = (id: string) => {
      setSectionData(prev => ({
        ...prev,
        contacts: {
          ...prev.contacts as ContactsDataExpanded,
          emergencyContacts: (prev.contacts as ContactsDataExpanded).emergencyContacts.filter(c => c.id !== id),
        },
      }));
    };

    const updateEmergencyContact = (id: string, field: keyof EmergencyContact, value: string | boolean) => {
      setSectionData(prev => ({
        ...prev,
        contacts: {
          ...prev.contacts as ContactsDataExpanded,
          emergencyContacts: (prev.contacts as ContactsDataExpanded).emergencyContacts.map(c =>
            c.id === id ? { ...c, [field]: value } : c
          ),
        },
      }));
    };

    return (
      <div className="space-y-5">
        {/* Emergency Contacts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white/90 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Emergency Contacts
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={addEmergencyContact}
              className="h-8 gap-1 text-white/70 hover:text-white hover:bg-white/10"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          
          <p className="text-xs text-white/60">People to contact in case of emergency. Order by priority (first = most important).</p>
          
          {data.emergencyContacts.length === 0 ? (
            <p className="text-sm text-white/50 italic">No emergency contacts added yet.</p>
          ) : (
            <div className="space-y-3">
              {data.emergencyContacts.map((contact, index) => (
                <div key={contact.id} className="p-3 bg-white/5 border border-white/20 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/90">
                      {contact.isICE && <span className="text-amber-400 mr-1">★</span>}
                      {contact.name || `Contact ${index + 1}`}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeEmergencyContact(contact.id)}
                      className="h-7 w-7 p-0 text-white/50 hover:text-white hover:bg-white/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Full name"
                      value={contact.name}
                      onChange={(e) => updateEmergencyContact(contact.id, 'name', e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm"
                    />
                    <Input
                      placeholder="Relationship"
                      value={contact.relationship}
                      onChange={(e) => updateEmergencyContact(contact.id, 'relationship', e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm"
                    />
                    <Input
                      placeholder="Phone"
                      value={contact.phone}
                      onChange={(e) => updateEmergencyContact(contact.id, 'phone', e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm"
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateEmergencyContact(contact.id, 'email', e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-4 pt-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`ice-${contact.id}`}
                        checked={contact.isICE}
                        onCheckedChange={(checked) => updateEmergencyContact(contact.id, 'isICE', !!checked)}
                        className="border-white/50 data-[state=checked]:bg-amber-500"
                      />
                      <Label htmlFor={`ice-${contact.id}`} className="text-xs text-white/70">Primary ICE contact</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`key-${contact.id}`}
                        checked={contact.hasKeyToHome}
                        onCheckedChange={(checked) => updateEmergencyContact(contact.id, 'hasKeyToHome', !!checked)}
                        className="border-white/50 data-[state=checked]:bg-primary"
                      />
                      <Label htmlFor={`key-${contact.id}`} className="text-xs text-white/70">Has key to home</Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Important Services - simplified to single string fields */}
        <div className="space-y-3 pt-3 border-t border-white/20">
          <h4 className="text-sm font-medium text-white/90">Important Services</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="familyDoctor" className="text-white/80 text-sm">Family Doctor</Label>
              <Input
                id="familyDoctor"
                value={data.familyDoctor?.name || ''}
                onChange={(e) => updateField('familyDoctor', { ...data.familyDoctor, name: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="Name and phone"
              />
            </div>
            <div>
              <Label htmlFor="pediatrician" className="text-white/80 text-sm">Pediatrician</Label>
              <Input
                id="pediatrician"
                value={data.pediatrician?.name || ''}
                onChange={(e) => updateField('pediatrician', { ...data.pediatrician, name: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="Name and phone"
              />
            </div>
            <div>
              <Label htmlFor="dentist" className="text-white/80 text-sm">Dentist</Label>
              <Input
                id="dentist"
                value={data.dentist?.name || ''}
                onChange={(e) => updateField('dentist', { ...data.dentist, name: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="Name and phone"
              />
            </div>
            <div>
              <Label htmlFor="vet" className="text-white/80 text-sm">Veterinarian</Label>
              <Input
                id="vet"
                value={data.vet?.name || ''}
                onChange={(e) => updateField('vet', { ...data.vet, name: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="Name and phone"
              />
            </div>
          </div>
        </div>

        {/* Insurance Info - simplified */}
        <div className="space-y-3 pt-3 border-t border-white/20">
          <h4 className="text-sm font-medium text-white/90">Insurance Information</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="healthInsurance" className="text-white/80 text-sm">Health Insurance</Label>
              <Input
                id="healthInsurance"
                value={data.healthInsurance?.policyNumber || ''}
                onChange={(e) => updateField('healthInsurance', { ...data.healthInsurance, policyNumber: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="Policy number & phone"
              />
            </div>
            <div>
              <Label htmlFor="homeInsurance" className="text-white/80 text-sm">Home Insurance</Label>
              <Input
                id="homeInsurance"
                value={data.homeInsurance?.policyNumber || ''}
                onChange={(e) => updateField('homeInsurance', { ...data.homeInsurance, policyNumber: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="Policy number & phone"
              />
            </div>
            <div>
              <Label htmlFor="carInsurance" className="text-white/80 text-sm">Car Insurance</Label>
              <Input
                id="carInsurance"
                value={data.carInsurance?.policyNumber || ''}
                onChange={(e) => updateField('carInsurance', { ...data.carInsurance, policyNumber: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="Policy number & phone"
              />
            </div>
            <div>
              <Label htmlFor="lifeInsurance" className="text-white/80 text-sm">Life Insurance</Label>
              <Input
                id="lifeInsurance"
                value={data.lifeInsurance?.policyNumber || ''}
                onChange={(e) => updateField('lifeInsurance', { ...data.lifeInsurance, policyNumber: e.target.value })}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="Policy number & phone"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============ Medical Form (Expanded) ============
  const renderMedicalForm = () => {
    const data = sectionData.medical as MedicalDataExpanded;
    
    const addMedication = () => {
      setSectionData(prev => ({
        ...prev,
        medical: {
          ...prev.medical as MedicalDataExpanded,
          currentMedications: [...(prev.medical as MedicalDataExpanded).currentMedications, createEmptyMedication()],
        },
      }));
    };

    const removeMedication = (id: string) => {
      setSectionData(prev => ({
        ...prev,
        medical: {
          ...prev.medical as MedicalDataExpanded,
          currentMedications: (prev.medical as MedicalDataExpanded).currentMedications.filter(m => m.id !== id),
        },
      }));
    };

    const updateMedication = (id: string, field: keyof Medication, value: string) => {
      setSectionData(prev => ({
        ...prev,
        medical: {
          ...prev.medical as MedicalDataExpanded,
          currentMedications: (prev.medical as MedicalDataExpanded).currentMedications.map(m =>
            m.id === id ? { ...m, [field]: value } : m
          ),
        },
      }));
    };

    return (
      <div className="space-y-5">
        {/* Basic Medical Info */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white/90">Critical Medical Information</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bloodType" className="text-white/80 text-sm">Blood Type</Label>
              <Select
                value={data.bloodType}
                onValueChange={(value) => updateField('bloodType', value)}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select blood type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="donorStatus" className="text-white/80 text-sm">Organ Donor</Label>
              <Select
                value={data.donorStatus}
                onValueChange={(value) => updateField('donorStatus', value)}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Donor status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes, registered donor</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="allergies" className="text-white/80 text-sm">Allergies ⚠️</Label>
            <Textarea
              id="allergies"
              value={data.allergies}
              onChange={(e) => updateField('allergies', e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              placeholder="e.g., Penicillin, Peanuts, Latex, Bee stings..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="chronicConditions" className="text-white/80 text-sm">Chronic Conditions</Label>
            <Textarea
              id="chronicConditions"
              value={data.chronicConditions}
              onChange={(e) => updateField('chronicConditions', e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              placeholder="e.g., Diabetes Type 2, Asthma, Hypertension..."
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="surgeries" className="text-white/80 text-sm">Past Surgeries</Label>
            <Textarea
              id="surgeries"
              value={data.surgeries}
              onChange={(e) => updateField('surgeries', e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              placeholder="e.g., Appendectomy 2015, Knee surgery 2020..."
              rows={2}
            />
          </div>
        </div>

        {/* Current Medications */}
        <div className="space-y-3 pt-3 border-t border-white/20">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white/90">Current Medications</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={addMedication}
              className="h-8 gap-1 text-white/70 hover:text-white hover:bg-white/10"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {data.currentMedications.length === 0 ? (
            <p className="text-sm text-white/50 italic">No medications listed.</p>
          ) : (
            <div className="space-y-2">
              {data.currentMedications.map((med) => (
                <div key={med.id} className="p-3 bg-white/5 border border-white/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-white/90">{med.name || 'New Medication'}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMedication(med.id)}
                      className="h-7 w-7 p-0 text-white/50 hover:text-white hover:bg-white/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      placeholder="Medication name"
                      value={med.name}
                      onChange={(e) => updateMedication(med.id, 'name', e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm"
                    />
                    <Input
                      placeholder="Dosage (e.g., 500mg)"
                      value={med.dosage}
                      onChange={(e) => updateMedication(med.id, 'dosage', e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm"
                    />
                    <Input
                      placeholder="Frequency (e.g., 2x daily)"
                      value={med.frequency}
                      onChange={(e) => updateMedication(med.id, 'frequency', e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legal / Advance Directives */}
        <div className="space-y-3 pt-3 border-t border-white/20">
          <h4 className="text-sm font-medium text-white/90">Legal & Advance Directives</h4>
          <div>
            <Label htmlFor="advanceDirectives" className="text-white/80 text-sm">Advance Directives / Living Will</Label>
            <Textarea
              id="advanceDirectives"
              value={data.advanceDirectives}
              onChange={(e) => updateField('advanceDirectives', e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              placeholder="Location of document, key wishes..."
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="powerOfAttorney" className="text-white/80 text-sm">Medical Power of Attorney</Label>
            <Input
              id="powerOfAttorney"
              value={data.powerOfAttorney}
              onChange={(e) => updateField('powerOfAttorney', e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              placeholder="Name and contact of designated person"
            />
          </div>
        </div>

        {/* Emergency Notes */}
        <div className="pt-3 border-t border-white/20">
          <Label htmlFor="emergencyNotes" className="text-white/80 text-sm">Emergency Notes</Label>
          <Textarea
            id="emergencyNotes"
            value={data.emergencyNotes}
            onChange={(e) => updateField('emergencyNotes', e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            placeholder="Any special instructions for first responders..."
            rows={2}
          />
        </div>
      </div>
    );
  };

  // ============ Finance Form (Legacy) ============
  const renderFinanceForm = () => {
    const data = sectionData.finance as FinanceData;
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="banks" className="text-white/90">{t.vault.forms.finance.banks}</Label>
          <Textarea
            id="banks"
            value={data.banks}
            onChange={(e) => updateField('banks', e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            placeholder="e.g., Bank name, account type..."
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="policyNumbers" className="text-white/90">{t.vault.forms.finance.policyNumbers}</Label>
          <Textarea
            id="policyNumbers"
            value={data.policyNumbers}
            onChange={(e) => updateField('policyNumbers', e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            placeholder="e.g., Life insurance: POL-123..."
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="emergencyCash" className="text-white/90">{t.vault.forms.finance.emergencyCash}</Label>
          <Textarea
            id="emergencyCash"
            value={data.emergencyCash}
            onChange={(e) => updateField('emergencyCash', e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            placeholder="e.g., Where you keep emergency cash..."
            rows={2}
          />
        </div>
        <p className="text-xs text-white/60">{t.vault.forms.finance.noCredentials}</p>
      </div>
    );
  };

  // ============ Devices Form (Legacy) ============
  const renderDevicesForm = () => {
    const data = sectionData.devices as DevicesData;
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="phones" className="text-white/90">{t.vault.forms.devices.phones}</Label>
          <Textarea
            id="phones"
            value={data.phones}
            onChange={(e) => updateField('phones', e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            placeholder="e.g., iPhone 15, MacBook Pro..."
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="accounts" className="text-white/90">{t.vault.forms.devices.accounts}</Label>
          <Textarea
            id="accounts"
            value={data.accounts}
            onChange={(e) => updateField('accounts', e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            placeholder="e.g., Google, iCloud, Dropbox..."
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="recoveryNotes" className="text-white/90">{t.vault.forms.devices.recoveryNotes}</Label>
          <Textarea
            id="recoveryNotes"
            value={data.recoveryNotes}
            onChange={(e) => updateField('recoveryNotes', e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            placeholder="e.g., Recovery codes in safe..."
            rows={2}
          />
        </div>
        <p className="text-xs text-white/60">{t.vault.forms.devices.noPasswords}</p>
      </div>
    );
  };

  const renderCurrentForm = () => {
    switch (currentSection) {
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
    <section 
      className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center bg-cover bg-center py-8"
      style={{ backgroundImage: `url(${heroSplitBg})` }}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-xl mx-auto px-4">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-white/70">
              Step {currentStep + 1} of {VAULT_SECTIONS.length}
            </span>
            <span className="text-sm text-white/70">
              {Math.round(progress)}% complete
            </span>
          </div>
          <Progress value={progress} className="h-2 bg-white/20" />
          
          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {VAULT_SECTIONS.map((section, index) => {
              const Icon = STEP_ICONS[section];
              const isActive = index === currentStep;
              const isCompleted = savedSteps.has(section);
              
              return (
                <div
                  key={section}
                  className={`flex flex-col items-center gap-1 transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted 
                      ? 'bg-green-500/80' 
                      : isActive 
                        ? 'bg-primary' 
                        : 'bg-white/20'
                  }`}>
                    {isCompleted ? (
                      <Check className="h-5 w-5 text-white" />
                    ) : (
                      <Icon className="h-5 w-5 text-white" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-full bg-primary/20 mb-3">
              <StepIcon className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t.vault.sections[currentSection]}
            </h2>
            <p className="text-white/70 text-sm">
              {t.vault.sectionDescriptions[currentSection]}
            </p>
          </div>

          {/* Form */}
          <div className="max-h-[45vh] overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-white/20">
            {renderCurrentForm()}
          </div>

          {/* Security note - show warning on first step */}
          {currentStep === 0 && (
            <div className="mt-4">
              <DataLossWarning variant="header" />
            </div>
          )}

          {/* Standard security note for other steps */}
          {currentStep > 0 && (
            <div className="flex items-start gap-2 mt-6 p-3 bg-white/5 rounded-lg border border-white/10">
              <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-white/70">
                {t.vault.setup.securityNote}
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {currentStep > 0 && (
              <Button
                variant="ghost"
                onClick={handleBack}
                className="gap-2 text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-white/70 hover:text-white hover:bg-white/10 ml-auto"
            >
              Skip
            </Button>
            
            <Button
              variant="cta"
              onClick={handleSaveAndNext}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? t.common.loading : currentStep === VAULT_SECTIONS.length - 1 ? 'Finish' : 'Save & Next'}
              {!isSaving && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
