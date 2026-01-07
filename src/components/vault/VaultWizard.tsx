/**
 * Vault Wizard - Step-by-step onboarding with Hero-style design
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
  ShieldCheck
} from 'lucide-react';
import { useLocale } from '@/i18n/useLocale';
import { VaultSection, VAULT_SECTIONS } from '@/hooks/useVaultSync';
import { 
  VaultSectionData, 
  IdsData, 
  ContactsData, 
  MedicalData, 
  FinanceData, 
  DevicesData,
  Contact 
} from './VaultSectionEditor';
import heroSplitBg from '@/assets/hero-split-bg.png';

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

  // Form renderers
  const renderIdsForm = () => {
    const data = sectionData.ids as IdsData;
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="fullName" className="text-white/90">{t.vault.forms.ids.fullName}</Label>
          <Input
            id="fullName"
            value={data.fullName}
            onChange={(e) => updateField('fullName', e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            placeholder="e.g., João Silva"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dob" className="text-white/90">{t.vault.forms.ids.dob}</Label>
            <Input
              id="dob"
              type="date"
              value={data.dob}
              onChange={(e) => updateField('dob', e.target.value)}
              className="bg-white/10 border-white/20 text-white"
            />
          </div>
          <div>
            <Label htmlFor="nationalId" className="text-white/90">{t.vault.forms.ids.nationalId}</Label>
            <Input
              id="nationalId"
              value={data.nationalId}
              onChange={(e) => updateField('nationalId', e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              placeholder="e.g., 12345678"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="address" className="text-white/90">{t.vault.forms.ids.address}</Label>
          <Textarea
            id="address"
            value={data.address}
            onChange={(e) => updateField('address', e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            placeholder="Your home address..."
            rows={2}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="copiesMade"
              checked={data.copiesMade}
              onCheckedChange={(checked) => updateField('copiesMade', checked)}
              className="border-white/50 data-[state=checked]:bg-primary"
            />
            <Label htmlFor="copiesMade" className="text-sm text-white/80">{t.vault.forms.ids.copiesMade}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="storedInOnePlace"
              checked={data.storedInOnePlace}
              onCheckedChange={(checked) => updateField('storedInOnePlace', checked)}
              className="border-white/50 data-[state=checked]:bg-primary"
            />
            <Label htmlFor="storedInOnePlace" className="text-sm text-white/80">{t.vault.forms.ids.storedInOnePlace}</Label>
          </div>
        </div>
      </div>
    );
  };

  const renderContactsForm = () => {
    const data = sectionData.contacts as ContactsData;
    
    const addContact = () => {
      setSectionData(prev => ({
        ...prev,
        contacts: {
          ...prev.contacts as ContactsData,
          contacts: [...(prev.contacts as ContactsData).contacts, { name: '', relationship: '', phone: '', email: '' }],
        },
      }));
    };

    const removeContact = (index: number) => {
      setSectionData(prev => ({
        ...prev,
        contacts: {
          ...prev.contacts as ContactsData,
          contacts: (prev.contacts as ContactsData).contacts.filter((_, i) => i !== index),
        },
      }));
    };

    const updateContact = (index: number, field: keyof Contact, value: string) => {
      const newContacts = [...data.contacts];
      newContacts[index] = { ...newContacts[index], [field]: value };
      setSectionData(prev => ({
        ...prev,
        contacts: { ...prev.contacts as ContactsData, contacts: newContacts },
      }));
    };

    return (
      <div className="space-y-4">
        <div className="space-y-3">
          {data.contacts.map((contact, index) => (
            <div key={index} className="p-3 bg-white/10 border border-white/20 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/90">Contact {index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeContact(index)}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder={t.vault.forms.contacts.name}
                  value={contact.name}
                  onChange={(e) => updateContact(index, 'name', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
                <Input
                  placeholder={t.vault.forms.contacts.relationship}
                  value={contact.relationship}
                  onChange={(e) => updateContact(index, 'relationship', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
                <Input
                  placeholder={t.vault.forms.contacts.phone}
                  value={contact.phone}
                  onChange={(e) => updateContact(index, 'phone', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
                <Input
                  placeholder={t.vault.forms.contacts.email}
                  type="email"
                  value={contact.email}
                  onChange={(e) => updateContact(index, 'email', e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
            </div>
          ))}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={addContact} 
            className="w-full gap-2 border-white/30 text-white bg-white/10 hover:bg-white/20"
          >
            <Plus className="h-4 w-4" />
            {t.vault.forms.contacts.addContact}
          </Button>
        </div>

        <div className="pt-4 border-t border-white/20">
          <h4 className="text-sm font-medium mb-3 text-white/90">{t.vault.forms.contacts.importantServices}</h4>
          <div className="space-y-2">
            <div>
              <Label htmlFor="doctor" className="text-white/80">{t.vault.forms.contacts.doctor}</Label>
              <Input
                id="doctor"
                value={data.doctor}
                onChange={(e) => updateField('doctor', e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>
            <div>
              <Label htmlFor="insurance" className="text-white/80">{t.vault.forms.contacts.insurance}</Label>
              <Input
                id="insurance"
                value={data.insurance}
                onChange={(e) => updateField('insurance', e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMedicalForm = () => {
    const data = sectionData.medical as MedicalData;
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="allergies" className="text-white/90">{t.vault.forms.medical.allergies}</Label>
          <Textarea
            id="allergies"
            value={data.allergies}
            onChange={(e) => updateField('allergies', e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            placeholder="e.g., Penicillin, Nuts..."
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="medications" className="text-white/90">{t.vault.forms.medical.medications}</Label>
          <Textarea
            id="medications"
            value={data.medications}
            onChange={(e) => updateField('medications', e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            placeholder="e.g., Metformin 500mg daily..."
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="conditions" className="text-white/90">{t.vault.forms.medical.conditions}</Label>
          <Textarea
            id="conditions"
            value={data.conditions}
            onChange={(e) => updateField('conditions', e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            placeholder="e.g., Diabetes Type 2, Asthma..."
            rows={2}
          />
        </div>
        <div>
          <Label htmlFor="emergencyNotes" className="text-white/90">{t.vault.forms.medical.emergencyNotes}</Label>
          <Textarea
            id="emergencyNotes"
            value={data.emergencyNotes}
            onChange={(e) => updateField('emergencyNotes', e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
            placeholder="Any special instructions for emergencies..."
            rows={2}
          />
        </div>
      </div>
    );
  };

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
        <div className="max-h-[40vh] overflow-y-auto pr-2 -mr-2">
          {renderCurrentForm()}
        </div>

        {/* Security note */}
        <div className="flex items-start gap-2 mt-6 p-3 bg-white/5 rounded-lg border border-white/10">
          <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs text-white/70">
            {t.vault.setup.securityNote}
          </p>
        </div>

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
